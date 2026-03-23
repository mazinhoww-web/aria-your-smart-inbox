import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Archive,
  Clock,
  Trash2,
  CornerUpLeft,
  Sparkles,
  RotateCcw,
  X,
  Send,
  Inbox,
  Loader2,
} from "lucide-react";
import { useAriaStore, CATEGORY_MAP } from "@/store/useAriaStore";

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

export function DetailPanel() {
  const {
    emails,
    selectedEmailId,
    activeDraft,
    isDraftLoading,
    loadDraft,
    generateDraft,
    discardDraft,
  } = useAriaStore();

  const email = emails.find((e) => e.id === selectedEmailId);

  useEffect(() => {
    if (email?.has_draft && email.gmail_message_id) {
      loadDraft(email.gmail_message_id);
    }
  }, [selectedEmailId]);

  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Inbox className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground/40">
            Selecione um e-mail para ver o conteúdo
          </p>
          <p className="text-[11px] text-muted-foreground/25 mt-1.5 font-label">
            ou pressione{" "}
            <kbd className="px-1.5 py-0.5 bg-surface rounded text-[10px]">
              E
            </kbd>{" "}
            para processar novos e-mails
          </p>
        </div>
      </div>
    );
  }

  const catColor = CAT_COLORS[email.category] ?? "var(--cat-fyi)";
  const catLabel = CATEGORY_MAP[email.category] ?? email.category;
  const initials =
    email.sender_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  const formattedDate = email.received_at
    ? new Date(email.received_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <motion.div
      key={selectedEmailId}
      initial={{ opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 overflow-y-auto"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-border-subtle">
        <h2 className="font-display text-xl text-foreground leading-snug">
          {email.subject}
        </h2>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-xs font-medium text-foreground">
              {initials}
            </div>
            <div>
              <span className="text-xs text-foreground font-medium">
                {email.sender_name}
              </span>
              <span className="text-xs text-muted-foreground ml-1.5">
                · {email.sender_email}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-label text-muted-foreground/60">
            {formattedDate}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span
            className="text-[10px] font-label px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `hsl(${catColor} / 0.12)`,
              color: `hsl(${catColor})`,
              boxShadow: `0 0 6px hsl(${catColor} / 0.2)`,
            }}
          >
            {catLabel}
          </span>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            {[
              { icon: CornerUpLeft, label: "Responder" },
              { icon: Archive, label: "Arquivar" },
              { icon: Clock, label: "Snooze" },
              { icon: Trash2, label: "Lixeira" },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                title={label}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors active:scale-95"
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 text-sm text-foreground/80 leading-relaxed">
        <p>{email.snippet}</p>
      </div>

      {/* Draft Panel */}
      {activeDraft && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mx-6 mb-6 rounded-lg border border-primary/20 bg-primary/[0.04] overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-primary/10">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-primary font-medium">
              Rascunho gerado por ARIA
            </span>
            <span className="text-[10px] text-muted-foreground">
              baseado no seu estilo
            </span>
          </div>
          <div className="px-4 py-4">
            <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">
              {activeDraft.draft_body}
            </pre>
          </div>
          <div className="flex items-center gap-2 px-4 py-3 border-t border-primary/10 bg-primary/[0.02]">
            <button
              onClick={() =>
                generateDraft(email.gmail_message_id, email.gmail_thread_id)
              }
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-surface-hover transition-colors active:scale-95"
            >
              <RotateCcw className="w-3 h-3" />
              Regenerar
            </button>
            <button
              onClick={() => discardDraft(activeDraft.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-surface-hover transition-colors active:scale-95"
            >
              <X className="w-3 h-3" />
              Descartar
            </button>
            <div className="flex-1" />
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-95 font-medium">
              <Send className="w-3 h-3" />
              Enviar
              <kbd className="text-[9px] font-label opacity-70 ml-1">⌘↵</kbd>
            </button>
          </div>
        </motion.div>
      )}

      {/* Generate draft button */}
      {!activeDraft && !isDraftLoading && (
        <div className="px-6 pb-6">
          <button
            onClick={() =>
              generateDraft(email.gmail_message_id, email.gmail_thread_id)
            }
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs border border-primary/20 text-primary hover:bg-primary/5 transition-colors w-full justify-center"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Gerar rascunho com ARIA
          </button>
        </div>
      )}

      {/* Loading draft */}
      {isDraftLoading && (
        <div className="px-6 pb-6 flex justify-center">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Gerando rascunho...
          </div>
        </div>
      )}
    </motion.div>
  );
}
