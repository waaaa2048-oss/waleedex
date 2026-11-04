# تطبيق أهل الكرم الأصلي

هذا مجلد المشروع الأصلي للهاتف والكمبيوتر. التطبيق يفتح الموقع مباشرة من داخل WebView، لذلك تصل تغييرات الواجهة والطلبات من الموقع نفسه.

## الملفات الناتجة

- `public/downloads/AhlAlKaram-Android.apk` — APK موقّع بمفتاح Debug للتثبيت المباشر خارج Google Play.
- `public/downloads/AhlAlKaram-Windows-Setup.exe` — مثبت Windows x64.
- `public/downloads/AhlAlKaram-Windows-Portable.exe` — نسخة Windows محمولة.

## تثبيت Android

1. نزّل ملف APK إلى جهاز Android.
2. افتحه، واسمح بالتثبيت من هذا المصدر إذا طلب النظام ذلك.
3. اسم التطبيق «أهل الكرم» وأيقونته عامة قابلة للتغيير من ملفات `public/icon*`.

النسخة الحالية موقّعة بمفتاح Debug لتمكين التثبيت المباشر. النشر في Google Play يحتاج مفتاح Release وشهادة توقيع يملكها صاحب المتجر.

## تثبيت Windows

1. نزّل `AhlAlKaram-Windows-Setup.exe` وشغّله.
2. قد يظهر تحذير SmartScreen لأن الملف غير موقع بشهادة ناشر تجارية؛ اختر «مزيد من المعلومات» ثم «تشغيل على أي حال» إذا كنت تثق بمصدر الملف.
3. أو استخدم النسخة المحمولة `AhlAlKaram-Windows-Portable.exe`.

## التحديث وتغيير رابط الموقع

- ملفات التطبيق الأصلية تفتح الموقع المستضاف، فتظهر تحديثات الموقع مباشرة دون إعادة تثبيت APK/EXE.
- عند ربط دومين دائم، ابنِ نسخاً مرتبطة به مباشرةً:

```bash
CAPACITOR_SERVER_URL=https://your-domain.example ./scripts/build-native.sh
```

- يتطلب بناء APK: JDK 21 وAndroid SDK Platform 36 وBuild Tools 36.
- يتطلب بناء مثبت Windows على Linux: Wine وWine32.
- iOS IPA لا يُبنى من Linux؛ يلزم macOS/Xcode وشهادة Apple Developer للتوقيع والتوزيع.
