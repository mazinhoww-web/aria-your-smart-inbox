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

// --- AI helper ---
async function callAI(
  systemPrompt: string,
  userMessage: string,
  aiProvider: string,
  anthropicKey?: string | null
): Promise<string> {
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

  const res = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    }
  );
  if (!res.ok) throw new Error(`Lovable AI error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization")!;
    const { gmail_message_id, gmail_thread_id } = await req.json();

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

    const { data: profile } = await supabase
      .from("user_profiles")
      .select(
        "style_profile, custom_instructions, email, ai_provider, anthropic_api_key"
      )
      .eq("id", user.id)
      .single();

    // Get original email context from processed_emails
    const { data: emailData } = await supabase
      .from("processed_emails")
      .select("*")
      .eq("user_id", user.id)
      .eq("gmail_message_id", gmail_message_id)
      .single();

    if (!emailData) {
      return new Response(JSON.stringify({ error: "Email not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const style = profile?.style_profile ?? {};
    const styleDescription = `
- Tom: ${style.tone ?? "misto"}
- Idioma: ${style.language ?? "pt-BR"}
- Saudação típica: ${style.greeting ?? "Oi,"}
- Fechamento típico: ${style.closing ?? "Abs,"}
- Comprimento: ${style.avg_length ?? "médio"}
- Estilo: ${style.style_notes ?? ""}
${profile?.custom_instructions ? `- Instruções: ${profile.custom_instructions}` : ""}`;

    const systemPrompt = `Você é um assistente de e-mail que gera rascunhos no estilo do usuário.

PERFIL DE ESCRITA:
${styleDescription}

REGRAS:
1. Imite o estilo descrito
2. Responda TODOS os pontos/perguntas
3. Nunca invente informações
4. Se pede agendamento, use placeholder [INSERIR HORÁRIO]
5. Use o mesmo idioma do e-mail recebido
6. Retorne APENAS o corpo do e-mail, sem assunto
7. Não use markdown, apenas texto simples`;

    const userMessage = `E-MAIL A RESPONDER:
De: ${emailData.sender_name} <${emailData.sender_email}>
Assunto: ${emailData.subject}
Conteúdo: ${emailData.snippet}`;

    const aiProvider = profile?.ai_provider ?? "lovable";
    const anthropicKey = profile?.anthropic_api_key;
    const draftBody = await callAI(
      systemPrompt,
      userMessage,
      aiProvider,
      anthropicKey
    );

    // ── CRIAR DRAFT REAL NO GMAIL ──────────────────────────────────────────
    let gmailDraftId: string | null = null;
    try {
      const accessToken = await getValidAccessToken(user.id, supabase);

      // Montar email em formato RFC 2822
      const emailContent = [
        `To: ${emailData.sender_email}`,
        `Subject: Re: ${emailData.subject}`,
        `In-Reply-To: ${gmail_message_id}`,
        `References: ${gmail_message_id}`,
        `Content-Type: text/plain; charset=UTF-8`,
        ``,
        draftBody,
      ].join("\r\n");

      // Encode para base64url (formato exigido pela Gmail API)
      const encoded = btoa(unescape(encodeURIComponent(emailContent)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const draftRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              raw: encoded,
              threadId: gmail_thread_id,
            },
          }),
        }
      );

      if (draftRes.ok) {
        const gmailDraft = await draftRes.json();
        gmailDraftId = gmailDraft.id;
        console.log("Gmail draft created:", gmailDraftId);
      } else {
        const err = await draftRes.text();
        console.error("Failed to create Gmail draft:", draftRes.status, err);
        // Continuar mesmo se falhar — draft fica salvo no banco
      }
    } catch (gmailErr) {
      console.error("Gmail draft creation error:", gmailErr);
    }

    // ── SALVAR NO BANCO (com gmail_draft_id real) ──────────────────────────
    const { data: draft } = await supabase
      .from("email_drafts")
      .upsert(
        {
          user_id: user.id,
          gmail_message_id,
          gmail_thread_id,
          subject: `Re: ${emailData.subject}`,
          draft_body: draftBody,
          gmail_draft_id: gmailDraftId,
          status: "pending",
        },
        { onConflict: "user_id,gmail_message_id" }
      )
      .select()
      .single();

    await supabase
      .from("processed_emails")
      .update({ has_draft: true })
      .eq("user_id", user.id)
      .eq("gmail_message_id", gmail_message_id);

    return new Response(
      JSON.stringify({
        success: true,
        draft_body: draftBody,
        draft_id: draft?.id,
        gmail_draft_id: gmailDraftId,
        gmail_draft_created: !!gmailDraftId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
