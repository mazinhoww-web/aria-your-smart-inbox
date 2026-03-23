import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// AES-GCM decryption
async function decrypt(encryptedText: string): Promise<string> {
  const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY") ?? "";
  const keyData = new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
  const combined = Uint8Array.from(atob(encryptedText), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
  return new TextDecoder().decode(decrypted);
}

async function getValidAccessToken(userId: string, supabase: any): Promise<string> {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("gmail_access_token, gmail_refresh_token, gmail_token_expiry")
    .eq("id", userId)
    .single();
  if (!profile?.gmail_access_token) throw new Error("No Gmail token found");

  const accessToken = await decrypt(profile.gmail_access_token);
  const tokenExpiry = new Date(profile.gmail_token_expiry);

  if (tokenExpiry > new Date(Date.now() + 5 * 60 * 1000)) return accessToken;

  // Refresh
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
  if (!tokens.access_token) throw new Error("Failed to refresh token");

  // Encrypt and save
  const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY") ?? "";
  const keyDataEnc = new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
  const keyEnc = await crypto.subtle.importKey("raw", keyDataEnc, { name: "AES-GCM" }, false, ["encrypt"]);
  const ivEnc = crypto.getRandomValues(new Uint8Array(12));
  const encryptedNew = await crypto.subtle.encrypt({ name: "AES-GCM", iv: ivEnc }, keyEnc, new TextEncoder().encode(tokens.access_token));
  const combinedNew = new Uint8Array(ivEnc.length + encryptedNew.byteLength);
  combinedNew.set(ivEnc);
  combinedNew.set(new Uint8Array(encryptedNew), ivEnc.length);
  const encryptedToken = btoa(String.fromCharCode(...combinedNew));

  await supabase.from("user_profiles").update({
    gmail_access_token: encryptedToken,
    gmail_token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  }).eq("id", userId);

  return tokens.access_token;
}

const LABEL_NAMES: Record<string, string> = {
  to_respond: "1: to respond",
  fyi: "2: FYI",
  comment: "3: comment",
  notification: "4: notification",
  meeting_update: "5: meeting update",
  awaiting_reply: "6: awaiting reply",
  actioned: "7: actioned",
  marketing: "8: marketing",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const accessToken = await getValidAccessToken(user.id, supabase);

    // Get existing labels
    const labelsRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const { labels } = await labelsRes.json();

    const labelMapping: Record<string, string> = {};

    for (const [key, name] of Object.entries(LABEL_NAMES)) {
      const existing = labels?.find((l: any) => l.name === name);
      if (existing) {
        labelMapping[key] = existing.id;
      } else {
        // Create label
        const createRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            labelListVisibility: "labelShow",
            messageListVisibility: "show",
          }),
        });
        const newLabel = await createRes.json();
        labelMapping[key] = newLabel.id;
      }
    }

    await supabase.from("user_profiles").update({ label_mapping: labelMapping }).eq("id", user.id);

    // Insert default snippets if none exist
    const { count } = await supabase
      .from("snippets")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count === 0) {
      await supabase.rpc("insert_default_snippets", { user_uuid: user.id });
    }

    return new Response(JSON.stringify({ success: true, label_mapping: labelMapping }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
