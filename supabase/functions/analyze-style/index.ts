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

async function callAI(systemPrompt: string, userMessage: string, aiProvider: string, anthropicKey?: string | null): Promise<string> {
  if (aiProvider === "anthropic" && anthropicKey) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);
    const data = await res.json();
    return data.content[0].text;
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Lovable AI error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

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

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("ai_provider, anthropic_api_key")
      .eq("id", user.id)
      .single();

    const accessToken = await getValidAccessToken(user.id, supabase);

    // Fetch sent emails
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=SENT&maxResults=100",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const { messages } = await listRes.json();

    if (!messages?.length) {
      return new Response(JSON.stringify({ error: "No sent emails found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sample 30 emails
    const sample = messages.slice(0, 30);
    const emailTexts: string[] = [];

    for (const msg of sample) {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const detail = await detailRes.json();
        const headers = detail.payload?.headers ?? [];
        const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value ?? "";

        let body = "";
        if (detail.payload?.body?.data) {
          body = atob(detail.payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
        } else if (detail.payload?.parts) {
          const textPart = detail.payload.parts.find((p: any) => p.mimeType === "text/plain");
          if (textPart?.body?.data) {
            body = atob(textPart.body.data.replace(/-/g, "+").replace(/_/g, "/"));
          }
        }

        if (body && body.length > 20) {
          emailTexts.push(`Assunto: ${subject}\n${body.slice(0, 400)}`);
        }
      } catch {
        // Skip failed emails
      }
    }

    if (emailTexts.length < 3) {
      return new Response(JSON.stringify({ error: "Insufficient sent emails to analyze" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stylePrompt = `Analise estes ${emailTexts.length} e-mails enviados pelo usuário e extraia o perfil de escrita.
Retorne SOMENTE um JSON válido:
{
  "tone": "formal|informal|misto",
  "language": "pt-BR|en|misto",
  "greeting": "saudação típica",
  "closing": "fechamento típico",
  "avg_length": "curto|médio|longo",
  "style_notes": "2-3 características marcantes",
  "examples": ["frase típica 1", "frase típica 2"]
}`;

    const emailSample = emailTexts.slice(0, 15).join("\n\n---\n\n");
    const styleResponse = await callAI(
      stylePrompt,
      emailSample,
      profile?.ai_provider ?? "lovable",
      profile?.anthropic_api_key
    );

    let styleProfile;
    try {
      const cleaned = styleResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      styleProfile = JSON.parse(cleaned);
    } catch {
      styleProfile = { tone: "misto", language: "pt-BR", greeting: "Oi,", closing: "Abs," };
    }

    await supabase.from("user_profiles").update({
      style_profile: styleProfile,
      style_analyzed_at: new Date().toISOString(),
    }).eq("id", user.id);

    return new Response(JSON.stringify({ success: true, style_profile: styleProfile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
