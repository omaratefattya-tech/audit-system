import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || serviceRoleKey;

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ error: "Missing Supabase environment variables" }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "").trim();
    if (!jwt) return json({ error: "Missing authorization token" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: requesterData, error: requesterError } = await userClient.auth.getUser(jwt);
    const requester = requesterData?.user;
    if (requesterError || !requester?.id) return json({ error: "Invalid authorization token" }, 401);

    const { user_id } = await req.json().catch(() => ({}));
    const targetUserId = String(user_id || "").trim();
    if (!targetUserId) return json({ error: "Missing user_id" }, 400);
    if (targetUserId === requester.id) return json({ error: "لا يمكن حذف حسابك الحالي." }, 403);

    const { data: requesterProfile, error: requesterProfileError } = await adminClient
      .from("app_users")
      .select("id, role, is_active")
      .eq("id", requester.id)
      .maybeSingle();

    if (requesterProfileError) return json({ error: requesterProfileError.message }, 500);
    if (!requesterProfile || requesterProfile.role !== "super_admin" || requesterProfile.is_active !== true) {
      return json({ error: "غير مصرح. حذف المستخدمين متاح لمنشئ النظام فقط." }, 403);
    }

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from("app_users")
      .select("id, email, full_name, role")
      .eq("id", targetUserId)
      .maybeSingle();

    if (targetProfileError) return json({ error: targetProfileError.message }, 500);
    if (!targetProfile) return json({ error: "المستخدم غير موجود في app_users." }, 404);
    if (targetProfile.role === "super_admin") return json({ error: "لا يمكن حذف حساب منشئ النظام." }, 403);

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(targetUserId);
    if (deleteAuthError) return json({ error: deleteAuthError.message }, 500);

    // In case the FK cascade is not configured, remove the profile safely as a fallback.
    await adminClient.from("app_users").delete().eq("id", targetUserId);

    return json({ ok: true, deleted_user_id: targetUserId, deleted_email: targetProfile.email || null });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
