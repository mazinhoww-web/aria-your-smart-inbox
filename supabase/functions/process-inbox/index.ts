import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CLASSIFY_SYSTEM = `Você é um classificador de e-mails. Retorne SOMENTE JSON: {"category": "<categoria>"}
Categorias: to_respond|fyi|comment|notification|meeting_update|awaiting_reply|actioned|marketing
Regras: pergunta/pedido→to_respond; informativo→fyi; sistema automático→notification; newsletter/promo→marketing; calendário→meeting_update; conversa encerrada→actioned; menção em docs/ferramentas→comment; aguardando resposta do outro→awaiting_reply`;

// --- Crypto helpers ---
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

// --- Token management ---
async function getValidAccessToken(userId: string, supabase: any): Promise<string> {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("gmail_access_token, gmail_refresh_token, gmail_token_expiry")
    .eq("id", userId)
    .single();

  if (!profile?.gmail_access_token) throw new Error("Gmail not connected");

  const accessToken = await decrypt(profile.gmail_access_token);
  const tokenExpiry = new Date(profile.gmail_token_expiry);

  // If token valid (5min margin), return
  if (tokenExpiry > new Date(Date.now() + 5 * 60 * 1000)) {
    return accessToken;
  }

  // Refresh
  if (!profile.gmail_refresh_token) throw new Error("No refresh token");
  const refreshToken = await decrypt(profile.gmail_refresh_token);

  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
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
        max_tokens: 256,
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
      model: "google/gemini-3-flash-preview",
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

// --- Gmail helpers ---
function getHeader(headers: any[], name: string): string {
  return headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

// --- Demo emails ---
function getDemoEmails() {
  return [
    { gmail_message_id: `demo_${Date.now()}_1`, gmail_thread_id: `thread_${Date.now()}_1`, subject: "Proposta revisada — preciso da sua aprovação", sender_name: "Carolina Mendes", sender_email: "carolina@empresa.com", snippet: "Oi! Segue a versão atualizada da proposta. Quando puder revisar...", category: "to_respond", is_unread: true, received_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
    { gmail_message_id: `demo_${Date.now()}_2`, gmail_thread_id: `thread_${Date.now()}_2`, subject: "Re: Alinhamento Q2 — datas confirmadas", sender_name: "André Rocha", sender_email: "andre@empresa.com", snippet: "Confirmado: reunião dia 15 às 14h. Vou enviar o invite...", category: "fyi", is_unread: true, received_at: new Date(Date.now() - 32 * 60 * 1000).toISOString() },
    { gmail_message_id: `demo_${Date.now()}_3`, gmail_thread_id: `thread_${Date.now()}_3`, subject: "3 novas mensagens em #produto", sender_name: "Slack", sender_email: "notifications@slack.com", snippet: "@marina mencionou você em #produto: 'Sobre o fluxo de...'", category: "notification", is_unread: false, received_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
    { gmail_message_id: `demo_${Date.now()}_4`, gmail_thread_id: `thread_${Date.now()}_4`, subject: "Lembrete: Review semanal amanhã às 10h", sender_name: "Google Calendar", sender_email: "calendar@google.com", snippet: "Review semanal — Participantes: você, Thiago, Marina...", category: "meeting_update", is_unread: false, received_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    { gmail_message_id: `demo_${Date.now()}_5`, gmail_thread_id: `thread_${Date.now()}_5`, subject: "Comentário no doc de specs do MVP", sender_name: "Fernanda Lima", sender_email: "fernanda@empresa.com", snippet: "Adicionei um comentário na seção de requisitos técnicos...", category: "comment", is_unread: false, received_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
    { gmail_message_id: `demo_${Date.now()}_6`, gmail_thread_id: `thread_${Date.now()}_6`, subject: "Aguardando sua assinatura no contrato", sender_name: "Thiago Bastos", sender_email: "thiago@empresa.com", snippet: "O contrato está pronto para assinatura. Prazo até sexta...", category: "awaiting_reply", is_unread: false, received_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
    { gmail_message_id: `demo_${Date.now()}_7`, gmail_thread_id: `thread_${Date.now()}_7`, subject: "Seu relatório mensal está pronto", sender_name: "HubSpot", sender_email: "noreply@hubspot.com", snippet: "Relatório de março: 234 contatos, 12 deals em progresso...", category: "marketing", is_unread: false, received_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
    { gmail_message_id: `demo_${Date.now()}_8`, gmail_thread_id: `thread_${Date.now()}_8`, subject: "Pode revisar esse wireframe?", sender_name: "Marina Souza", sender_email: "marina@empresa.com", snippet: "Acabei o wireframe do novo fluxo de onboarding. Tá no Figma...", category: "to_respond", is_unread: false, received_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() },
  ];
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization")!;
    const { limit = 50 } = await req.json().catch(() => ({}));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user)
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("ai_provider, anthropic_api_key, gmail_connected, gmail_access_token, label_mapping")
      .eq("id", user.id)
      .single();

    const aiProvider = profile?.ai_provider ?? "lovable";
    const anthropicKey = profile?.anthropic_api_key;

    // ============ DEMO MODE ============
    if (!profile?.gmail_connected || !profile?.gmail_access_token) {
      const demoEmails = getDemoEmails();
      const stats: Record<string, number> = {};
      for (const email of demoEmails) {
        stats[email.category] = (stats[email.category] ?? 0) + 1;
        await supabase.from("processed_emails").upsert(
          { user_id: user.id, ...email, has_draft: false },
          { onConflict: "user_id,gmail_message_id" }
        );
      }
      return new Response(
        JSON.stringify({ processed: demoEmails.length, categories: stats, demo: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ REAL GMAIL PROCESSING ============
    let accessToken: string;
    try {
      accessToken = await getValidAccessToken(user.id, supabase);
    } catch (tokenErr) {
      console.error("Token error, falling back to demo:", (tokenErr as Error).message);
      const demoEmails = getDemoEmails();
      const stats: Record<string, number> = {};
      for (const email of demoEmails) {
        stats[email.category] = (stats[email.category] ?? 0) + 1;
        await supabase.from("processed_emails").upsert(
          { user_id: user.id, ...email, has_draft: false },
          { onConflict: "user_id,gmail_message_id" }
        );
      }
      return new Response(
        JSON.stringify({ processed: demoEmails.length, categories: stats, demo: true, token_error: (tokenErr as Error).message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch unread messages from Gmail
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&q=is:unread&maxResults=${limit}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!listRes.ok) {
      const errText = await listRes.text();
      console.error("Gmail list error:", listRes.status, errText);
      throw new Error(`Gmail API error: ${listRes.status}`);
    }

    const listData = await listRes.json();
    const messages = listData.messages ?? [];

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, categories: {}, demo: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const labelMapping = (profile?.label_mapping as Record<string, string>) ?? {};
    const stats: Record<string, number> = {};
    let processed = 0;

    for (const msg of messages) {
      try {
        // Fetch message metadata
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!detailRes.ok) { console.error(`Skip message ${msg.id}: ${detailRes.status}`); continue; }
        const detail = await detailRes.json();

        const headers = detail.payload?.headers ?? [];
        const from = getHeader(headers, "From");
        const subject = getHeader(headers, "Subject");
        const snippet = detail.snippet ?? "";

        // Classify with AI
        let category = "fyi";
        try {
          const classifyInput = `De: ${from}\nAssunto: ${subject}\nSnippet: ${snippet.slice(0, 200)}`;
          const classifyResponse = await callAI(CLASSIFY_SYSTEM, classifyInput, aiProvider, anthropicKey);
          const parsed = JSON.parse(classifyResponse.replace(/```json\n?/g, "").replace(/```/g, "").trim());
          if (parsed.category) category = parsed.category;
        } catch (aiErr) {
          console.error(`AI classify error for ${msg.id}:`, (aiErr as Error).message);
        }

        stats[category] = (stats[category] ?? 0) + 1;

        // Apply Gmail label if configured
        const labelId = labelMapping[category];
        if (labelId) {
          try {
            await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/modify`,
              {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({ addLabelIds: [labelId] }),
              }
            );
          } catch { /* label apply failed, continue */ }
        }

        // Save to DB
        const fromName = from.replace(/<.*>/, "").trim().replace(/"/g, "");
        const fromEmail = from.match(/<(.+)>/)?.[1] ?? from;
        const receivedAt = new Date(parseInt(detail.internalDate)).toISOString();

        await supabase.from("processed_emails").upsert(
          {
            user_id: user.id,
            gmail_message_id: msg.id,
            gmail_thread_id: detail.threadId,
            subject,
            sender_name: fromName,
            sender_email: fromEmail,
            snippet: snippet.slice(0, 300),
            category,
            is_unread: true,
            has_draft: false,
            received_at: receivedAt,
          },
          { onConflict: "user_id,gmail_message_id" }
        );

        processed++;
      } catch (msgErr) {
        console.error(`Failed to process ${msg.id}:`, (msgErr as Error).message);
      }
    }

    return new Response(
      JSON.stringify({ processed, categories: stats, demo: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("process-inbox error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
