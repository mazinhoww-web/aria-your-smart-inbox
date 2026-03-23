import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

interface Email {
  id: string;
  gmail_message_id: string;
  gmail_thread_id: string;
  subject: string | null;
  sender_name: string | null;
  sender_email: string | null;
  snippet: string | null;
  category: string;
  is_unread: boolean | null;
  has_draft: boolean | null;
  received_at: string | null;
}

interface Draft {
  id: string;
  gmail_draft_id: string | null;
  draft_body: string;
  status: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  gmail_connected: boolean | null;
  ai_provider: string | null;
  anthropic_api_key: string | null;
  style_profile: Record<string, unknown> | null;
  custom_instructions: string | null;
  category_settings: Record<string, unknown> | null;
}

interface AriaStore {
  // Auth
  profile: UserProfile | null;

  // Inbox
  emails: Email[];
  selectedEmailId: string | null;
  categoryCounts: Record<string, number>;

  // Processing
  isProcessing: boolean;
  processingStats: Record<string, number> | null;

  // Draft
  activeDraft: Draft | null;
  isDraftLoading: boolean;

  // Actions
  loadProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  loadEmails: () => Promise<void>;
  selectEmail: (id: string | null) => void;
  processInbox: () => Promise<void>;
  generateDraft: (messageId: string, threadId: string) => Promise<void>;
  loadDraft: (messageId: string) => Promise<void>;
  discardDraft: (draftId: string) => Promise<void>;
}

const CATEGORY_MAP: Record<string, string> = {
  to_respond: "Responder",
  fyi: "FYI",
  comment: "Comentário",
  notification: "Notificação",
  meeting_update: "Reunião",
  awaiting_reply: "Aguardando",
  actioned: "Acionado",
  marketing: "Marketing",
};

export { CATEGORY_MAP };

export const useAriaStore = create<AriaStore>((set, get) => ({
  profile: null,
  emails: [],
  selectedEmailId: null,
  categoryCounts: {},
  isProcessing: false,
  processingStats: null,
  activeDraft: null,
  isDraftLoading: false,

  loadProfile: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      set({
        profile: data as unknown as UserProfile,
      });
    }
  },

  updateProfile: async (updates) => {
    const profile = get().profile;
    if (!profile) return;

    await supabase.from("user_profiles").update(updates).eq("id", profile.id);

    set({ profile: { ...profile, ...updates } as UserProfile });
  },

  loadEmails: async () => {
    const { data } = await supabase
      .from("processed_emails")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(100);

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((e) => {
        counts[e.category] = (counts[e.category] ?? 0) + 1;
      });
      set({ emails: data as Email[], categoryCounts: counts });
    }
  },

  selectEmail: (id) => {
    set({ selectedEmailId: id, activeDraft: null });
  },

  processInbox: async () => {
    set({ isProcessing: true, processingStats: null });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("process-inbox", {
        body: { limit: 50 },
      });

      if (res.data) {
        set({ processingStats: res.data.categories });
      }
      await get().loadEmails();
    } finally {
      set({ isProcessing: false });
    }
  },

  generateDraft: async (messageId, threadId) => {
    set({ isDraftLoading: true });
    try {
      const res = await supabase.functions.invoke("generate-draft", {
        body: { gmail_message_id: messageId, gmail_thread_id: threadId },
      });

      if (res.data?.success) {
        set({
          activeDraft: {
            id: res.data.draft_id,
            gmail_draft_id: null,
            draft_body: res.data.draft_body,
            status: "pending",
          },
        });
        await get().loadEmails();
      }
    } finally {
      set({ isDraftLoading: false });
    }
  },

  loadDraft: async (messageId) => {
    const { data } = await supabase
      .from("email_drafts")
      .select("*")
      .eq("gmail_message_id", messageId)
      .eq("status", "pending")
      .maybeSingle();

    set({
      activeDraft: data
        ? {
            id: data.id,
            gmail_draft_id: data.gmail_draft_id,
            draft_body: data.draft_body,
            status: data.status,
          }
        : null,
    });
  },

  discardDraft: async (draftId) => {
    await supabase
      .from("email_drafts")
      .update({ status: "discarded" })
      .eq("id", draftId);

    set({ activeDraft: null });
    await get().loadEmails();
  },
}));
