import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ code: "METHOD_NOT_ALLOWED" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) return json({ code: "CONFIGURATION_ERROR" }, 500);
    const jwt = req.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!jwt) return json({ code: "AUTH_REQUIRED" }, 401);
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: auth, error: authError } = await userClient.auth.getUser(jwt);
    if (authError || !auth?.user?.id) return json({ code: "AUTH_REQUIRED" }, 401);
    if (!req.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) return json({ code: "INVALID_INPUT" }, 400);
    // Bound the body while reading; never log credentials or return upstream error text.
    const reader = req.body?.getReader();
    if (!reader) return json({ code: "INVALID_INPUT" }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); return json({ code: "INVALID_INPUT" }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let body;
    try { body = JSON.parse(new TextDecoder().decode(bytes)); }
    catch { return json({ code: "INVALID_INPUT" }, 400); }
    const id = body?.user_id;
    const password = body?.password;
    if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        || typeof password !== "string" || password.length < 8 || password.length > 128) return json({ code: "INVALID_INPUT" }, 400);
    const targetId = id.toLowerCase();
    if (targetId === auth.user.id.toLowerCase()) return json({ code: "RESET_DENIED" }, 403);
    // Caller JWT, not service_role: existing session/maintenance checks and granular permissions apply.
    const { data: gate, error: gateError } = await userClient.rpc("authorize_user_password_reset", { p_target_user_id: targetId });
    if (gateError) {
      if (gateError.message === "TARGET_NOT_FOUND") return json({ code: "TARGET_NOT_FOUND" }, 404);
      return json({ code: "RESET_DENIED" }, 403);
    }
    if (gate?.authorized !== true || gate.user_id !== targetId || gate.requester_id !== auth.user.id) return json({ code: "RESET_DENIED" }, 403);
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await admin.auth.admin.updateUserById(targetId, { password });
    if (error) {
      if (error.code === "user_not_found") return json({ code: "TARGET_NOT_FOUND" }, 404);
      if (["weak_password", "same_password", "validation_failed"].includes(error.code || "")) return json({ code: "PASSWORD_REJECTED" }, 400);
      return json({ code: "RESET_FAILED" }, 502);
    }
    if (data?.user?.id !== targetId) return json({ code: "RESET_FAILED" }, 502);
    return json({ ok: true, user_id: targetId });
  } catch {
    return json({ code: "RESET_FAILED" }, 500);
  }
});
