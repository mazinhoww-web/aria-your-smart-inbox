

# Remaining ARIA Implementation

## What's left (in priority order)

### 1. Request Secrets
Request `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ENCRYPTION_KEY` from the user. `ANTHROPIC_API_KEY` is optional since we support Lovable AI as default.

### 2. Create 4 Missing Edge Functions + Shared Modules
- **Shared modules** inside each function (since Lovable edge functions keep code in `index.ts`):
  - CORS headers, AES-GCM crypto, Gmail API helpers, AI call wrapper
- **`exchange-google-token`** — exchanges Google OAuth code for Gmail tokens, encrypts and stores
- **`setup-labels`** — creates/maps 8 Gmail labels in user's account
- **`analyze-style`** — fetches sent emails, extracts writing style via AI
- **`send-draft`** — sends a Gmail draft and updates DB status

### 3. Create OnboardingPage + GmailCallbackPage
- **`/onboarding`** — 3-step wizard: authorize Gmail scopes → setup labels → analyze style
- **`/auth/gmail-callback`** — captures `?code=` from Google OAuth, calls `exchange-google-token`, redirects to step 2

### 4. Update Auth Guard + Routes
- Add `/onboarding` and `/auth/gmail-callback` routes to App.tsx
- After Google login on landing page, check `gmail_connected` in profile:
  - false → `/onboarding`
  - true → `/inbox`

### 5. Complete SettingsPage
- Add **Snippets** tab (list, add, edit, delete snippets)
- Add **Account** tab (Gmail connection status, revoke access, export data)

### 6. Polish
- Processing toast with category stats during `processInbox`
- Undo send with 10s countdown
- Skeleton loading states for email list
- Error handling with retry for Gmail API failures

## Technical Notes
- Edge functions use inline shared code (no `_shared/` folder — Lovable deploys single `index.ts` per function)
- AI calls default to Lovable AI gateway, fall back to Anthropic if user configured it
- Gmail tokens encrypted with AES-GCM before storage
- Google credentials (`CLIENT_ID`, `CLIENT_SECRET`) come from secrets, not from user input in UI

