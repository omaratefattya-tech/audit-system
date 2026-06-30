# delete-user Edge Function

وظيفتها حذف المستخدم نهائيًا من Supabase Auth، ثم حذف سجله من `public.app_users`.

## النشر من Supabase CLI

```bash
supabase functions deploy delete-user
```

تأكد أن المتغيرات التالية موجودة تلقائيًا أو مضبوطة في Supabase:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

لا تضع Service Role Key داخل الواجهة الأمامية نهائيًا.
