import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um classificador de e-mails. Analise e retorne SOMENTE um JSON válido:
{"category": "<categoria>"}

Categorias disponíveis:
- "to_respond": e-mail contém pergunta, pedido, prazo ou solicita resposta
- "fyi": informativo, não requer ação
- "comment": menções de Google Docs, Notion, Figma, ferramentas colaborativas
- "notification": alertas automáticos de sistemas, apps, plataformas
- "meeting_update": convites de calendário, mudanças de reunião
- "awaiting_reply": thread onde o usuário já respondeu e aguarda
- "actioned": conversa encerrada, confirmações finais
- "marketing": newsletters, promos, cold outreach

REGRAS:
1. Pergunta direta ou pedido de ação → to_respond
2. noreply@, notifications@ → notification
3. "unsubscribe" ou newsletter → marketing
4. Convite/mudança de reunião → meeting_update
5. Retorne SOMENTE o JSON`;

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

  // Lovable AI gateway
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
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Lovable AI error: ${res.status} ${t}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { sender, subject, snippet, user_id } = await req.json();

    // Get user's AI provider preference
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("ai_provider, anthropic_api_key")
      .eq("id", user_id)
      .single();

    const aiProvider = profile?.ai_provider ?? "lovable";
    const anthropicKey = profile?.anthropic_api_key;

    const emailData = `De: ${sender}\nAssunto: ${subject}\nSnippet: ${snippet?.slice(0, 300) ?? ""}`;
    const response = await callAI(SYSTEM_PROMPT, emailData, aiProvider, anthropicKey);

    let result;
    try {
      result = JSON.parse(response.trim());
    } catch {
      result = { category: "fyi" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message, category: "fyi" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
