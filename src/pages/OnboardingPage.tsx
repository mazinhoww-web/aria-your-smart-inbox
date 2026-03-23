import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Tag, Pen, Loader2, ArrowRight, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAriaStore } from "@/store/useAriaStore";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

const STEPS = [
  { icon: Mail, title: "Conectar Gmail", desc: "Autorize o acesso para ler, organizar e rascunhar e-mails." },
  { icon: Tag, title: "Configurar categorias", desc: "Criando labels para organizar sua inbox automaticamente." },
  { icon: Pen, title: "Aprender seu estilo", desc: "Analisando seus e-mails enviados para gerar rascunhos no seu tom." },
];

const LABEL_SUBSTEPS = [
  "Conectando ao Gmail...",
  "Buscando labels existentes...",
  "Criando categorias ARIA...",
  "Salvando configuração...",
];

const STYLE_SUBSTEPS = [
  "Conectando ao Gmail...",
  "Buscando e-mails enviados...",
  "Analisando tom de escrita...",
  "Identificando padrões...",
  "Calibrando vocabulário...",
  "Criando perfil de estilo...",
];

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { loadProfile } = useAriaStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2 progress
  const [labelProgress, setLabelProgress] = useState(0);
  const [labelSubsteps, setLabelSubsteps] = useState<{ text: string; done: boolean }[]>([]);

  // Step 3 progress
  const [styleProgress, setStyleProgress] = useState(0);
  const [styleSubsteps, setStyleSubsteps] = useState<{ text: string; done: boolean }[]>([]);
  const [styleEta, setStyleEta] = useState("");
  const [styleStartTime, setStyleStartTime] = useState<number | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/"); return; }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("gmail_connected, label_mapping, style_analyzed_at")
        .eq("id", session.user.id)
        .single();

      if (profile?.gmail_connected && profile?.label_mapping && profile?.style_analyzed_at) {
        navigate("/inbox");
        return;
      }

      if (profile?.gmail_connected && profile?.label_mapping) {
        setStep(2);
      } else if (profile?.gmail_connected) {
        setStep(1);
        runSetupLabels();
      }
    };
    checkAuth();
  }, []);

  const handleGmailAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await supabase.functions.invoke("get-gmail-auth-url", {
        body: { redirect_uri: `${window.location.origin}/auth/gmail-callback` },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.auth_url) {
        window.location.href = res.data.auth_url;
      } else {
        throw new Error("Failed to get auth URL");
      }
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const runSetupLabels = async () => {
    setStep(1);
    setLoading(true);
    setError(null);
    setLabelProgress(0);
    setLabelSubsteps(LABEL_SUBSTEPS.map((t) => ({ text: t, done: false })));

    const advanceLabel = (idx: number) => {
      setLabelProgress(Math.round(((idx + 1) / LABEL_SUBSTEPS.length) * 100));
      setLabelSubsteps((prev) => prev.map((s, i) => (i <= idx ? { ...s, done: true } : s)));
    };

    try {
      advanceLabel(0);
      await new Promise((r) => setTimeout(r, 600));

      advanceLabel(1);
      await new Promise((r) => setTimeout(r, 500));

      advanceLabel(2);
      const res = await retryWithBackoff(() => supabase.functions.invoke("setup-labels"));
      if (res.error) throw new Error(res.error.message);

      advanceLabel(3);
      await new Promise((r) => setTimeout(r, 400));

      toast({ title: "Categorias configuradas!", description: "Labels criados com sucesso no Gmail." });
      runAnalyzeStyle();
    } catch (err) {
      setError(`Falha ao configurar categorias: ${(err as Error).message}`);
      setLoading(false);
    }
  };

  const runAnalyzeStyle = async () => {
    setStep(2);
    setLoading(true);
    setError(null);
    setStyleProgress(0);
    setStyleSubsteps(STYLE_SUBSTEPS.map((t) => ({ text: t, done: false })));
    const startTime = Date.now();
    setStyleStartTime(startTime);
    setStyleEta("calculando...");

    const advanceStyle = (idx: number) => {
      const pct = Math.round(((idx + 1) / STYLE_SUBSTEPS.length) * 100);
      setStyleProgress(pct);
      setStyleSubsteps((prev) => prev.map((s, i) => (i <= idx ? { ...s, done: true } : s)));

      // ETA calculation
      const elapsed = (Date.now() - startTime) / 1000;
      if (pct > 0 && pct < 100) {
        const totalEstimate = (elapsed / pct) * 100;
        const remaining = Math.max(0, totalEstimate - elapsed);
        if (remaining > 60) {
          setStyleEta(`~${Math.ceil(remaining / 60)}min`);
        } else {
          setStyleEta(`~${Math.ceil(remaining)}s`);
        }
      }
    };

    try {
      advanceStyle(0);
      await new Promise((r) => setTimeout(r, 800));

      advanceStyle(1);
      await new Promise((r) => setTimeout(r, 600));

      advanceStyle(2);
      const res = await retryWithBackoff(() => supabase.functions.invoke("analyze-style"));
      if (res.error) throw new Error(res.error.message);

      advanceStyle(3);
      await new Promise((r) => setTimeout(r, 400));

      advanceStyle(4);
      await new Promise((r) => setTimeout(r, 300));

      advanceStyle(5);
      setStyleEta("");

      toast({ title: "Perfil de estilo criado!", description: "ARIA aprendeu como você escreve." });
      await loadProfile();
      await new Promise((r) => setTimeout(r, 500));
      navigate("/inbox");
    } catch (err) {
      setError(`Falha ao analisar estilo: ${(err as Error).message}`);
      setLoading(false);
    }
  };

  return (
    <div className="grain min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-10">
          {STEPS.map((_, i) => (
            <div key={i} className="flex-1">
              <div className={`h-1 rounded-full transition-colors duration-500 ${i <= step ? "bg-primary" : "bg-border"}`} />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              {(() => { const StepIcon = STEPS[step].icon; return <StepIcon className="w-6 h-6 text-primary" />; })()}
            </div>

            {/* Title */}
            <div>
              <h1 className="font-display text-2xl text-foreground">{STEPS[step].title}</h1>
              <p className="text-sm text-muted-foreground mt-2">{STEPS[step].desc}</p>
            </div>

            {/* Step 0: Gmail Auth */}
            {step === 0 && !loading && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-surface text-xs text-muted-foreground">
                  <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Seus dados ficam criptografados e nunca são compartilhados com terceiros.</span>
                </div>
                <button
                  onClick={handleGmailAuth}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-foreground text-background text-sm font-medium transition-all hover:shadow-lg active:scale-[0.97]"
                >
                  <Mail className="w-4 h-4" />
                  Autorizar Gmail
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            )}

            {/* Step 0 loading */}
            {step === 0 && loading && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-surface">
                <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                <span className="text-sm text-foreground">Redirecionando para o Google...</span>
              </div>
            )}

            {/* Step 1: Setup Labels with detailed progress */}
            {step === 1 && loading && (
              <div className="space-y-4">
                <Progress value={labelProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">{labelProgress}%</p>
                <div className="space-y-2">
                  {labelSubsteps.map((sub, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs">
                      {sub.done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--cat-notification))] shrink-0" />
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 text-muted-foreground/40 animate-spin shrink-0" />
                      )}
                      <span className={sub.done ? "text-foreground" : "text-muted-foreground/60"}>{sub.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Analyze Style with detailed progress + ETA */}
            {step === 2 && loading && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Progress value={styleProgress} className="h-2 flex-1 mr-3" />
                  <span className="text-xs text-muted-foreground shrink-0">{styleProgress}%</span>
                </div>
                {styleEta && (
                  <p className="text-[10px] text-muted-foreground/60 text-right">Tempo restante: {styleEta}</p>
                )}
                <div className="space-y-2">
                  {styleSubsteps.map((sub, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs">
                      {sub.done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--cat-notification))] shrink-0" />
                      ) : i === styleSubsteps.findIndex((s) => !s.done) ? (
                        <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-border shrink-0" />
                      )}
                      <span className={sub.done ? "text-foreground" : i === styleSubsteps.findIndex((s) => !s.done) ? "text-foreground/80" : "text-muted-foreground/40"}>
                        {sub.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
                <button
                  onClick={() => {
                    setError(null);
                    if (step === 1) runSetupLabels();
                    else if (step === 2) runAnalyzeStyle();
                  }}
                  className="px-4 py-2 rounded-md text-xs bg-surface text-foreground hover:bg-surface-hover transition-colors"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {/* Skip for step 2 */}
            {step === 2 && !loading && !error && (
              <button
                onClick={() => navigate("/inbox")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Pular e configurar depois →
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
