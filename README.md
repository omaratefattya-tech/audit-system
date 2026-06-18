# برنامج مراجعة المخازن

نسخة GitHub Pages جاهزة كبداية لبرنامج مراجعة مخازن المنتج التام والخامات، ومجهزة للربط مع Supabase.

## ما تم تجهيزه
- واجهة Responsive تعمل على Desktop / Tablet / Mobile.
- استخدام شعار البرنامج داخل الواجهة والأيقونات.
- Manifest وأيقونات iPhone / Android / Desktop Bookmark.
- خط Cairo من Google Fonts.
- تاريخ ووقت القاهرة تلقائياً من المتصفح باستخدام Africa/Cairo.
- ملف Footer منفصل داخل `components/footer.html` ويتم تحميله من `assets/js/footer.js`.
- طبقة Supabase داخل `assets/js/supabase-config.js` بدون مفاتيح حقيقية.
- ملف `supabase-schema.sql` كبداية لجداول النباتات والمخازن والحركات والرفع.

## إعداد Supabase
1. أنشئ مشروع Supabase جديد.
2. افتح SQL Editor.
3. نفذ محتوى ملف `supabase-schema.sql`.
4. من Project Settings > API انسخ URL و publishable/anon key.
5. عدل ملف `assets/js/supabase-config.js`:

```js
window.WAREHOUSE_SUPABASE_CONFIG = {
  url: 'https://YOUR_PROJECT_ID.supabase.co',
  anonKey: 'YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY'
};
```

> لا تضع Service Role Key داخل GitHub Pages نهائياً.

## GitHub Pages
ارفع الملفات داخل Repository ثم فعّل Pages من Settings > Pages واختر Branch الرئيسي.
