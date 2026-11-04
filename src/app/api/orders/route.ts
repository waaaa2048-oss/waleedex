import { NextResponse } from "next/server";
import { permissionGuard, serverError } from "@/lib/api";
import { getOrders } from "@/lib/data";
import { createOrder, parseOrderPayload } from "@/lib/orders";
import { logActivity } from "@/lib/log";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

// إعداد خدمة إرسال الإيميل عبر Nodemailer باستخدام بيانات الـ .env
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function GET(request: Request) {
  const denied = await permissionGuard("orders.read");
  if (denied) return denied;
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search")?.trim().toLowerCase();
    const rawStoreId = url.searchParams.get("storeId");
    const storeId = rawStoreId === null ? undefined : Number(rawStoreId);
    if (rawStoreId !== null && (!Number.isInteger(storeId) || Number(storeId) <= 0)) {
      return NextResponse.json({ error: "معرّف المتجر غير صالح" }, { status: 400 });
    }
    let orders = await getOrders(storeId);

    if (status && status !== "all") orders = orders.filter((order) => order.status === status);
    if (search) {
      orders = orders.filter(
        (order) =>
          order.code.toLowerCase().includes(search) ||
          order.customerName.toLowerCase().includes(search) ||
          order.customerPhone.includes(search),
      );
    }

    return NextResponse.json({ orders });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  const denied = await permissionGuard("orders.create");
  if (denied) return denied;
  
  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = parseOrderPayload(rawBody);
    if (parsed.ok === false) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    // 1. إنشاء الطلب وحفظه في قاعدة البيانات
    const order = await createOrder(parsed.value);
    await logActivity("إنشاء طلب", "الطلبات", order.id, `${order.code} — ${order.customerName} — ${order.totalAmount}`);

    // استخراج بيانات العميل للرسائل
    const customerEmail = rawBody.email || (order as any).email;
    const customerPhone = order.customerPhone;
    const customerName = order.customerName;

    // 2. إرسال الفاتورة عبر الإيميل (إذا توفر بريد إلكتروني)
    if (customerEmail) {
      try {
        await transporter.sendMail({
          from: '"أهل الكرم للذبايح" <waaaa2048@gmail.com>',
          to: customerEmail,
          subject: `فاتورة طلبك رقم #${order.code} - أهل الكرم للذبايح`,
          html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
              <h2 style="color: #047857; text-align: center; margin-bottom: 5px;">أهل الكرم للذبايح 🐑</h2>
              <p style="text-align: center; color: #6b7280; font-size: 14px;">شكراً لثقتك بنا، تم استلام طلبك بنجاح!</p>
              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 5px 0;"><strong>رقم الطلب:</strong> <span style="color: #047857; font-weight: bold;">${order.code}</span></p>
                <p style="margin: 5px 0;"><strong>اسم العميل:</strong> ${customerName}</p>
                <p style="margin: 5px 0;"><strong>إجمالي المبلغ:</strong> <span style="font-size: 16px; font-weight: bold; color: #111827;">${order.totalAmount} ر.س</span></p>
                <p style="margin: 5px 0;"><strong>طريقة الدفع:</strong> ${order.paymentMethod === 'transfer' ? 'تحويل بنكي 💳' : 'الدفع عند الاستلام 💵'}</p>
                <p style="margin: 5px 0;"><strong>ملاحظات / موعد الاستلام:</strong> ${order.notes || 'حسب الاتفاق'}</p>
              </div>

              <p style="text-align: center; color: #4b5563; font-size: 13px;">نعمل على تجهيز طلبك بعناية فائقة. سنتواصل معك قريباً لتأكيد التوصيل.</p>
              <div style="text-align: center; margin-top: 25px; color: #9ca3af; font-size: 12px;">
                جميع الحقوق محفوظة © متجر أهل الكرم للذبايح 2026
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Failed to send order email:", emailErr);
      }
    }

    // 3. تجهيز رابط الواتساب لتوجيه العميل أو إرجاعه للواجهة
    const whatsappMessage = encodeURIComponent(
      `مرحباً بك يا ${customerName} 👋\n\n` +
      `شكراً لتسوقك في *أهل الكرم للذبايح* 🐑\n\n` +
      `📦 *تفاصيل طلبك المؤكد:* \n` +
      `- رقم الطلب: ${order.code}\n` +
      `- الإجمالي: ${order.totalAmount} ر.س\n` +
      `- طريقة الدفع: ${order.paymentMethod === 'transfer' ? 'تحويل بنكي' : 'الدفع عند الاستلام'}\n` +
      `- موعد الاستلام: ${order.notes || 'حسب الاتفاق'}\n\n` +
      `نسعد خدمتكم دائماً وسنتواصل معكم قريباً!`
    );

    const cleanPhone = customerPhone.startsWith('0') ? customerPhone.slice(1) : customerPhone;
    const whatsappUrl = `https://wa.me/966${cleanPhone}?text=${whatsappMessage}`;

    return NextResponse.json({ order, whatsappUrl }, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.message.includes("غير موجود")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return serverError(error, "تعذر إنشاء الطلب");
  }
}