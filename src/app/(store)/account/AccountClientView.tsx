'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AccountClientView({
  customer,
  storeName,
  storeSlug,
}: {
  customer: any;
  storeName: string;
  storeSlug: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');
  const [name, setName] = useState(customer.name || 'عميل');
  const [email, setEmail] = useState(customer.email || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const res = await fetch('/api/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', name, email })
    });
    setLoading(false);
    if (res.ok) {
      setMessage('تم تحديث بيانات الحساب بنجاح!');
      router.refresh();
    } else {
      setMessage('حدث خطأ أثناء التحديث.');
    }
  };

  const handleLogout = async () => {
    document.cookie = 'user_phone=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    window.location.href = `/${storeSlug}/customer/login`;
  };

  return (
    <div dir='rtl' className='max-w-4xl mx-auto p-4 sm:p-6 font-sans min-h-screen bg-gray-50/60 space-y-6'>
      
      {/* رأس الصفحة الرئيسي والترحيب */}
      <div className='bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 tracking-tight'>
            مرحباً، {customer.name || 'عميل'} 👋
          </h1>
          <p className='mt-1 text-sm font-semibold text-emerald-700'>حساب {storeName}</p>
          <p className='text-sm text-gray-500 mt-1 flex items-center gap-2'>
            <span>رقم الجوال المسجل:</span>
            <span className='font-semibold text-gray-800 bg-gray-100 px-2.5 py-0.5 rounded-md' dir='ltr'>
              {customer.phone || '0503405514'}
            </span>
          </p>
        </div>
        <div className='flex items-center gap-3 w-full sm:w-auto'>
          <Link href={`/${storeSlug}`} className='flex-1 sm:flex-none text-center bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition shadow-sm shadow-emerald-600/10'>
            الرئيسية / المتجر
          </Link>
          <button 
            onClick={handleLogout} 
            className='bg-red-50 text-red-600 border border-red-100 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-100 transition'
          >
            تسجيل الخروج
          </button>
        </div>
      </div>

      {/* أزرار الفصل والتنقل بين التبويبات (Tabs) */}
      <div className='flex border border-gray-200/80 bg-white rounded-2xl p-1.5 shadow-sm'>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-3 text-center text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
            activeTab === 'profile'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          👤 تفاصيل حسابي الشخصي
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-3 text-center text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          📦 سجل الطلبات ({customer.orders?.length || 0})
        </button>
      </div>

      {/* 1. قسم تفاصيل الحساب الشخصي */}
      {activeTab === 'profile' && (
        <div className='bg-white rounded-2xl shadow-sm p-6 border border-gray-100 space-y-6'>
          <div className='border-b pb-3 flex justify-between items-center'>
            <h2 className='text-lg font-bold text-gray-900 flex items-center gap-2'>
              <span>👤</span> تفاصيل الحساب الشخصي
            </h2>
            <span className='text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-semibold'>
              حساب موثق ✅
            </span>
          </div>

          {message && (
            <div className='p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold border border-emerald-100 flex items-center gap-2'>
              <span>✅</span> {message}
            </div>
          )}

          <form onSubmit={handleUpdate} className='space-y-4 max-w-xl'>
            <div>
              <label className='block text-xs font-bold text-gray-500 mb-1.5'>رقم الجوال (ثابت لا يمكن تعديله)</label>
              <input
                type='text'
                disabled
                value={customer.phone || '0503405514'}
                className='w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 cursor-not-allowed font-semibold'
                dir='ltr'
              />
            </div>

            <div>
              <label className='block text-xs font-bold text-gray-700 mb-1.5'>الاسم الكامل</label>
              <input
                type='text'
                value={name}
                onChange={(e) => setName(e.target.value)}
                className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition font-medium'
                required
              />
            </div>

            <div>
              <label className='block text-xs font-bold text-gray-700 mb-1.5'>البريد الإلكتروني (اختياري)</label>
              <input
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition'
                placeholder='example@domain.com'
                dir='ltr'
              />
            </div>

            <div className='pt-2 flex items-center justify-between'>
              <button
                type='submit'
                disabled={loading}
                className='bg-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition shadow-sm shadow-emerald-600/20 disabled:opacity-50'
              >
                {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. قسم سجل الطلبات (عصري، مفصل، ومرتب) */}
      {activeTab === 'orders' && (
        <div className='bg-white rounded-2xl shadow-sm p-6 border border-gray-100 space-y-6'>
          <h2 className='text-lg font-bold text-gray-900 border-b pb-3 flex items-center gap-2'>
            <span>📦</span> سجل طلباتي السابقة
          </h2>

          {(!customer.orders || customer.orders.length === 0) ? (
            <div className='text-center py-16 text-gray-400 space-y-3'>
              <div className='text-4xl'>🛍️</div>
              <p className='text-base font-medium text-gray-600'>ليس لديك أي طلبات سابقة مسجلة برقم جوالك حتى الآن.</p>
              <Link href={`/${storeSlug}/products`} className='inline-block text-emerald-600 font-bold hover:underline text-sm bg-emerald-50 px-4 py-2 rounded-xl transition'>
                تصفح المنتجات واطلب الآن
              </Link>
            </div>
          ) : (
            <div className='space-y-6'>
              {customer.orders.map((order: any) => (
                <div key={order.id} className='border border-gray-200/80 rounded-2xl p-5 sm:p-6 hover:border-emerald-300 hover:shadow-lg transition-all bg-white space-y-5'>
                  
                  {/* رأس الكارت */}
                  <div className='flex flex-wrap justify-between items-center gap-3 border-b border-gray-100 pb-4'>
                    <div className='flex items-center gap-3'>
                      <span className='font-bold text-emerald-700 text-base bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-100'>
                        {order.code}
                      </span>
                      <span className='text-xs text-gray-400 font-medium'>
                        {new Date(order.created_at).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                    <div className='flex items-center gap-3'>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        order.status === 'new' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {order.status === 'new' ? 'جديد / قيد المعالجة' : order.status}
                      </span>
                      <span className='font-extrabold text-gray-900 text-base'>
                        {Number(order.total_amount)} ر.س
                      </span>
                    </div>
                  </div>

                  {/* تفاصيل التوصيل والدفع */}
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-700 bg-gray-50/80 p-4 rounded-xl border border-gray-100/80'>
                    <p className='flex items-center gap-2'>
                      <span className='text-gray-400 font-medium'>طريقة الدفع:</span> 
                      <span className='font-bold text-gray-900 bg-white px-2.5 py-1 rounded-lg border shadow-2xs'>
                        {order.payment_method === 'transfer' ? 'تحويل بنكي 💳' : 'الدفع عند الاستلام 💵'}
                      </span>
                    </p>
                    <p className='flex items-center gap-2'>
                      <span className='text-gray-400 font-medium'>عنوان التوصيل:</span> 
                      <span className='font-semibold text-gray-900'>{order.delivery_address || 'الرياض'}</span>
                    </p>
                  </div>

                  {/* صندوق موعد الاستلام والفترة المحددة */}
                  {order.notes && (
                    <div className='bg-amber-50/70 border border-amber-200/60 rounded-xl p-4 space-y-2 text-xs'>
                      <div className='flex items-center gap-2 font-bold text-amber-900'>
                        <span>⏰</span>
                        <span>معد موعد الاستلام والتوصيل:</span>
                      </div>
                      <p className='text-amber-950 font-semibold leading-relaxed bg-white/80 p-2.5 rounded-lg border border-amber-100'>
                        {order.notes}
                      </p>
                    </div>
                  )}

                  {/* إيصال التحويل ورابط الموقع (إذا وجدا) */}
                  <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-gray-100'>
                    
                    {/* رابط خريطة الموقع */}
                    <a 
                      href='https://maps.google.com/?q=24.613015929095358,46.63255160733496' 
                      target='_blank' 
                      rel='noopener noreferrer'
                      className='flex items-center justify-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-100 transition shadow-2xs'
                    >
                      <span>📍</span> عرض موقع التوصيل على الخريطة
                    </a>

                    {/* زر عرض إيصال التحويل */}
                    {order.payment_method === 'transfer' && (
                      <a 
                        href='/uploads/1793469682914-Ahl_Al-Karam_Background_Identity_page-0009.jpg' 
                        target='_blank' 
                        rel='noopener noreferrer'
                        className='flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-100 transition shadow-2xs'
                      >
                        <span>👁️</span> عرض إيصال التحويل المرفق
                      </a>
                    )}
                  </div>

                  {/* المنتجات المطلوبة */}
                  <div className='pt-2'>
                    <p className='text-xs font-bold text-gray-500 mb-2.5'>المنتجات المطلوبة في هذا الطلب:</p>
                    <div className='flex flex-wrap gap-2.5'>
                      {order.order_items?.map((item: any) => (
                        <div key={item.id} className='flex items-center gap-2.5 bg-gray-50 border border-gray-200/60 px-3 py-2 rounded-xl text-xs shadow-2xs'>
                          {item.products?.image && (
                            <img src={item.products.image} alt='' className='w-7 h-7 rounded-lg object-cover' />
                          )}
                          <span className='font-bold text-gray-800'>{item.products?.name || item.name}</span>
                          <span className='text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded-md'>(×{item.quantity})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* شريط الأمان السفلي */}
      <div className='pt-4 border-t border-gray-200/60 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-3'>
        <div className='flex items-center gap-4'>
          <button onClick={handleLogout} className='hover:text-red-600 underline transition font-medium'>
            تسجيل الخروج من الحساب
          </button>
        </div>
        <div>
          <Link href='/admin/login' className='text-gray-400 hover:text-emerald-700 transition flex items-center gap-1 font-medium'>
            🔒 دخول الموظفين / الإدارة
          </Link>
        </div>
      </div>

    </div>
  );
}