import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'البريد الإلكتروني مطلوب' }, { status: 400 });
    }

    // إنشاء رمز مكون من 6 أرقام عشوائية
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    // تحديد وقت انتهاء الرمز (بعد 10 دقائق من الآن)
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // حفظ أو تحديث بيانات الرمز للمستخدم في قاعدة البيانات (تصحيح prisma.users)
    await prisma.users.upsert({
      where: { email },
      update: { otpCode, otpExpiresAt },
      create: { 
        email, 
        name: email.split('@')[0], // قيمة افتراضية للاسم عند الإنشاء الجديد
        password_hash: '',         // قيمة افتراضية لتفادي أخطاء الحقول الإجبارية
        otpCode, 
        otpExpiresAt 
      },
    });

    // إرسال البريد الإلكتروني الحاوي على الرمز
    await resend.emails.send({
      from: 'أهل الكرم <onboarding@resend.dev>',
      to: email,
      subject: 'رمز التحقق لمتجر أهل الكرم',
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; background-color: #f9f9f9;">
          <h2 style="color: #2b5a41;">متجر أهل الكرم للذبايح</h2>
          <p>أهلاً بك! رمز التحقق الخاص بك لتسجيل الدخول هو:</p>
          <h1 style="color: #d97706; letter-spacing: 4px;">${otpCode}</h1>
          <p style="color: #666; font-size: 0.9em;">هذا الرمز صالح لمدة 10 دقائق فقط. لا تشاركه مع أي أحد.</p>
        </div>
      `,
    });

    return NextResponse.json({ message: 'تم إرسال رمز التحقق بنجاح' });
  } catch (error) {
    console.error('OTP Send Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إرسال الرمز' }, { status: 500 });
  }
}