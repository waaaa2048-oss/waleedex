'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/components/store/cart-provider';
import { useToast } from '@/components/toast';
import { CHECKOUT_DELIVERY_OPTIONS, getCheckoutDeliveryFee, type CheckoutDeliveryOption } from '@/lib/checkout-shipping';

type PaymentOption = { value: string; label: string };
type TabbyCardConfig = { publicKey: string; merchantCode: string };

export function CheckoutFlow({
  paymentOptions,
  bankInfo,
  customer,
  storeId,
  storeSlug,
  storeType,
}: {
  paymentOptions: PaymentOption[];
  tabbyConfig: TabbyCardConfig | null;
  bankInfo: { name: string; accountName: string; iban: string; whatsapp: string };
  paymentSetupMessage: string | null;
  moyasarConfig: { publishableKey: string; appUrl: string } | null;
  customer: { name: string; phone: string; email: string | null };
  storeId: number;
  storeSlug: string;
  storeType: string;
}) {
  const { lines: cartLines, isReady: cartReady, clear } = useCart();
  const lines = cartLines.filter((line) => line.storeId === storeId && line.storeSlug === storeSlug);
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const { toast } = useToast();
  
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>('delivery');
  const [locationType, setLocationType] = useState<'gps' | 'manual'>('gps');
  
  const [city, setCity] = useState('الرياض');
  const [district, setDistrict] = useState('');
  const [street, setStreet] = useState('');
  const [locationDetails, setLocationDetails] = useState('');
  const [mapLink, setMapLink] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  const [deliveryDate, setDeliveryDate] = useState('');
  const [timeSlotType, setTimeSlotType] = useState<'period' | 'custom'>('period');
  const [period, setPeriod] = useState('مساءً (٤:٠٠ م - ٨:٠٠ م)');
  const [customTime, setCustomTime] = useState('06:00 PM');
  
  const [deliveryOption, setDeliveryOption] = useState<CheckoutDeliveryOption | null>(null);
  const [cuttingType, setCuttingType] = useState('بدون رأس');
  const [preparationNotes, setPreparationNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(paymentOptions[0]?.value ?? '');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  // إدارة إيصال التحويل البنكي محلياً بصيغة Base64
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState(''); // المتغير الموحد لقيمة الـ Base64
  const [ibanCopied, setIbanCopied] = useState(false);
  
  const [orderComplete, setOrderComplete] = useState<{ code: string; totalAmount: number } | null>(null);

  const isSlaughterhouseStore = storeType === 'SLAUGHTERHOUSE';
  const isFrozenStore = storeType === 'FROZEN';
  const [coldShippingAccepted, setColdShippingAccepted] = useState(false);

  const deliveryFee = fulfillment === 'delivery' && deliveryOption ? getCheckoutDeliveryFee(deliveryOption) : 0;
  const total = subtotal + deliveryFee;

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('المتصفح لا يدعم تحديد الموقع الجغرافي');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const link = `https://maps.google.com/?q=${lat},${lng}`;
        setMapLink(link);
        setLocationDetails('الإحداثيات المباشرة عبر GPS');
        setLocationLoading(false);
        toast?.('تم تحديد موقعك بدقة بنجاح!', 'success');
      },
      (error) => {
        setLocationLoading(false);
        alert('تعذر تحديد الموقع. يرجى تفعيل الصلاحية أو إدخال العنوان يدوياً.');
      }
    );
  };

  const handleCopyIban = () => {
    navigator.clipboard.writeText(bankInfo.iban);
    setIbanCopied(true);
    setTimeout(() => setIbanCopied(false), 3000);
    toast?.('تم نسخ رقم الإيبان بنجاح', 'success');
  };

  const handleUploadReceipt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setReceiptUploading(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPaymentReceipt(base64String);
      setReceiptUploaded(true);
      setReceiptUploading(false);
      toast?.('تم رفع الإيصال بنجاح', 'success');
    };
    reader.onerror = () => {
      setReceiptUploading(false);
      alert('فشل قراءة الملف، حاول مرة أخرى');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) {
      alert('سلة المشتريات فارغة');
      return;
    }
    if (isSlaughterhouseStore && !deliveryDate) {
      alert('يرجى اختيار تاريخ ووقت الاستلام للذبائح');
      return;
    }
    if (isFrozenStore && fulfillment === 'delivery' && !coldShippingAccepted) {
      alert('يرجى الموافقة على شروط الشحن المبرد للمنتجات المجمدة');
      return;
    }
    if (!paymentOptions.some((option) => option.value === paymentMethod)) {
      alert('لا توجد طريقة دفع متاحة حالياً لهذا المتجر. يرجى التواصل مع المتجر.');
      return;
    }
    if (paymentMethod === 'transfer' && !paymentReceipt) {
      alert('يرجى رفع إيصال التحويل البنكي لإتمام الطلب');
      return;
    }

    setCheckoutLoading(true);
    try {
      const payloadItems = lines.map(line => ({
        productId: line.productId || line.id,
        storeId: line.storeId,
        name: line.name,
        price: line.price,
        quantity: line.quantity,
        selectedOptions: line.selectedOptions ?? [],
        image: line.image || line.product?.image || ''
      }));

      const finalTimeSlot = timeSlotType === 'period' ? period : `ساعة محددة: ${customTime}`;
      const finalNotes = [
        paymentReceipt ? 'تم إرفاق إيصال التحويل بنجاح' : '',
        mapLink ? `رابط الموقع: ${mapLink}` : '',
        preparationNotes ? `ملاحظات الطبخ: ${preparationNotes}` : '',
        isSlaughterhouseStore ? `نوع التقطيع: ${cuttingType || 'قياسي'}` : '',
        isFrozenStore && fulfillment === 'delivery' ? 'الشحن عبر شركة توصيل مبردة معتمدة؛ يجب الحفاظ على سلسلة التبريد' : '',
      ].filter(Boolean).join(' | ');

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: payloadItems,
          paymentMethod,
          fulfillment,
          city,
          district,
          street,
          locationDetails: (locationDetails || 'تحديد مباشر عبر الخريطة') + (mapLink ? ` (${mapLink})` : ''),
          deliveryDate,
          timeSlot: finalTimeSlot,
          notes: finalNotes,
          storeId,
          storeSlug,
          cuttingType: cuttingType || 'قياسي',
          coldShippingAccepted,
          paymentReceipt, // إرسال المتطابق تماماً مع الـ API
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setOrderComplete(data.order);
        clear();
      } else {
        alert(data.error || 'حدث خطأ أثناء إتمام الطلب');
      }
    } catch (err) {
      alert('حدث خطأ في الاتصال بالسيرفر');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (orderComplete) {
    return (
      <div dir='rtl' className='max-w-2xl mx-auto p-8 bg-white rounded-3xl shadow-sm text-center space-y-6 my-12 border border-emerald-100'>
        <div className='w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner'>✓</div>
        <h1 className='text-3xl font-extrabold text-gray-800'>تم استلام طلبك بنجاح!</h1>
        <p className='text-gray-600 text-base'>رقم الطلب الرسمي: <strong className='text-emerald-700 text-xl font-mono'>{orderComplete.code}</strong></p>
        <p className='text-sm text-gray-500 leading-relaxed'>جاري تجهيز طلبك ومراجعته من قِبل الإدارة والمطبخ. يمكنك متابعة حالة الطلب وتفاصيله بالكامل من صفحة حسابك الشخصي.</p>
        <div className='flex justify-center gap-4 pt-4'>
          <Link href='/account' className='bg-emerald-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-emerald-700 transition shadow-sm'>
            متابعة طلباتي في الحساب
          </Link>
          <Link href={`/${storeSlug}`} className='bg-gray-100 text-gray-700 px-6 py-3 rounded-2xl font-semibold hover:bg-gray-200 transition'>
            العودة للمتجر
          </Link>
        </div>
      </div>
    );
  }

  if (!cartReady) {
    return <p className="mx-auto max-w-2xl rounded-2xl bg-white p-6 text-center text-sm font-bold text-gray-600">جارٍ تحميل سلة هذا المتجر…</p>;
  }

  if (lines.length === 0) {
    return (
      <div dir="rtl" className="mx-auto my-12 max-w-2xl space-y-4 rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-extrabold text-gray-900">سلة هذا المتجر فارغة</h1>
        <p className="text-sm text-gray-500">لا توجد منتجات من {storeSlug} في سلة الإتمام الحالية.</p>
        <Link href={`/${storeSlug}/products`} className="inline-flex rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-700">
          تصفح منتجات المتجر
        </Link>
      </div>
    );
  }

  return (
    <div dir='rtl' className='max-w-4xl mx-auto p-4 sm:p-6 font-sans space-y-6'>
      <div className='bg-white p-6 rounded-3xl shadow-sm border border-gray-100'>
        <h1 className='text-2xl font-extrabold text-gray-900'>إتمام الطلب والدفع</h1>
        <p className='text-xs text-gray-400 mt-1'>يرجى استكمال البيانات أدناه لتأكيد وتجهيز طلبك بكل دقة</p>
      </div>

      <form onSubmit={handleSubmitOrder} className='space-y-6'>
        {/* منتجات السلة */}
        <div className='bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4'>
          <h2 className='text-lg font-bold text-gray-800 border-b pb-3 flex items-center justify-between'>
            <span>منتجات السلة</span>
            <span className='bg-emerald-50 text-emerald-800 text-xs px-3 py-1 rounded-full font-semibold'>{lines.length} منتج</span>
          </h2>
          <div className='space-y-3'>
            {lines.map((item, idx) => (
              <div key={idx} className='flex items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-0'>
                <div className='flex items-center gap-3'>
                  {(item.image || item.product?.image) && (
                    <img src={item.image || item.product?.image} alt='' className='w-14 h-14 object-cover rounded-2xl border border-gray-100 shadow-sm' />
                  )}
                  <div>
                    <p className='font-bold text-gray-800 text-sm'>{item.name}</p>
                    <p className='text-xs text-gray-400 mt-0.5'>الكمية: ×{item.quantity} | السعر الفردي: {item.price} ر.س</p>
                    {item.selectedOptions?.length ? (
                      <p className='text-[11px] text-gray-500 mt-1'>
                        {item.selectedOptions.map((option) => `${option.modifierName}: ${option.label}`).join(' · ')}
                      </p>
                    ) : null}
                  </div>
                </div>
                <span className='font-extrabold text-emerald-700 text-sm'>{(item.price * item.quantity)} ر.س</span>
              </div>
            ))}
          </div>
        </div>

        {/* نوع الاستلام والعنوان */}
        <div className='bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-5'>
          <h2 className='text-lg font-bold text-gray-800 border-b pb-3'>عنوان الاستلام والتوصيل</h2>
          <div className='grid grid-cols-2 gap-4'>
            <label className={`border p-4 rounded-2xl cursor-pointer text-center text-sm font-bold transition flex items-center justify-center gap-2 ${fulfillment === 'delivery' ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              <input type='radio' name='fulfillment' checked={fulfillment === 'delivery'} onChange={() => setFulfillment('delivery')} className='hidden' />
              <span>🚗 توصيل لعنوانك</span>
            </label>
            <label className={`border p-4 rounded-2xl cursor-pointer text-center text-sm font-bold transition flex items-center justify-center gap-2 ${fulfillment === 'pickup' ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              <input type='radio' name='fulfillment' checked={fulfillment === 'pickup'} onChange={() => setFulfillment('pickup')} className='hidden' />
              <span>🏪 استلام من الفرع</span>
            </label>
          </div>

          {isFrozenStore && fulfillment === 'delivery' && (
            <div className='rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950'>
              <p className='font-bold text-sm'>شروط توصيل المنتجات المجمدة</p>
              <p className='mt-1 text-xs leading-6'>يُجهّز الطلب للنقل عبر شركة شحن مبردة، ويلزم استلامه فور وصوله للمحافظة على سلامة المنتجات وسلسلة التبريد.</p>
              <label className='mt-3 flex items-start gap-2 text-xs font-semibold'>
                <input type='checkbox' checked={coldShippingAccepted} onChange={(event) => setColdShippingAccepted(event.target.checked)} className='mt-0.5 h-4 w-4 accent-sky-700' />
                أوافق على شروط الشحن المبرد واستلام الطلب عند وصوله.
              </label>
            </div>
          )}

          {fulfillment === 'delivery' && (
            <div className='space-y-4 pt-2'>
              <div className='flex gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100'>
                <button type='button' onClick={() => setLocationType('gps')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${locationType === 'gps' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200/50'}`}>
                  📍 تحديد الموقع التلقائي (GPS)
                </button>
                <button type='button' onClick={() => setLocationType('manual')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${locationType === 'manual' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200/50'}`}>
                  ✍️ إدخال بيانات العنوان يدوياً
                </button>
              </div>

              {locationType === 'gps' ? (
                <div className='bg-emerald-50/60 border border-emerald-100 p-5 rounded-2xl text-center space-y-3'>
                  <p className='text-xs font-bold text-gray-700'>تحديد الموقع الحالي بدقة عالية</p>
                  <p className='text-xs text-gray-500'>اضغط على الزر أدناه ليقوم المتصفح بتحديد موقعك الجغرافي وربطه بالطلب فوراً</p>
                  <button type='button' onClick={handleGetLocation} disabled={locationLoading} className='bg-emerald-600 text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-sm'>
                    {locationLoading ? 'جاري تحديد الإحداثيات...' : 'تحديد موقعي الآن 📍'}
                  </button>
                  {mapLink && (
                    <div className='pt-2'>
                      <p className='text-xs text-emerald-700 font-bold'>✓ تم ربط إحداثيات الخريطة بنجاح</p>
                      <a href={mapLink} target='_blank' rel='noreferrer' className='text-xs text-blue-600 underline mt-1 inline-block'>معاينة الموقع على خرائط قوقل ↗</a>
                    </div>
                  )}
                </div>
              ) : (
                <div className='space-y-4 pt-1'>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-xs font-semibold text-gray-600 mb-1'>المدينة *</label>
                      <input type='text' value={city} onChange={(e) => setCity(e.target.value)} className='w-full border rounded-2xl px-4 py-3 text-sm focus:border-emerald-500' required />
                    </div>
                    <div>
                      <label className='block text-xs font-semibold text-gray-600 mb-1'>الحي *</label>
                      <input type='text' value={district} onChange={(e) => setDistrict(e.target.value)} placeholder='مثال: النرجس، الياسمين...' className='w-full border rounded-2xl px-4 py-3 text-sm focus:border-emerald-500' required />
                    </div>
                  </div>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-xs font-semibold text-gray-600 mb-1'>اسم الشارع *</label>
                      <input type='text' value={street} onChange={(e) => setStreet(e.target.value)} placeholder='اسم الشارع أو رقم المبنى' className='w-full border rounded-2xl px-4 py-3 text-sm focus:border-emerald-500' required />
                    </div>
                    <div>
                      <label className='block text-xs font-semibold text-gray-600 mb-1'>رابط قوقل ماب (اختياري)</label>
                      <input type='text' value={mapLink} onChange={(e) => setMapLink(e.target.value)} placeholder='https://maps.google.com/?q=...' className='w-full border rounded-2xl px-4 py-3 text-sm focus:border-emerald-500' />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {isSlaughterhouseStore && (
          <div className='bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4'>
            <h2 className='text-lg font-bold text-gray-800 border-b pb-3'>موعد وتاريخ الاستلام والتجهيز</h2>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div>
                <label className='block text-xs font-semibold text-gray-600 mb-1'>تاريخ الاستلام المطلوبة *</label>
                <input type='date' value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className='w-full border rounded-2xl px-4 py-3 text-sm focus:border-emerald-500 bg-gray-50/50' required />
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-600 mb-1'>وقت أو فترة الاستلام *</label>
                <div className='flex gap-2 mb-2'>
                  <button type='button' onClick={() => setTimeSlotType('period')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${timeSlotType === 'period' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    فترة زمنية
                  </button>
                  <button type='button' onClick={() => setTimeSlotType('custom')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${timeSlotType === 'custom' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    ساعة محددة
                  </button>
                </div>
                {timeSlotType === 'period' ? (
                  <select value={period} onChange={(e) => setPeriod(e.target.value)} className='w-full border rounded-2xl px-4 py-3 text-sm bg-white'>
                    <option value='صباحاً (٩:٠٠ ص - ١٢:٠٠ م)'>صباحاً (٩:٠٠ ص - ١٢:٠٠ م)</option>
                    <option value='ظهراً (١٢:٠٠ م - ٤:٠٠ م)'>ظهراً (١٢:٠٠ م - ٤:٠٠ م)</option>
                    <option value='مساءً (٤:٠٠ م - ٨:٠٠ م)'>مساءً (٤:٠٠ م - ٨:٠٠ م)</option>
                    <option value='ليلاً (٨:٠٠ م - ١١:٠٠ م)'>ليلاً (٨:٠٠ م - ١١:٠٠ م)</option>
                  </select>
                ) : (
                  <input type='text' value={customTime} onChange={(e) => setCustomTime(e.target.value)} placeholder='مثال: 07:30 مساءً' className='w-full border rounded-2xl px-4 py-3 text-sm' />
                )}
              </div>
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1'>نوع التقطيع *</label>
              <select value={cuttingType} onChange={(e) => setCuttingType(e.target.value)} className='w-full border rounded-2xl px-4 py-3 text-sm bg-white'>
                <option value='بدون رأس'>بدون رأس</option>
                <option value='صحن'>صحن</option>
                <option value='صحنين'>صحنين</option>
                <option value='تقطيع خاص'>تقطيع خاص</option>
              </select>
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1'>تفضيلات خاصة للطبخ والتقطيع (اختياري)</label>
              <textarea value={preparationNotes} onChange={(e) => setPreparationNotes(e.target.value)} placeholder='اكتب أي تفضيلات خاصة، مثل: تقطيع متوسط، إدامة البهارات...' className='w-full border rounded-2xl p-4 text-sm focus:border-emerald-500' rows={2}></textarea>
            </div>
          </div>
        )}

        {/* طريقة الدفع والتحويل البنكي */}
        <div className='bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4'>
          <h2 className='text-lg font-bold text-gray-800 border-b pb-3'>طريقة الدفع وإرفاق الإيصال</h2>
          
          <div className='space-y-3'>
            {paymentOptions.length === 0 ? (
              <p className='rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900'>
                لا توجد طرق دفع متاحة حالياً. يرجى التواصل مع المتجر.
              </p>
            ) : paymentOptions.map((opt) => (
              <label key={opt.value} className={`border p-4 rounded-2xl cursor-pointer flex items-center justify-between transition ${paymentMethod === opt.value ? 'border-emerald-600 bg-emerald-50/60 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className='flex items-center gap-3'>
                  <input type='radio' name='paymentMethod' value={opt.value} checked={paymentMethod === opt.value} onChange={(e) => setPaymentMethod(e.target.value)} className='w-4 h-4 text-emerald-600' />
                  <span className='font-bold text-gray-800 text-sm'>{opt.label}</span>
                </div>
                <span className='text-xs font-semibold text-emerald-700 bg-white px-3 py-1 rounded-full border border-emerald-100'>متاح</span>
              </label>
            ))}
          </div>

          {paymentMethod === 'transfer' && (
            <div className='bg-emerald-50/80 border border-emerald-200 p-5 rounded-2xl space-y-4 text-emerald-900 mt-4'>
              <div className='flex justify-between items-center border-b border-emerald-200 pb-2'>
                <p className='font-bold text-sm'>بيانات التحويل البنكي للمتجر:</p>
                <button type='button' onClick={handleCopyIban} className='bg-white text-emerald-700 border border-emerald-300 px-3 py-1 rounded-xl text-xs font-bold hover:bg-emerald-50 transition'>
                  {ibanCopied ? '✓ تم النسخ!' : '📋 نسخ رقم الإيبان'}
                </button>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs'>
                <p><strong>المصرف:</strong> {bankInfo.name || 'مصرف الراجحي'}</p>
                <p><strong>اسم الحساب:</strong> {bankInfo.accountName || 'اسم صاحب الحساب'}</p>
                <p className='sm:col-span-2'><strong>رقم الإيبان (IBAN):</strong> <span dir='ltr' className='font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-200 inline-block'>{bankInfo.iban || 'SA0000000000000000000000'}</span></p>
              </div>

              <div className='pt-2 border-t border-emerald-200'>
                <label className='block text-xs font-bold text-emerald-900 mb-1.5'>إرفاق صورة إيصال التحويل البنكي (صورة الفاتورة/الحوالة) *</label>
                <input type='file' accept='image/*' onChange={handleUploadReceipt} className='w-full border border-emerald-300 rounded-2xl p-2.5 text-xs bg-white text-gray-700' required />
                {receiptUploading && <p className='text-xs text-amber-700 font-bold mt-1.5'>جاري معالجة صورة الإيصال...</p>}
                {receiptUploaded && <p className='text-xs text-emerald-700 font-bold mt-1.5'>✓ تم رفع الإيصال بنجاح وجاهز للإرسال</p>}
              </div>
            </div>
          )}
        </div>

        {/* المجموع الكلي وزر إتمام الطلب */}
        <div className='bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4'>
          <div>
            <span className='text-sm text-gray-500 block'>الإجمالي النهائي للطلب:</span>
            <span className='text-3xl font-extrabold text-emerald-700'>{total} <span className='text-base font-normal'>ر.س</span></span>
          </div>
          <button type='submit' disabled={checkoutLoading || receiptUploading || paymentOptions.length === 0} className='w-full sm:w-auto bg-emerald-600 text-white px-10 py-4 rounded-2xl font-extrabold text-base hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/25 disabled:opacity-50'>
            {checkoutLoading ? 'جاري تأكيد وإنشاء الطلب...' : 'إتمام وتأكيد الطلب الآن 🚀'}
          </button>
        </div>
      </form>
    </div>
  );
}
