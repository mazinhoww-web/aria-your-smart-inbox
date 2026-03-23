import { motion } from "framer-motion";
import { RefreshCw, Filter, Loader2, CheckCircle2, FileText } from "lucide-react";
import { useAriaStore, CATEGORY_MAP } from "@/store/useAriaStore";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";

const CAT_COLORS: Record<string, string> = {
  to_respond: "var(--cat-respond)",
  fyi: "var(--cat-fyi)",
  comment: "var(--cat-comment)",
  notification: "var(--cat-notification)",
  meeting_update: "var(--cat-meeting)",
  awaiting_reply: "var(--cat-awaiting)",
  actioned: "var(--cat-actioned)",
  marketing: "var(--cat-marketing)",
};

export function EmailList() {
  const { emails, selectedEmailId, selectEmail, processInbox, isProcessing, processingStatus, processingStats } = useAriaStore();

  // Show toast on processing complete/error
  useEffect(() => {
    if (processingStatus.state === "complete" && processingStats) {
      const entries = Object.entries(processingStats);
      const desc = entries.map(([k, v]) => `${CATEGORY_MAP[k] ?? k}: ${v}`).join(" · ");
      toast({
        title: `✅ ${processingStatus.message}`,
        description: desc || "Nenhum e-mail novo encontrado.",
      });
    } else if (processingStatus.state === "error") {
      toast({
        title: "Erro ao processar",
        description: processingStatus.error ?? "Tente novamente.",
        variant: "destructive",
      });
    }
  }, [processingStatus.state]);

  const unread = emails.filter((e) => e.is_unread);
  const read = emails.filter((e) => !e.is_unread);

  return (
    <div className="w-[380px] h-screen border-r border-border flex flex-col shrink-0 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <h2 className="font-display text-lg text-foreground">Inbox</h2>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors active:scale-95">
            <Filter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => processInbox()}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-primary bg-primary/10 hover:bg-primary/15 transition-colors active:scale-95 disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            {isProcessing ? "Processando..." : "Processar"}
          </button>
        </div>
      </div>

      {/* Processing status bar */}
      {isProcessing && (
        <div className="px-4 py-2 border-b border-border-subtle bg-primary/5">
          <p className="text-[10px] text-primary font-label">{processingStatus.message}</p>
        </div>
      )}

      {/* Email sections */}
      <div className="flex-1 overflow-y-auto">
        {emails.length === 0 && !isProcessing && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-6">
              <p className="text-sm text-muted-foreground/40">Nenhum e-mail processado</p>
              <p className="text-[11px] text-muted-foreground/25 mt-1.5">Clique em "Processar" para classificar sua inbox</p>
            </div>
          </div>
        )}

        {unread.length > 0 && (
          <div>
            <div className="px-4 py-2">
              <span className="text-[10px] font-label text-muted-foreground/60 uppercase tracking-wider">Não lidos · {unread.length}</span>
            </div>
            <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}>
              {unread.map((email) => (
                <EmailRow key={email.id} email={email} selected={selectedEmailId === email.id} onSelect={selectEmail} />
              ))}
            </motion.div>
          </div>
        )}

        {read.length > 0 && (
          <div>
            <div className="px-4 py-2 mt-2">
              <span className="text-[10px] font-label text-muted-foreground/60 uppercase tracking-wider">Tudo mais</span>
            </div>
            {read.map((email) => (
              <EmailRow key={email.id} email={email} selected={selectedEmailId === email.id} onSelect={selectEmail} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmailRow({ email, selected, onSelect }: {
  email: { id: string; sender_name: string | null; subject: string | null; snippet: string | null; category: string; is_unread: boolean | null; has_draft: boolean | null; received_at: string | null };
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const catColor = CAT_COLORS[email.category] ?? "var(--cat-fyi)";
  const catLabel = CATEGORY_MAP[email.category] ?? email.category;
  const timeAgo = email.received_at ? formatDistanceToNow(new Date(email.received_at), { addSuffix: false, locale: ptBR }) : "";

  return (
    <motion.button
      variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onSelect(email.id)}
      className={`w-full text-left px-4 py-3 flex gap-3 transition-all duration-150 cursor-pointer group ${
        selected ? "bg-surface border-l-2" : "hover:bg-surface-hover border-l-2 border-l-transparent"
      }`}
      style={selected ? { borderLeftColor: `hsl(${catColor})` } : undefined}
    >
      <div className="pt-1.5 shrink-0">
        {email.is_unread ? <div className="w-2 h-2 rounded-full bg-primary" /> : <div className="w-2 h-2 rounded-full bg-transparent" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs truncate ${email.is_unread ? "text-foreground font-semibold" : "text-foreground/80"}`}>
            {email.sender_name ?? "Desconhecido"}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {email.has_draft && (
              <div className="flex items-center gap-1 text-[9px] font-label text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                <FileText className="w-2.5 h-2.5" />
                Draft no Gmail
              </div>
            )}
            <span className="text-[9px] font-label px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `hsl(${catColor} / 0.12)`, color: `hsl(${catColor})` }}>
              {catLabel}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-foreground/70 truncate mt-0.5">{email.subject}</p>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{email.snippet}</p>
      </div>
      <span className="text-[10px] font-label text-muted-foreground/50 shrink-0 pt-0.5">{timeAgo}</span>
    </motion.button>
  );
}
