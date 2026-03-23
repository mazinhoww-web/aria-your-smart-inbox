import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// --- Crypto helpers (copied from process-inbox) ---
async function decrypt(encryptedText: string): Promise<string> {
  const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY") ?? "";
  const combined = Uint8Array.from(atob(encryptedText), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32).slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
  return new TextDecoder().decode(decrypted);
}

async function encrypt(text: string): Promise<string> {
  const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY") ?? "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32).slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(text)
  );
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function getValidAccessToken(userId: string, supabase: any): Promise<string> {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("gmail_access_token, gmail_refresh_token, gmail_token_expiry")
    .eq("id", userId)
    .single();

  if (!profile?.gmail_access_token) throw new Error("Gmail not connected");

  const accessToken = await decrypt(profile.gmail_access_token);
  const tokenExpiry = new Date(profile.gmail_token_expiry);

  if (tokenExpiry > new Date(Date.now() + 5 * 60 * 1000)) {
    return accessToken;
  }

  if (!profile.gmail_refresh_token) throw new Error("No refresh token");
  const refreshToken = await decrypt(profile.gmail_refresh_token);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokens = await res.json();
  if (!tokens.access_token) throw new Error("Failed to refresh Gmail token");

  await supabase.from("user_profiles").update({
    gmail_access_token: await encrypt(tokens.access_token),
    gmail_token_expiry: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
  }).eq("id", userId);

  return tokens.access_token;
}

// --- Email body decoder ---
function decodeBody(payload: any): string {
  if (payload?.body?.data) {
    try {
      return atob(payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
    } catch {
      return "";
    }
  }
  if (payload?.parts) {
    // Prioridade: text/html > text/plain > recursivo
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        try {
          return atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
        } catch {
          continue;
        }
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        try {
          const text = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
          return `<pre style="white-space:pre-wrap;font-family:inherit">${text}</pre>`;
        } catch {
          continue;
        }
      }
    }
    // Recursivo para multipart
    for (const part of payload.parts) {
      const body = decodeBody(part);
      if (body) return body;
    }
  }
  return "";
}

function getHeader(headers: any[], name: string): string {
  return headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization")!;
    const { gmail_message_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const {
      data: { user },
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });

    const accessToken = await getValidAccessToken(user.id, supabase);

    // Buscar mensagem completa
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmail_message_id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);
    const message = await res.json();

    const headers = message.payload?.headers ?? [];
    const body_html = decodeBody(message.payload);
    const from = getHeader(headers, "From");
    const date = getHeader(headers, "Date");

    return new Response(
      JSON.stringify({ body_html, from, date }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
