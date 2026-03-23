

# Status: O que falta para ARIA ficar funcional

## O que FUNCIONA hoje
- Login com Google (Lovable Cloud)
- Database schema completo (5 tabelas + RLS + triggers)
- Zustand store conectado ao banco
- 3 edge functions: `classify-email`, `generate-draft`, `process-inbox` (modo demo com dados fake)
- UI completa: LandingPage, InboxPage (3 colunas), SettingsPage (AI toggle, categorias, conta)
- Componentes inbox: AppSidebar, EmailList, DetailPanel — todos conectados ao store

## O que NÃO funciona (tudo relacionado a Gmail real)

### 1. Secrets faltando: `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`
Sem essas credenciais do Google Cloud Console, nenhuma integração Gmail funciona. O `ENCRYPTION_KEY` já foi configurado.

### 2. Edge functions faltando (4 de 7)
| Função | Status |
|---|---|
| `exchange-google-token` | Não existe |
| `setup-labels` | Não existe |
| `analyze-style` | Não existe |
| `send-draft` | Não existe |

### 3. Páginas faltando
- **OnboardingPage** (`/onboarding`) — wizard de 3 passos para conectar Gmail
- **GmailCallbackPage** (`/auth/gmail-callback`) — captura código OAuth do Google

### 4. Auth guard incompleto
- Após login, não verifica `gmail_connected` para redirecionar a `/onboarding`
- Rotas `/onboarding` e `/auth/gmail-callback` não existem no App.tsx

### 5. Funcionalidades da UI sem backend
- Botão "Enviar" no draft panel não funciona (falta `send-draft`)
- Botão "Processar" gera dados demo, não busca Gmail real
- Tabs Snippets e Account no Settings estão incompletas (sem CRUD de snippets, sem status Gmail)

## Resumo
A aplicação roda e mostra dados demo. Para funcionar com Gmail real, precisa:
1. Credenciais Google Cloud Console (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
2. 4 edge functions + 2 páginas + auth guard

### Plano de implementação (próximos passos)
1. Criar `exchange-google-token`, `setup-labels`, `analyze-style`, `send-draft`
2. Criar OnboardingPage + GmailCallbackPage
3. Adicionar rotas e auth guard no App.tsx
4. Completar SettingsPage (Snippets tab, Gmail status)
5. Conectar `process-inbox` para usar Gmail API real quando `gmail_connected=true`

