import { motion } from "framer-motion";
import { RefreshCw, Filter } from "lucide-react";

interface EmailRowData {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  category: string;
  catColor: string;
  time: string;
  unread: boolean;
  hasDraft: boolean;
}

const MOCK_EMAILS: EmailRowData[] = [
  { id: "1", sender: "Carolina Mendes", subject: "Proposta revisada — preciso da sua aprovação", snippet: "Oi! Segue a versão atualizada da proposta. Quando puder revisar...", category: "Responder", catColor: "var(--cat-respond)", time: "10min", unread: true, hasDraft: true },
  { id: "2", sender: "André Rocha", subject: "Re: Alinhamento Q2 — datas confirmadas", snippet: "Confirmado: reunião dia 15 às 14h. Vou enviar o invite...", category: "FYI", catColor: "var(--cat-fyi)", time: "32min", unread: true, hasDraft: false },
  { id: "3", sender: "Slack", subject: "3 novas mensagens em #produto", snippet: "@marina mencionou você em #produto: 'Sobre o fluxo de...'", category: "Notificação", catColor: "var(--cat-notification)", time: "1h", unread: false, hasDraft: false },
  { id: "4", sender: "Google Calendar", subject: "Lembrete: Review semanal amanhã às 10h", snippet: "Review semanal — Participantes: você, Thiago, Marina...", category: "Reunião", catColor: "var(--cat-meeting)", time: "2h", unread: false, hasDraft: false },
  { id: "5", sender: "Fernanda Lima", subject: "Comentário no doc de specs do MVP", snippet: "Adicionei um comentário na seção de requisitos técnicos...", category: "Comentário", catColor: "var(--cat-comment)", time: "3h", unread: false, hasDraft: false },
  { id: "6", sender: "Thiago Bastos", subject: "Aguardando sua assinatura no contrato", snippet: "O contrato está pronto para assinatura. Prazo até sexta...", category: "Aguardando", catColor: "var(--cat-awaiting)", time: "5h", unread: false, hasDraft: false },
  { id: "7", sender: "HubSpot", subject: "Seu relatório mensal está pronto", snippet: "Relatório de março: 234 contatos, 12 deals em progresso...", category: "Marketing", catColor: "var(--cat-marketing)", time: "6h", unread: false, hasDraft: false },
  { id: "8", sender: "Marina Souza", subject: "Pode revisar esse wireframe?", snippet: "Acabei o wireframe do novo fluxo de onboarding. Tá no Figma...", category: "Responder", catColor: "var(--cat-respond)", time: "8h", unread: false, hasDraft: true },
];

interface EmailListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function EmailList({ selectedId, onSelect }: EmailListProps) {
  const unread = MOCK_EMAILS.filter(e => e.unread);
  const read = MOCK_EMAILS.filter(e => !e.unread);

  return (
    <div className="w-[380px] h-screen border-r border-border flex flex-col shrink-0 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <h2 className="font-display text-lg text-foreground">Inbox</h2>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors active:scale-95">
            <Filter className="w-3.5 h-3.5" />
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-primary bg-primary/10 hover:bg-primary/15 transition-colors active:scale-95">
            <RefreshCw className="w-3 h-3" />
            Processar
          </button>
        </div>
      </div>

      {/* Email sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Unread */}
        {unread.length > 0 && (
          <div>
            <div className="px-4 py-2">
              <span className="text-[10px] font-label text-muted-foreground/60 uppercase tracking-wider">
                Não lidos · {unread.length}
              </span>
            </div>
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.05 } },
              }}
            >
              {unread.map((email) => (
                <EmailRow
                  key={email.id}
                  email={email}
                  selected={selectedId === email.id}
                  onSelect={onSelect}
                />
              ))}
            </motion.div>
          </div>
        )}

        {/* Read */}
        <div>
          <div className="px-4 py-2 mt-2">
            <span className="text-[10px] font-label text-muted-foreground/60 uppercase tracking-wider">
              Tudo mais
            </span>
          </div>
          {read.map((email) => (
            <EmailRow
              key={email.id}
              email={email}
              selected={selectedId === email.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function EmailRow({
  email,
  selected,
  onSelect,
}: {
  email: EmailRowData;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <motion.button
      variants={{
        hidden: { opacity: 0, x: -8 },
        show: { opacity: 1, x: 0 },
      }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onSelect(email.id)}
      className={`w-full text-left px-4 py-3 flex gap-3 transition-all duration-150 cursor-pointer group ${
        selected
          ? "bg-surface border-l-2"
          : "hover:bg-surface-hover border-l-2 border-l-transparent"
      }`}
      style={selected ? { borderLeftColor: `hsl(${email.catColor})` } : undefined}
    >
      {/* Unread dot */}
      <div className="pt-1.5 shrink-0">
        {email.unread ? (
          <div className="w-2 h-2 rounded-full bg-primary" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-transparent" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-xs truncate ${
              email.unread ? "text-foreground font-semibold" : "text-foreground/80"
            }`}
          >
            {email.sender}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {email.hasDraft && (
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
            )}
            <span
              className="text-[9px] font-label px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: `hsl(${email.catColor} / 0.12)`,
                color: `hsl(${email.catColor})`,
              }}
            >
              {email.category}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-foreground/70 truncate mt-0.5">{email.subject}</p>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{email.snippet}</p>
      </div>

      {/* Time */}
      <span className="text-[10px] font-label text-muted-foreground/50 shrink-0 pt-0.5">
        {email.time}
      </span>
    </motion.button>
  );
}
