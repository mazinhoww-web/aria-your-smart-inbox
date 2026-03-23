import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Brain, Sparkles, Zap, Plus, Trash2, Edit2, Save, X, Mail, CheckCircle2, Settings2, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface Snippet {
  id: string;
  trigger_text: string;
  content: string;
  use_count: number | null;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { profile, loadProfile, updateProfile } = useAriaStore();
  const [anthropicKey, setAnthropicKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [editingSnippet, setEditingSnippet] = useState<string | null>(null);
  const [newSnippet, setNewSnippet] = useState({ trigger_text: "", content: "" });
  const [showAddSnippet, setShowAddSnippet] = useState(false);

  // Gmail tab state
  const [customInstructions, setCustomInstructions] = useState("");
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    loadProfile();
    loadSnippets();
  }, []);

  useEffect(() => {
    if (profile?.anthropic_api_key) setAnthropicKey(profile.anthropic_api_key);
    if (profile?.custom_instructions) setCustomInstructions(profile.custom_instructions);
  }, [profile]);

  const loadSnippets = async () => {
    const { data } = await supabase.from("snippets").select("*").order("created_at", { ascending: true });
    if (data) setSnippets(data as Snippet[]);
  };

  const handleProviderChange = async (useAnthropic: boolean) => {
    if (useAnthropic && !anthropicKey) {
      toast({ title: "Chave necessária", description: "Insira sua chave da Anthropic antes de ativar.", variant: "destructive" });
      return;
    }
    await updateProfile({ ai_provider: useAnthropic ? "anthropic" : "lovable" });
    toast({ title: "Provedor atualizado", description: useAnthropic ? "Usando Anthropic Claude" : "Usando ARIA AI (padrão)" });
  };

  const handleSaveKey = async () => {
    setSaving(true);
    try {
      await updateProfile({ anthropic_api_key: anthropicKey || null } as any);
      toast({ title: "Chave salva com sucesso" });
    } finally { setSaving(false); }
  };

  const handleAddSnippet = async () => {
    if (!newSnippet.trigger_text || !newSnippet.content) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("snippets").insert({ user_id: user.id, trigger_text: newSnippet.trigger_text, content: newSnippet.content });
    setNewSnippet({ trigger_text: "", content: "" });
    setShowAddSnippet(false);
    loadSnippets();
    toast({ title: "Snippet criado" });
  };

  const handleUpdateSnippet = async (id: string, trigger_text: string, content: string) => {
    await supabase.from("snippets").update({ trigger_text, content }).eq("id", id);
    setEditingSnippet(null);
    loadSnippets();
    toast({ title: "Snippet atualizado" });
  };

  const handleDeleteSnippet = async (id: string) => {
    await supabase.from("snippets").delete().eq("id", id);
    loadSnippets();
    toast({ title: "Snippet removido" });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleSaveInstructions = async () => {
    setSavingInstructions(true);
    try {
      await updateProfile({ custom_instructions: customInstructions });
      toast({ title: "Instruções salvas", description: "Suas instruções personalizadas foram atualizadas." });
    } catch {
      toast({ title: "Erro", description: "Falha ao salvar instruções.", variant: "destructive" });
    } finally { setSavingInstructions(false); }
  };

  const handleDisconnectGmail = async () => {
    setDisconnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("user_profiles").update({
        gmail_access_token: null,
        gmail_refresh_token: null,
        gmail_token_expiry: null,
        gmail_connected: false,
        label_mapping: {},
        style_analyzed_at: null,
        style_profile: {},
      }).eq("id", user.id);
      await loadProfile();
      toast({ title: "Gmail desconectado", description: "Você pode reconectar a qualquer momento." });
    } catch {
      toast({ title: "Erro", description: "Falha ao desconectar Gmail.", variant: "destructive" });
    } finally { setDisconnecting(false); }
  };

  const isAnthropic = profile?.ai_provider === "anthropic";

  return (
    <div className="grain min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/inbox")} className="p-2 rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-display text-2xl text-foreground">Configurações</h1>
        </div>

        <Tabs defaultValue="ai" className="space-y-6">
          <TabsList className="bg-surface border border-border">
            <TabsTrigger value="ai" className="text-xs"><Brain className="w-3.5 h-3.5 mr-1.5" />Inteligência</TabsTrigger>
            <TabsTrigger value="gmail" className="text-xs"><Mail className="w-3.5 h-3.5 mr-1.5" />Gmail</TabsTrigger>
            <TabsTrigger value="categories" className="text-xs">Categorias</TabsTrigger>
            <TabsTrigger value="snippets" className="text-xs">Snippets</TabsTrigger>
            <TabsTrigger value="account" className="text-xs">Conta</TabsTrigger>
          </TabsList>

          {/* AI Provider Tab */}
          <TabsContent value="ai" className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-5 space-y-5">
              <div>
                <h3 className="text-sm font-medium text-foreground mb-1">Provedor de IA</h3>
                <p className="text-xs text-muted-foreground">Escolha qual modelo classifica e-mails e gera rascunhos.</p>
              </div>
              <div className={`rounded-lg border p-4 transition-colors ${!isAnthropic ? "border-primary bg-primary/5" : "border-border"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center"><Zap className="w-4 h-4 text-primary" /></div>
                    <div>
                      <p className="text-sm font-medium text-foreground">ARIA AI</p>
                      <p className="text-[11px] text-muted-foreground">Padrão · Sem configuração necessária</p>
                    </div>
                  </div>
                  {!isAnthropic && <span className="text-[10px] font-label text-primary px-2 py-0.5 rounded-full bg-primary/10">Ativo</span>}
                </div>
              </div>
              <div className={`rounded-lg border p-4 transition-colors ${isAnthropic ? "border-primary bg-primary/5" : "border-border"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-surface flex items-center justify-center"><Sparkles className="w-4 h-4 text-foreground/70" /></div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Anthropic Claude</p>
                      <p className="text-[11px] text-muted-foreground">Requer sua chave API</p>
                    </div>
                  </div>
                  <Switch checked={isAnthropic} onCheckedChange={handleProviderChange} />
                </div>
                <div className="space-y-3 pt-2 border-t border-border-subtle">
                  <div>
                    <Label htmlFor="anthropic-key" className="text-xs text-muted-foreground">Chave API da Anthropic</Label>
                    <div className="flex gap-2 mt-1.5">
                      <Input id="anthropic-key" type="password" placeholder="sk-ant-..." value={anthropicKey} onChange={(e) => setAnthropicKey(e.target.value)} className="text-xs bg-surface border-border font-mono" />
                      <button onClick={handleSaveKey} disabled={saving} className="px-3 py-2 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0">
                        {saving ? "..." : "Salvar"}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">Sua chave é armazenada de forma segura.</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Gmail Tab */}
          <TabsContent value="gmail" className="space-y-4">
            {/* Connection Status */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-sm font-medium text-foreground">Conexão Gmail</h3>
              <div className="flex items-center gap-3 px-3 py-3 rounded-md bg-surface">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-foreground font-medium">
                    {profile?.gmail_connected ? "Gmail conectado" : "Gmail não conectado"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {profile?.gmail_connected
                      ? "Leitura, classificação e rascunhos ativos"
                      : "Conecte para ativar automação de e-mails"}
                  </p>
                </div>
                {profile?.gmail_connected ? (
                  <CheckCircle2 className="w-4 h-4 text-[hsl(var(--cat-notification))]" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-[hsl(var(--cat-fyi))]" />
                )}
              </div>
              <div className="flex gap-2">
                {profile?.gmail_connected ? (
                  <>
                    <button onClick={() => navigate("/onboarding")} className="px-3 py-2 text-xs rounded-md bg-surface text-foreground hover:bg-surface-hover transition-colors border border-border">
                      Reconectar
                    </button>
                    <button onClick={handleDisconnectGmail} disabled={disconnecting} className="px-3 py-2 text-xs rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
                      {disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Desconectar"}
                    </button>
                  </>
                ) : (
                  <button onClick={() => navigate("/onboarding")} className="px-3 py-2 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    Conectar Gmail
                  </button>
                )}
              </div>
            </div>

            {/* Custom Instructions */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-foreground mb-1">Instruções Personalizadas</h3>
                <p className="text-xs text-muted-foreground">Regras customizadas para classificação e geração de rascunhos.</p>
              </div>
              <Textarea
                placeholder="Ex: 'Sempre marque emails de clientes@empresa.com como Responder'. Emails do meu chefe são sempre prioritários."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="text-xs bg-surface border-border min-h-[100px] resize-none"
              />
              <button
                onClick={handleSaveInstructions}
                disabled={savingInstructions}
                className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {savingInstructions ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Salvar Instruções
              </button>
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-medium text-foreground mb-1">Categorias</h3>
              <p className="text-xs text-muted-foreground mb-4">As 8 categorias usadas pela ARIA.</p>
              <div className="space-y-2">
                {Object.entries(CATEGORY_MAP).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-surface">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: `hsl(${CAT_COLORS[key]})` }} />
                    <span className="text-xs text-foreground flex-1">{label}</span>
                    <span className="text-[10px] font-label text-muted-foreground">{key}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Snippets Tab */}
          <TabsContent value="snippets" className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1">Snippets</h3>
                  <p className="text-xs text-muted-foreground">Atalhos de texto rápido para respostas.</p>
                </div>
                <button onClick={() => setShowAddSnippet(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-primary bg-primary/10 hover:bg-primary/15 transition-colors">
                  <Plus className="w-3 h-3" />Novo
                </button>
              </div>
              {showAddSnippet && (
                <div className="mb-4 p-3 rounded-lg bg-surface border border-border-subtle space-y-3">
                  <Input placeholder="/trigger" value={newSnippet.trigger_text} onChange={(e) => setNewSnippet({ ...newSnippet, trigger_text: e.target.value })} className="text-xs bg-background border-border font-mono" />
                  <Input placeholder="Conteúdo do snippet..." value={newSnippet.content} onChange={(e) => setNewSnippet({ ...newSnippet, content: e.target.value })} className="text-xs bg-background border-border" />
                  <div className="flex gap-2">
                    <button onClick={handleAddSnippet} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs bg-primary text-primary-foreground hover:bg-primary/90"><Save className="w-3 h-3" />Salvar</button>
                    <button onClick={() => { setShowAddSnippet(false); setNewSnippet({ trigger_text: "", content: "" }); }} className="px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-surface-hover"><X className="w-3 h-3" /></button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {snippets.map((s) => (
                  <SnippetRow key={s.id} snippet={s} isEditing={editingSnippet === s.id} onEdit={() => setEditingSnippet(s.id)} onSave={(t, c) => handleUpdateSnippet(s.id, t, c)} onCancel={() => setEditingSnippet(null)} onDelete={() => handleDeleteSnippet(s.id)} />
                ))}
                {snippets.length === 0 && <p className="text-xs text-muted-foreground/50 text-center py-4">Nenhum snippet configurado.</p>}
              </div>
            </div>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-foreground mb-1">Conta</h3>
                <p className="text-xs text-muted-foreground">{profile?.email ?? "Carregando..."}</p>
              </div>
              {profile && (
                <div className="flex items-center gap-3 px-3 py-3 rounded-md bg-surface">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {profile.display_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "U"}
                  </div>
                  <div>
                    <p className="text-xs text-foreground font-medium">{profile.display_name ?? "Usuário"}</p>
                    <p className="text-[10px] text-muted-foreground">{profile.email}</p>
                  </div>
                </div>
              )}
              <button onClick={handleSignOut} className="w-full px-3 py-2 text-xs rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
                Sair da conta
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SnippetRow({ snippet, isEditing, onEdit, onSave, onCancel, onDelete }: {
  snippet: Snippet; isEditing: boolean; onEdit: () => void; onSave: (trigger: string, content: string) => void; onCancel: () => void; onDelete: () => void;
}) {
  const [trigger, setTrigger] = useState(snippet.trigger_text);
  const [content, setContent] = useState(snippet.content);

  if (isEditing) {
    return (
      <div className="p-3 rounded-lg bg-surface border border-border-subtle space-y-2">
        <Input value={trigger} onChange={(e) => setTrigger(e.target.value)} className="text-xs bg-background border-border font-mono" />
        <Input value={content} onChange={(e) => setContent(e.target.value)} className="text-xs bg-background border-border" />
        <div className="flex gap-2">
          <button onClick={() => onSave(trigger, content)} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-primary text-primary-foreground"><Save className="w-3 h-3" />Salvar</button>
          <button onClick={onCancel} className="px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-surface-hover">Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-surface group">
      <code className="text-[11px] font-mono text-primary shrink-0">{snippet.trigger_text}</code>
      <span className="text-xs text-foreground/70 flex-1 truncate">{snippet.content}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1 rounded text-muted-foreground hover:text-foreground"><Edit2 className="w-3 h-3" /></button>
        <button onClick={onDelete} className="p-1 rounded text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
      </div>
    </div>
  );
}
