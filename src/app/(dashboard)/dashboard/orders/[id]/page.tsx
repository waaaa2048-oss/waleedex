import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { orders, stores } from '@/db/schema';
import PrintActions from './PrintActions';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) notFound();

  const order = await prisma.orders.findUnique({
    where: { id: orderId },
    include: {
      customers: true,
      order_items: {
        include: { products: true }
      }
    }
  });

  if (!order) notFound();

  const [store] = await db
    .select({ storeType: stores.storeType, name: stores.name, logoUrl: stores.logoUrl })
    .from(orders)
    .innerJoin(stores, eq(orders.storeId, stores.id))
    .where(eq(orders.id, orderId))
    .limit(1);
  const isSlaughterhouseOrder = store?.storeType === 'SLAUGHTERHOUSE';
  const visibleNotes = (order.notes || '')
    .split('|')
    .filter((note) => isSlaughterhouseOrder || !note.trim().startsWith('نوع التقطيع:'))
    .map((note) => note.trim())
    .filter(Boolean)
    .join(' | ');

  let receiptUrl = null;
  if (order.notes && order.notes.includes('/uploads/')) {
    const parts = order.notes.split('(/uploads/');
    if (parts.length > 1) {
      const fileName = parts[1].split(')')[0];
      receiptUrl = '/uploads/' + fileName;
    }
  }

  return (
    <div dir='rtl' className='p-6 max-w-6xl mx-auto font-sans space-y-6 bg-gray-50/50 min-h-screen'>
      <style dangerouslySetInnerHTML={{ __html: '@media print { body { background: white !important; } .no-print { display: none !important; } .print-full { width: 100% !important; margin: 0 !important; padding: 0 !important; } }' }} />

      {/* رأس الصفحة وأزرار التحكم */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 gap-4 no-print'>
        <div>
          <div className='flex items-center gap-3'>
            <h1 className='text-2xl font-extrabold text-gray-900'>تفاصيل الطلب: <span className='text-emerald-600 font-mono'>{order.code}</span></h1>
            <span className='px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase'>
              {order.status}
            </span>
          </div>
          <p className='text-xs text-gray-400 mt-1'>تاريخ الإنشاء: {new Date(order.created_at).toLocaleString('ar-SA')}</p>
        </div>

        <div className='flex flex-wrap items-center gap-3'>
          <PrintActions />

          <Link href='/dashboard/orders' className='bg-gray-100 text-gray-700 px-5 py-2.5 rounded-2xl text-xs font-bold hover:bg-gray-200 transition'>
            العودة للطلبات
          </Link>
        </div>
      </div>

      <header className="flex items-center gap-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm print-full">
        {store?.logoUrl ? (
          <img
            src={store.logoUrl}
            alt={`شعار ${store.name}`}
            className="h-16 w-16 rounded-2xl border border-gray-100 object-contain p-1"
          />
        ) : null}
        <div>
          <p className="text-xl font-extrabold text-gray-900">{store?.name ?? "المتجر"}</p>
          <p className="mt-1 text-sm font-bold text-gray-500">فاتورة الطلب {order.code}</p>
        </div>
      </header>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 print-full'>
        {/* بيانات العميل والتوصيل */}
        <div className='bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4'>
          <h2 className='font-extrabold text-gray-900 border-b pb-3 text-sm flex items-center gap-2'>
            <span>👤</span> بيانات العميل والتوصيل
          </h2>
          <div className='space-y-2.5 text-sm'>
            <p className='flex justify-between'><strong className='text-gray-400'>اسم العميل:</strong> <span className='font-bold text-gray-800'>{order.customers?.name || 'عميل مسجل'}</span></p>
            <p className='flex justify-between'><strong className='text-gray-400'>رقم الجوال:</strong> <span dir='ltr' className='font-mono font-bold text-gray-800'>{order.customers?.phone}</span></p>
            <p className='flex justify-between'><strong className='text-gray-400'>نوع الاستلام:</strong> <span className='font-semibold text-emerald-700'>{order.fulfillment === 'delivery' ? '🚗 توصيل لعنوان العميل' : '🏪 استلام من الفرع'}</span></p>
            <p className='flex justify-between'><strong className='text-gray-400'>طريقة الدفع:</strong> <span className='font-semibold text-gray-700'>{order.payment_method === 'transfer' ? '💳 تحويل بنكي' : '💳 دفع إلكتروني'}</span></p>
          </div>
          <div className='pt-3 border-t'>
            <strong className='text-xs font-bold text-gray-400 block mb-1.5'>عنوان التوصيل والموقع:</strong>
            <div className='text-xs text-gray-800 bg-gray-50 p-3.5 rounded-2xl border border-gray-100 leading-relaxed font-medium'>
              {order.delivery_address || 'الرياض'}
            </div>
          </div>
        </div>

        {/* الملاحظات وإيصال التحويل */}
        <div className='bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4 md:col-span-2'>
          <h2 className='font-extrabold text-gray-900 border-b pb-3 text-sm flex items-center gap-2'>
            <span>📝</span> تفاصيل الاستلام وموعد التجهيز والإيصال
          </h2>
          
          {visibleNotes && (
            <div className='bg-emerald-50/60 border border-emerald-100 text-emerald-900 p-4 rounded-2xl text-xs leading-relaxed font-medium'>
              <strong className='mb-2 block font-bold text-emerald-950'>تفاصيل الموعد والملاحظات:</strong>
              <p className='whitespace-pre-line'>{visibleNotes.replace(/\s*\|\s*/g, '\n')}</p>
            </div>
          )}

          {receiptUrl ? (
            <div className='pt-2'>
              <p className='text-xs font-bold text-gray-700 mb-2'>إيصال التحويل البنكي المرفق:</p>
              <a href={receiptUrl} target='_blank' rel='noreferrer' className='inline-block group relative'>
                <img src={receiptUrl} alt='إيصال التحويل' className='w-40 h-40 object-cover rounded-2xl border-2 border-emerald-500 shadow-md group-hover:opacity-90 transition' />
                <span className='absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-lg backdrop-blur-sm no-print'>تكبير الصورة 🔍</span>
              </a>
            </div>
          ) : (
            <p className='text-xs text-gray-400 italic pt-2'>لم يتم إرفاق إيصال بنكي لهذا الطلب.</p>
          )}
        </div>
      </div>

      {/* قائمة المنتجات المطلوبة */}
      <div className='bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4 print-full'>
        <h2 className='font-extrabold text-gray-900 border-b pb-3 text-sm flex items-center justify-between'>
          <span>🛒 المنتجات المطلوبة</span>
          <span className='text-xs font-bold text-gray-400'>إجمالي العناصر: {order.order_items.length}</span>
        </h2>
        
        <div className='divide-y divide-gray-100'>
          {order.order_items.map((item: any) => {
            const imgSrc = item.products?.image || item.image;
            const itemPrice = Number(item.unit_price) || 0;
            const itemTotal = Number(item.line_total) || (itemPrice * item.quantity);
            return (
              <div key={item.id} className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {imgSrc ? (
                    <img src={imgSrc} alt="" className="w-16 h-16 object-cover rounded-2xl border border-gray-100" />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 text-2xl"
                    >
                      🛍️
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{item.products?.name || 'منتج'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">الكمية: {item.quantity}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 text-sm">{itemTotal} ر.س</p>
                  <p className="text-[11px] text-gray-400">{itemPrice} ر.س للوحدة</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}