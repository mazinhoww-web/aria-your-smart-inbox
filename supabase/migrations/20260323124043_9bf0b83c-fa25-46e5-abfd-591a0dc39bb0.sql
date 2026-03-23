
-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Perfis de usuário (1:1 com auth.users)
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  gmail_access_token TEXT,
  gmail_refresh_token TEXT,
  gmail_token_expiry TIMESTAMPTZ,
  gmail_connected BOOLEAN DEFAULT FALSE,
  style_profile JSONB DEFAULT '{}',
  style_analyzed_at TIMESTAMPTZ,
  label_mapping JSONB DEFAULT '{}',
  category_settings JSONB DEFAULT '{"move_out":["comment","notification","meeting_update","awaiting_reply","actioned","marketing"],"keep_in":["to_respond","fyi"]}',
  custom_instructions TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emails processados (cache local)
CREATE TABLE public.processed_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  gmail_message_id TEXT NOT NULL,
  gmail_thread_id TEXT NOT NULL,
  subject TEXT,
  sender_name TEXT,
  sender_email TEXT,
  snippet TEXT,
  body_html TEXT,
  category TEXT NOT NULL DEFAULT 'fyi',
  is_unread BOOLEAN DEFAULT TRUE,
  has_draft BOOLEAN DEFAULT FALSE,
  received_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, gmail_message_id)
);

-- Drafts gerados por ARIA
CREATE TABLE public.email_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  gmail_message_id TEXT NOT NULL,
  gmail_thread_id TEXT NOT NULL,
  gmail_draft_id TEXT,
  subject TEXT,
  draft_body TEXT NOT NULL,
  thread_summary TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fila de snooze
CREATE TABLE public.snooze_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  gmail_message_id TEXT NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  original_labels JSONB DEFAULT '[]',
  executed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Snippets personalizados
CREATE TABLE public.snippets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  trigger_text TEXT NOT NULL,
  content TEXT NOT NULL,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_processed_emails_user_category ON public.processed_emails(user_id, category);
CREATE INDEX idx_processed_emails_user_unread ON public.processed_emails(user_id, is_unread);
CREATE INDEX idx_email_drafts_user_message ON public.email_drafts(user_id, gmail_message_id);
CREATE INDEX idx_snooze_queue_remind ON public.snooze_queue(remind_at) WHERE executed = FALSE;

-- RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snooze_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their profile" ON public.user_profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users own their emails" ON public.processed_emails FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their drafts" ON public.email_drafts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their snooze" ON public.snooze_queue FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their snippets" ON public.snippets FOR ALL USING (auth.uid() = user_id);

-- Trigger para criar profile automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para inserir snippets padrão
CREATE OR REPLACE FUNCTION public.insert_default_snippets(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.snippets (user_id, trigger_text, content) VALUES
    (user_uuid, '/ok', 'Perfeito, pode prosseguir.'),
    (user_uuid, '/recebido', 'Recebi, obrigado.'),
    (user_uuid, '/call', 'Podemos falar? Me chame quando quiser.'),
    (user_uuid, '/slot', 'Disponível [DIA] às [HORA] ou [DIA2] às [HORA2]. Confirma?'),
    (user_uuid, '/analisando', 'Estou analisando e retorno em breve.'),
    (user_uuid, '/aguardo', 'Aguardo seu retorno para prosseguirmos.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
