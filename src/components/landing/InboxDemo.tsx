import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DemoEmail {
  sender: string;
  subject: string;
  category: string;
  catColor: string;
}

const DEMO_EMAILS: DemoEmail[] = [
  { sender: "Carolina Mendes", subject: "Proposta revisada — preciso da sua aprovação", category: "Responder", catColor: "var(--cat-respond)" },
  { sender: "Slack", subject: "3 novas mensagens em #produto", category: "Notificação", catColor: "var(--cat-notification)" },
  { sender: "André Rocha", subject: "Re: Alinhamento Q2 — datas confirmadas", category: "FYI", catColor: "var(--cat-fyi)" },
  { sender: "Google Calendar", subject: "Lembrete: Review semanal amanhã às 10h", category: "Reunião", catColor: "var(--cat-meeting)" },
  { sender: "HubSpot", subject: "Seu relatório mensal está pronto", category: "Marketing", catColor: "var(--cat-marketing)" },
  { sender: "Fernanda Lima", subject: "Comentário no doc de specs do MVP", category: "Comentário", catColor: "var(--cat-comment)" },
  { sender: "Thiago Bastos", subject: "Aguardando sua assinatura no contrato", category: "Aguardando", catColor: "var(--cat-awaiting)" },
  { sender: "Stripe", subject: "Pagamento recebido — Invoice #4821", category: "Acionado", catColor: "var(--cat-actioned)" },
  { sender: "Marina Souza", subject: "Pode revisar esse wireframe?", category: "Responder", catColor: "var(--cat-respond)" },
  { sender: "LinkedIn", subject: "5 pessoas visualizaram seu perfil", category: "Marketing", catColor: "var(--cat-marketing)" },
];

export function InboxDemo() {
  const [visibleEmails, setVisibleEmails] = useState<DemoEmail[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex >= DEMO_EMAILS.length) {
      const timer = setTimeout(() => {
        setVisibleEmails([]);
        setCurrentIndex(0);
      }, 4000);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setVisibleEmails(prev => [...prev, DEMO_EMAILS[currentIndex]]);
      setCurrentIndex(prev => prev + 1);
    }, 600);

    return () => clearTimeout(timer);
  }, [currentIndex]);

  return (
    <div className="relative w-full max-w-lg">
      {/* Fake inbox chrome */}
      <div className="rounded-lg border border-border bg-card overflow-hidden shadow-2xl shadow-black/40">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-cat-fyi/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-cat-notification/60" />
          </div>
          <span className="text-xs text-muted-foreground ml-2 font-label">ARIA — Inbox</span>
        </div>

        {/* Email list */}
        <div className="min-h-[420px] max-h-[420px] overflow-hidden p-1">
          <AnimatePresence mode="popLayout">
            {visibleEmails.map((email, i) => (
              <motion.div
                key={`${email.sender}-${i}`}
                initial={{ opacity: 0, x: -12, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-surface-hover transition-colors group"
              >
                {/* Category dot */}
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: `hsl(${email.catColor})` }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground truncate">
                      {email.sender}
                    </span>
                    <span
                      className="text-[10px] font-label px-1.5 py-0.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: `hsl(${email.catColor} / 0.12)`,
                        color: `hsl(${email.catColor})`,
                        boxShadow: `0 0 6px hsl(${email.catColor} / 0.2)`,
                      }}
                    >
                      {email.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {email.subject}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {visibleEmails.length === 0 && (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-muted-foreground">Organizando inbox...</p>
              </motion.div>
            </div>
          )}
        </div>
      </div>

      {/* Glow effect behind */}
      <div className="absolute -inset-4 bg-primary/5 rounded-2xl blur-3xl -z-10" />
    </div>
  );
}
