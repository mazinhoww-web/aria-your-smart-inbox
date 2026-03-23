import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    // Save draft
    const { data: draft } = await supabase
      .from("email_drafts")
      .upsert(
        {
          user_id: user.id,
          gmail_message_id,
          gmail_thread_id,
          subject: `Re: ${emailData.subject}`,
          draft_body: draftBody,
          status: "pending",
        },
        { onConflict: "user_id,gmail_message_id" }
      )
      .select()
      .single();

    // Update has_draft
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
