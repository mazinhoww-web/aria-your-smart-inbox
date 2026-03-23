
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
