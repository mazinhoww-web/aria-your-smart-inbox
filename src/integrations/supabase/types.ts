export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      email_drafts: {
        Row: {
          created_at: string | null
          draft_body: string
          gmail_draft_id: string | null
          gmail_message_id: string
          gmail_thread_id: string
          id: string
          status: string | null
          subject: string | null
          thread_summary: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          draft_body: string
          gmail_draft_id?: string | null
          gmail_message_id: string
          gmail_thread_id: string
          id?: string
          status?: string | null
          subject?: string | null
          thread_summary?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          draft_body?: string
          gmail_draft_id?: string | null
          gmail_message_id?: string
          gmail_thread_id?: string
          id?: string
          status?: string | null
          subject?: string | null
          thread_summary?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_emails: {
        Row: {
          body_html: string | null
          category: string
          gmail_message_id: string
          gmail_thread_id: string
          has_draft: boolean | null
          id: string
          is_unread: boolean | null
          processed_at: string | null
          received_at: string | null
          sender_email: string | null
          sender_name: string | null
          snippet: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          body_html?: string | null
          category?: string
          gmail_message_id: string
          gmail_thread_id: string
          has_draft?: boolean | null
          id?: string
          is_unread?: boolean | null
          processed_at?: string | null
          received_at?: string | null
          sender_email?: string | null
          sender_name?: string | null
          snippet?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          body_html?: string | null
          category?: string
          gmail_message_id?: string
          gmail_thread_id?: string
          has_draft?: boolean | null
          id?: string
          is_unread?: boolean | null
          processed_at?: string | null
          received_at?: string | null
          sender_email?: string | null
          sender_name?: string | null
          snippet?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processed_emails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      snippets: {
        Row: {
          content: string
          created_at: string | null
          id: string
          trigger_text: string
          use_count: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          trigger_text: string
          use_count?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          trigger_text?: string
          use_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snippets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      snooze_queue: {
        Row: {
          created_at: string | null
          executed: boolean | null
          gmail_message_id: string
          id: string
          original_labels: Json | null
          remind_at: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          executed?: boolean | null
          gmail_message_id: string
          id?: string
          original_labels?: Json | null
          remind_at: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          executed?: boolean | null
          gmail_message_id?: string
          id?: string
          original_labels?: Json | null
          remind_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snooze_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          ai_provider: string | null
          anthropic_api_key: string | null
          avatar_url: string | null
          category_settings: Json | null
          created_at: string | null
          custom_instructions: string | null
          display_name: string | null
          email: string
          gmail_access_token: string | null
          gmail_connected: boolean | null
          gmail_refresh_token: string | null
          gmail_token_expiry: string | null
          id: string
          label_mapping: Json | null
          style_analyzed_at: string | null
          style_profile: Json | null
          updated_at: string | null
        }
        Insert: {
          ai_provider?: string | null
          anthropic_api_key?: string | null
          avatar_url?: string | null
          category_settings?: Json | null
          created_at?: string | null
          custom_instructions?: string | null
          display_name?: string | null
          email: string
          gmail_access_token?: string | null
          gmail_connected?: boolean | null
          gmail_refresh_token?: string | null
          gmail_token_expiry?: string | null
          id: string
          label_mapping?: Json | null
          style_analyzed_at?: string | null
          style_profile?: Json | null
          updated_at?: string | null
        }
        Update: {
          ai_provider?: string | null
          anthropic_api_key?: string | null
          avatar_url?: string | null
          category_settings?: Json | null
          created_at?: string | null
          custom_instructions?: string | null
          display_name?: string | null
          email?: string
          gmail_access_token?: string | null
          gmail_connected?: boolean | null
          gmail_refresh_token?: string | null
          gmail_token_expiry?: string | null
          id?: string
          label_mapping?: Json | null
          style_analyzed_at?: string | null
          style_profile?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      insert_default_snippets: {
        Args: { user_uuid: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
