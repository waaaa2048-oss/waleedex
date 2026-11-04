'use client';

import Link from 'next/link';

export function OrderActionButtons() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className='flex flex-wrap items-center gap-3'>
      <button 
        type='button'
        onClick={handlePrint} 
        className='bg-emerald-600 text-white px-5 py-2.5 rounded-2xl text-xs font-bold hover:bg-emerald-700 transition shadow-sm flex items-center gap-2 cursor-pointer'>
        <span>🖨️ طباعة الفاتورة / حفظ PDF</span>
      </button>

      <Link href='/dashboard/orders' className='bg-gray-100 text-gray-700 px-5 py-2.5 rounded-2xl text-xs font-bold hover:bg-gray-200 transition'>
        العودة للطلبات
      </Link>
    </div>
  );
}