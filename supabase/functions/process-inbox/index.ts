import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CLASSIFY_SYSTEM = `Você é um classificador de e-mails. Retorne SOMENTE JSON: {"category": "<categoria>"}
Categorias: to_respond|fyi|comment|notification|meeting_update|awaiting_reply|actioned|marketing
Regras: pergunta/pedido→to_respond; informativo→fyi; sistema automático→notification; newsletter/promo→marketing; calendário→meeting_update; conversa encerrada→actioned`;

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
    const { limit = 50 } = await req.json().catch(() => ({}));

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
      .select("ai_provider, anthropic_api_key, gmail_connected")
      .eq("id", user.id)
      .single();

    const aiProvider = profile?.ai_provider ?? "lovable";
    const anthropicKey = profile?.anthropic_api_key;

    // For now, since Gmail is not connected yet, we simulate processing
    // When Gmail is connected, this will use the Gmail API to fetch real emails
    if (!profile?.gmail_connected) {
      // Generate demo classified emails so the UI works
      const demoEmails = [
        {
          gmail_message_id: `demo_${Date.now()}_1`,
          gmail_thread_id: `thread_${Date.now()}_1`,
          subject: "Proposta revisada — preciso da sua aprovação",
          sender_name: "Carolina Mendes",
          sender_email: "carolina@empresa.com",
          snippet:
            "Oi! Segue a versão atualizada da proposta. Quando puder revisar...",
          category: "to_respond",
          is_unread: true,
          received_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        },
        {
          gmail_message_id: `demo_${Date.now()}_2`,
          gmail_thread_id: `thread_${Date.now()}_2`,
          subject: "Re: Alinhamento Q2 — datas confirmadas",
          sender_name: "André Rocha",
          sender_email: "andre@empresa.com",
          snippet:
            "Confirmado: reunião dia 15 às 14h. Vou enviar o invite...",
          category: "fyi",
          is_unread: true,
          received_at: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
        },
        {
          gmail_message_id: `demo_${Date.now()}_3`,
          gmail_thread_id: `thread_${Date.now()}_3`,
          subject: "3 novas mensagens em #produto",
          sender_name: "Slack",
          sender_email: "notifications@slack.com",
          snippet: "@marina mencionou você em #produto: 'Sobre o fluxo de...'",
          category: "notification",
          is_unread: false,
          received_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        },
        {
          gmail_message_id: `demo_${Date.now()}_4`,
          gmail_thread_id: `thread_${Date.now()}_4`,
          subject: "Lembrete: Review semanal amanhã às 10h",
          sender_name: "Google Calendar",
          sender_email: "calendar@google.com",
          snippet: "Review semanal — Participantes: você, Thiago, Marina...",
          category: "meeting_update",
          is_unread: false,
          received_at: new Date(
            Date.now() - 2 * 60 * 60 * 1000
          ).toISOString(),
        },
        {
          gmail_message_id: `demo_${Date.now()}_5`,
          gmail_thread_id: `thread_${Date.now()}_5`,
          subject: "Comentário no doc de specs do MVP",
          sender_name: "Fernanda Lima",
          sender_email: "fernanda@empresa.com",
          snippet:
            "Adicionei um comentário na seção de requisitos técnicos...",
          category: "comment",
          is_unread: false,
          received_at: new Date(
            Date.now() - 3 * 60 * 60 * 1000
          ).toISOString(),
        },
        {
          gmail_message_id: `demo_${Date.now()}_6`,
          gmail_thread_id: `thread_${Date.now()}_6`,
          subject: "Aguardando sua assinatura no contrato",
          sender_name: "Thiago Bastos",
          sender_email: "thiago@empresa.com",
          snippet: "O contrato está pronto para assinatura. Prazo até sexta...",
          category: "awaiting_reply",
          is_unread: false,
          received_at: new Date(
            Date.now() - 5 * 60 * 60 * 1000
          ).toISOString(),
        },
        {
          gmail_message_id: `demo_${Date.now()}_7`,
          gmail_thread_id: `thread_${Date.now()}_7`,
          subject: "Seu relatório mensal está pronto",
          sender_name: "HubSpot",
          sender_email: "noreply@hubspot.com",
          snippet:
            "Relatório de março: 234 contatos, 12 deals em progresso...",
          category: "marketing",
          is_unread: false,
          received_at: new Date(
            Date.now() - 6 * 60 * 60 * 1000
          ).toISOString(),
        },
        {
          gmail_message_id: `demo_${Date.now()}_8`,
          gmail_thread_id: `thread_${Date.now()}_8`,
          subject: "Pode revisar esse wireframe?",
          sender_name: "Marina Souza",
          sender_email: "marina@empresa.com",
          snippet:
            "Acabei o wireframe do novo fluxo de onboarding. Tá no Figma...",
          category: "to_respond",
          is_unread: false,
          received_at: new Date(
            Date.now() - 8 * 60 * 60 * 1000
          ).toISOString(),
        },
      ];

      const stats: Record<string, number> = {};
      for (const email of demoEmails) {
        stats[email.category] = (stats[email.category] ?? 0) + 1;
        await supabase.from("processed_emails").upsert(
          {
            user_id: user.id,
            ...email,
            has_draft: false,
          },
          { onConflict: "user_id,gmail_message_id" }
        );
      }

      return new Response(
        JSON.stringify({
          processed: demoEmails.length,
          categories: stats,
          demo: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Real Gmail processing would go here when gmail_connected = true
    return new Response(
      JSON.stringify({
        processed: 0,
        categories: {},
        message: "Gmail processing not yet implemented",
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
