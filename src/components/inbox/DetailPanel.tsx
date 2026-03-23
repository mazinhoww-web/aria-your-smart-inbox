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
} from "lucide-react";

interface DetailPanelProps {
  emailId: string | null;
}

const MOCK_DETAIL = {
  subject: "Proposta revisada — preciso da sua aprovação",
  sender: "Carolina Mendes",
  senderEmail: "carolina@empresa.com",
  date: "23 Mar 2026, 09:42",
  category: "Responder",
  catColor: "var(--cat-respond)",
  body: `<p>Oi!</p>
<p>Segue a versão atualizada da proposta comercial. Fiz as alterações que discutimos na última call:</p>
<ul>
<li>Ajustei o escopo do módulo de relatórios</li>
<li>Incluí a fase de treinamento no timeline</li>
<li>Revisei os valores conforme o novo budget</li>
</ul>
<p>Quando puder dar uma olhada e me dar o ok, agradeço. O cliente precisa de uma resposta até quinta-feira.</p>
<p>Abs,<br/>Carolina</p>`,
  draft: `Oi Carolina,

Revisei a proposta — ficou ótima. Aprovado da minha parte.

Só um detalhe: vale confirmar com o Thiago se o timeline do treinamento está alinhado com a disponibilidade da equipe dele.

Pode seguir com o envio ao cliente.

Abs`,
};

export function DetailPanel({ emailId }: DetailPanelProps) {
  if (!emailId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Inbox className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground/40">
            Selecione um e-mail para ver o conteúdo
          </p>
          <p className="text-[11px] text-muted-foreground/25 mt-1.5 font-label">
            ou pressione <kbd className="px-1.5 py-0.5 bg-surface rounded text-[10px]">E</kbd> para processar novos e-mails
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      key={emailId}
      initial={{ opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 overflow-y-auto"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-border-subtle">
        <h2 className="font-display text-xl text-foreground leading-snug">
          {MOCK_DETAIL.subject}
        </h2>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-xs font-medium text-foreground">
              CM
            </div>
            <div>
              <span className="text-xs text-foreground font-medium">
                {MOCK_DETAIL.sender}
              </span>
              <span className="text-xs text-muted-foreground ml-1.5">
                · {MOCK_DETAIL.senderEmail}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-label text-muted-foreground/60">
            {MOCK_DETAIL.date}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span
            className="text-[10px] font-label px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `hsl(${MOCK_DETAIL.catColor} / 0.12)`,
              color: `hsl(${MOCK_DETAIL.catColor})`,
              boxShadow: `0 0 6px hsl(${MOCK_DETAIL.catColor} / 0.2)`,
            }}
          >
            {MOCK_DETAIL.category}
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
      <div
        className="px-6 py-5 text-sm text-foreground/80 leading-relaxed prose-sm max-w-none
          [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:pl-5 [&_li]:list-disc [&_li]:text-foreground/70"
        dangerouslySetInnerHTML={{ __html: MOCK_DETAIL.body }}
      />

      {/* Draft Panel */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="mx-6 mb-6 rounded-lg border border-primary/20 bg-primary/[0.04] overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-primary/10">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-primary font-medium">Rascunho gerado por ARIA</span>
          <span className="text-[10px] text-muted-foreground">baseado no seu estilo</span>
        </div>
        <div className="px-4 py-4">
          <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">
            {MOCK_DETAIL.draft}
          </pre>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 border-t border-primary/10 bg-primary/[0.02]">
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-surface-hover transition-colors active:scale-95">
            <RotateCcw className="w-3 h-3" />
            Regenerar
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-surface-hover transition-colors active:scale-95">
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
    </motion.div>
  );
}
