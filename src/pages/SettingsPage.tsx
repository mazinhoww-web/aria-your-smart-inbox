import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Brain, Sparkles, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAriaStore, CATEGORY_MAP } from "@/store/useAriaStore";
import { supabase } from "@/integrations/supabase/client";
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

export default function SettingsPage() {
  const navigate = useNavigate();
  const { profile, loadProfile, updateProfile } = useAriaStore();
  const [anthropicKey, setAnthropicKey] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profile?.anthropic_api_key) {
      setAnthropicKey(profile.anthropic_api_key);
    }
  }, [profile]);

  const handleProviderChange = async (useAnthropic: boolean) => {
    if (useAnthropic && !anthropicKey) {
      toast({
        title: "Chave necessária",
        description: "Insira sua chave da Anthropic antes de ativar.",
        variant: "destructive",
      });
      return;
    }
    await updateProfile({
      ai_provider: useAnthropic ? "anthropic" : "lovable",
    });
    toast({
      title: "Provedor atualizado",
      description: useAnthropic
        ? "Usando Anthropic Claude"
        : "Usando ARIA AI (padrão)",
    });
  };

  const handleSaveKey = async () => {
    setSaving(true);
    try {
      await updateProfile({ anthropic_api_key: anthropicKey || null } as any);
      toast({ title: "Chave salva com sucesso" });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isAnthropic = profile?.ai_provider === "anthropic";

  return (
    <div className="grain min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate("/inbox")}
            className="p-2 rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-display text-2xl text-foreground">
            Configurações
          </h1>
        </div>

        <Tabs defaultValue="ai" className="space-y-6">
          <TabsList className="bg-surface border border-border">
            <TabsTrigger value="ai" className="text-xs">
              <Brain className="w-3.5 h-3.5 mr-1.5" />
              Inteligência
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-xs">
              Categorias
            </TabsTrigger>
            <TabsTrigger value="account" className="text-xs">
              Conta
            </TabsTrigger>
          </TabsList>

          {/* AI Provider Tab */}
          <TabsContent value="ai" className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-5 space-y-5">
              <div>
                <h3 className="text-sm font-medium text-foreground mb-1">
                  Provedor de IA
                </h3>
                <p className="text-xs text-muted-foreground">
                  Escolha qual modelo de IA classifica e-mails e gera
                  rascunhos.
                </p>
              </div>

              {/* Default provider */}
              <div
                className={`rounded-lg border p-4 transition-colors ${
                  !isAnthropic
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        ARIA AI
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Padrão · Sem configuração necessária
                      </p>
                    </div>
                  </div>
                  {!isAnthropic && (
                    <span className="text-[10px] font-label text-primary px-2 py-0.5 rounded-full bg-primary/10">
                      Ativo
                    </span>
                  )}
                </div>
              </div>

              {/* Anthropic provider */}
              <div
                className={`rounded-lg border p-4 transition-colors ${
                  isAnthropic
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-surface flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-foreground/70" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Anthropic Claude
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Requer sua chave API
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isAnthropic}
                    onCheckedChange={handleProviderChange}
                  />
                </div>

                <div className="space-y-3 pt-2 border-t border-border-subtle">
                  <div>
                    <Label
                      htmlFor="anthropic-key"
                      className="text-xs text-muted-foreground"
                    >
                      Chave API da Anthropic
                    </Label>
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        id="anthropic-key"
                        type="password"
                        placeholder="sk-ant-..."
                        value={anthropicKey}
                        onChange={(e) => setAnthropicKey(e.target.value)}
                        className="text-xs bg-surface border-border font-mono"
                      />
                      <button
                        onClick={handleSaveKey}
                        disabled={saving}
                        className="px-3 py-2 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
                      >
                        {saving ? "..." : "Salvar"}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                      Sua chave é armazenada de forma segura e usada apenas para
                      chamadas de classificação e geração de rascunhos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-medium text-foreground mb-1">
                Categorias
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                As 8 categorias usadas pela ARIA para classificar seus e-mails.
              </p>
              <div className="space-y-2">
                {Object.entries(CATEGORY_MAP).map(([key, label]) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-surface"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: `hsl(${CAT_COLORS[key]})`,
                      }}
                    />
                    <span className="text-xs text-foreground flex-1">
                      {label}
                    </span>
                    <span className="text-[10px] font-label text-muted-foreground">
                      {key}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-foreground mb-1">
                  Conta
                </h3>
                <p className="text-xs text-muted-foreground">
                  {profile?.email ?? "Carregando..."}
                </p>
              </div>

              {profile && (
                <div className="flex items-center gap-3 px-3 py-3 rounded-md bg-surface">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {profile.display_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() ?? "U"}
                  </div>
                  <div>
                    <p className="text-xs text-foreground font-medium">
                      {profile.display_name ?? "Usuário"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {profile.email}
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={handleSignOut}
                className="w-full px-3 py-2 text-xs rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
              >
                Sair da conta
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
