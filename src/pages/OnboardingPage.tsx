import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Tag, Pen, CheckCircle2, Loader2, ArrowRight, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAriaStore } from "@/store/useAriaStore";

const STEPS = [
  { icon: Mail, title: "Conectar Gmail", desc: "Autorize o acesso para ler, organizar e rascunhar e-mails." },
  { icon: Tag, title: "Configurar categorias", desc: "Criando labels para organizar sua inbox automaticamente." },
  { icon: Pen, title: "Aprender seu estilo", desc: "Analisando seus e-mails enviados para gerar rascunhos no seu tom." },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { loadProfile } = useAriaStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    setStatusMsg("Buscando labels existentes...");
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 800));
      setStatusMsg("Criando categorias ARIA...");
      const res = await supabase.functions.invoke("setup-labels");
      if (res.error) throw new Error(res.error.message);
      setStatusMsg("Categorias configuradas!");
      await new Promise((r) => setTimeout(r, 600));
      runAnalyzeStyle();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const runAnalyzeStyle = async () => {
    setStep(2);
    setLoading(true);
    setStatusMsg("Lendo seus e-mails enviados...");
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      setStatusMsg("Identificando seu tom de escrita...");
      const res = await supabase.functions.invoke("analyze-style");
      if (res.error) throw new Error(res.error.message);
      setStatusMsg("Perfil de estilo criado!");
      await new Promise((r) => setTimeout(r, 800));
      await loadProfile();
      navigate("/inbox");
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="grain min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-10">
          {STEPS.map((_, i) => (
            <div key={i} className="flex-1 flex items-center gap-2">
              <div
                className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                  i <= step ? "bg-primary" : "bg-border"
                }`}
              />
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
              {(() => {
                const StepIcon = STEPS[step].icon;
                return <StepIcon className="w-6 h-6 text-primary" />;
              })()}
            </div>

            {/* Title */}
            <div>
              <h1 className="font-display text-2xl text-foreground">
                {STEPS[step].title}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {STEPS[step].desc}
              </p>
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

            {/* Steps 1-2: Loading states */}
            {(step > 0 || loading) && loading && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-surface">
                <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                <span className="text-sm text-foreground">{statusMsg}</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                  {error}
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
