'use client';

export default function PrintActions() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button 
        type="button"
        onClick={() => window.print()}
        className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl text-xs font-bold hover:bg-emerald-700 transition shadow-sm flex items-center gap-2 cursor-pointer">
        <span>🖨️ طباعة الفاتورة</span>
      </button>

      <button 
        type="button"
        onClick={() => window.print()}
        className="bg-gray-800 text-white px-5 py-2.5 rounded-2xl text-xs font-bold hover:bg-gray-900 transition shadow-sm flex items-center gap-2 cursor-pointer">
        <span>📥 حفظ PDF</span>
      </button>
    </div>
  );
}