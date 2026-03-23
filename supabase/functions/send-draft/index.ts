import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
  return tokens.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization")!;
    const { gmail_draft_id, draft_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const accessToken = await getValidAccessToken(user.id, supabase);

    // Send draft via Gmail API
    const sendRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/drafts/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: gmail_draft_id }),
      }
    );

    if (!sendRes.ok) {
      const err = await sendRes.text();
      throw new Error(`Gmail send error: ${sendRes.status} ${err}`);
    }

    const sent = await sendRes.json();

    // Update status in DB
    await supabase
      .from("email_drafts")
      .update({ status: "sent", updated_at: new Date().toISOString() })
      .eq("id", draft_id)
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ success: true, message_id: sent.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
