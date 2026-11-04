import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'البيانات ناقصة' }, { status: 400 });
    }

    const user = await prisma.users.findUnique({ where: { email } });

    if (!user || user.otpCode !== code) {
      return NextResponse.json({ error: 'رمز التحقق غير صحيح' }, { status: 400 });
    }

    // التأكد من أن الرمز لم تنتهِ صلاحيته
    if (user.otpExpiresAt && new Date() > new Date(user.otpExpiresAt)) {
      return NextResponse.json({ error: 'انتهت صلاحية الرمز، يرجى طلب رمز جديد' }, { status: 400 });
    }

    // تصفير الرمز بعد نجاح الدخول لأمان أعلى
    await prisma.users.update({
      where: { email },
      data: { otpCode: null, otpExpiresAt: null },
    });

    return NextResponse.json({ message: 'تم تسجيل الدخول بنجاح', user });
  } catch (error) {
    console.error('OTP Verify Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء التحقق من الرمز' }, { status: 500 });
  }
}