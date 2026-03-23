

# ARIA Backend Implementation Plan

This is a large, multi-step implementation covering database schema, edge functions, state management, and frontend integration. The plan follows the order specified in the prompt.

---

## Overview

Replace all mock data with real Gmail integration powered by edge functions and a database. Add onboarding flow, auth guards, and Zustand store.

---

## Phase 1: Database Schema

Create all tables via migration tool:
- **user_profiles** — linked to auth.users with ON DELETE CASCADE, stores Gmail tokens (encrypted), style profile, label mapping, category settings
- **processed_emails** — cached Gmail emails with category, unread status, draft flag
- **email_drafts** — AI-generated drafts with Gmail draft ID and status
- **snooze_queue** — scheduled email reminders
- **snippets** — user shortcuts like `/ok`, `/call`

All tables get RLS policies (users access only their own data). A trigger auto-creates a profile on signup. A function inserts default snippets.

**Indexes** on: processed_emails(user_id, category), processed_emails(user_id, is_unread), email_drafts(user_id, gmail_message_id), snooze_queue(remind_at).

---

## Phase 2: Secrets Configuration

Before deploying edge functions, request these secrets from the user:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ANTHROPIC_API_KEY`
- `ENCRYPTION_KEY`

Also add `VITE_GOOGLE_CLIENT_ID` to the frontend codebase for the Gmail OAuth redirect.

---

## Phase 3: Edge Functions (7 functions)

Each function includes CORS headers and JWT validation via `getClaims()`.

1. **exchange-google-token** — Exchanges Google OAuth code for Gmail tokens, encrypts and stores them in user_profiles
2. **setup-labels** — Creates/maps 8 Gmail labels (to_respond, fyi, comment, notification, meeting_update, awaiting_reply, actioned, marketing), inserts default snippets
3. **analyze-style** — Fetches 100 sent emails, samples 30, sends to Claude to extract writing style profile
4. **classify-email** — Sends email headers to Claude, returns one of 8 categories
5. **process-inbox** — Batch processes unread inbox: classify → apply labels → archive non-essential → save to processed_emails
6. **generate-draft** — Fetches thread, uses style profile + Claude to generate reply, creates Gmail draft
7. **send-draft** — Sends a Gmail draft and updates status

Shared modules: `cors.ts`, `crypto.ts` (AES-GCM encrypt/decrypt), `gmail.ts` (token refresh, API helpers), `anthropic.ts` (Claude API wrapper).

---

## Phase 4: Zustand Store

Create `src/store/useAriaStore.ts` with:
- State: emails, selectedEmailId, activeDraft, isProcessing, processingStats, categoryCounts
- Actions: loadEmails, selectEmail, processInbox, generateDraft, sendDraft, loadDraft, updateCategoryCounts
- All actions call edge functions via `supabase.functions.invoke()` or fetch with auth token

---

## Phase 5: Frontend Integration

### Modify existing components (remove mocks):
- **AppSidebar** — Use `categoryCounts` from store instead of hardcoded counts
- **EmailList** — Replace `MOCK_EMAILS` with store's `emails`, wire `processInbox` to "Processar" button
- **DetailPanel** — Show real email data from store, load/display real drafts, wire send/regenerate/discard buttons
- **InboxPage** — Remove local state, use store

### Create new pages:
- **OnboardingPage** (`/onboarding`) — 3-step wizard: Gmail authorization → Setup labels → Analyze style
- **GmailCallbackPage** (`/auth/gmail-callback`) — Captures OAuth code, calls exchange-google-token, redirects to onboarding step 2
- **SettingsPage** (`/settings`) — 4 tabs: Categories, Style, Snippets, Account

### Auth guard:
- After Google login, check `gmail_connected` in user_profiles
- If false → redirect to `/onboarding`
- If true → redirect to `/inbox`
- Unauthenticated users on `/inbox` → redirect to `/`

### New routes in App.tsx:
- `/onboarding`
- `/auth/gmail-callback`
- `/settings`

---

## Phase 6: Polish

- Processing toast with real-time stats during inbox processing
- Undo send with 10s countdown
- Skeleton loading states
- Error handling with retry for Gmail API failures

---

## Technical Notes

- Edge functions use `Deno.serve()` pattern (not deprecated `serve()` from std)
- Gmail tokens encrypted with AES-GCM using ENCRYPTION_KEY secret
- Claude model: will use Lovable AI supported models instead of direct Anthropic API where possible, but since the prompt specifically requests Anthropic Claude, we'll need the ANTHROPIC_API_KEY secret
- RLS ensures multi-tenant data isolation
- The trigger on auth.users is created via a SECURITY DEFINER function to avoid RLS recursion
- `processed_emails` has a UNIQUE constraint on (user_id, gmail_message_id) for upsert support

---

## Implementation Order

1. Run database migration (all tables + RLS + trigger + function)
2. Request secrets from user (Google, Anthropic, Encryption)
3. Deploy edge functions one by one, testing each
4. Create Zustand store
5. Update existing components to use store
6. Create OnboardingPage + GmailCallbackPage
7. Add auth guard and new routes
8. Create SettingsPage
9. Add processing toast and polish

