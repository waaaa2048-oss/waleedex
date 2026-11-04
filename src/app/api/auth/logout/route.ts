import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "تم تسجيل الخروج بنجاح" });
  
  // مسح كوكيز الجلسة والتوكن
  response.cookies.set("token", "", { expires: new Date(0), path: "/" });
  response.cookies.set("session", "", { expires: new Date(0), path: "/" });

  return response;
}

