import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const orderId = Number(id);
    const cookieStore = await cookies();
    const phone = cookieStore.get('user_phone')?.value;
    if (!phone) return NextResponse.json({ error: 'سجّل الدخول بحساب العميل أولاً' }, { status: 401 });
    const customer = await prisma.customers.findFirst({ where: { phone } });
    if (!customer) return NextResponse.json({ error: 'حساب العميل غير موجود' }, { status: 404 });
    const order = await prisma.orders.findUnique({ where: { id: orderId } });
    if (!order || order.customer_id !== customer.id) return NextResponse.json({ error: 'الطلب غير موجود أو لا يخص هذا الحساب' }, { status: 403 });
    const formData = await request.formData();
    const file = formData.get('receipt') as File;
    if (!file) return NextResponse.json({ error: 'لم يتم إرفاق أي ملف' }, { status: 400 });
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = path.extname(file.name) || '.jpg';
    const filename = 'receipt-' + orderId + '-' + Date.now() + ext;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    try { await import('fs/promises').then(fs => fs.mkdir(uploadDir, { recursive: true })); } catch (e) {}
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);
    const receiptUrl = '/uploads/' + filename;
    const updatedNotes = (order.notes || '') + ' | تم إرفاق إيصال التحويل بنجاح (' + receiptUrl + ')';
    await prisma.orders.update({ where: { id: orderId }, data: { notes: updatedNotes.trim() } });
    return NextResponse.json({ success: true, receiptUrl });
  } catch (error: any) {
    console.error('Error uploading receipt:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء رفع الإيصال' }, { status: 500 });
  }
}