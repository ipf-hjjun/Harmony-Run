import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  return new Response(JSON.stringify(body), { ...init, headers });
}

function normalizeName(raw: unknown) {
  let name = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (name.length > 20) name = name.slice(0, 20);
  return name;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  let payload: { name?: unknown; score?: unknown };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = normalizeName(payload.name);
  const score = Number(payload.score);

  if (!name) return jsonResponse({ error: "Missing name" }, { status: 400 });
  if (!Number.isFinite(score)) {
    return jsonResponse({ error: "Invalid score" }, { status: 400 });
  }

  const scoreInt = Math.trunc(score);
  if (scoreInt < 0 || scoreInt > 999999) {
    return jsonResponse({ error: "Score out of range" }, { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await supabase.from("scores").insert({
    name,
    score: scoreInt,
  });

  if (error) return jsonResponse({ error: error.message }, { status: 400 });
  return jsonResponse({ ok: true });
});
