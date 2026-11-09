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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      diet_plans: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          rest_carbs: number | null
          rest_fat: number | null
          rest_kcal: number | null
          rest_protein: number | null
          start_date: string
          training_carbs: number | null
          training_fat: number | null
          training_kcal: number | null
          training_protein: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          rest_carbs?: number | null
          rest_fat?: number | null
          rest_kcal?: number | null
          rest_protein?: number | null
          start_date?: string
          training_carbs?: number | null
          training_fat?: number | null
          training_kcal?: number | null
          training_protein?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          rest_carbs?: number | null
          rest_fat?: number | null
          rest_kcal?: number | null
          rest_protein?: number | null
          start_date?: string
          training_carbs?: number | null
          training_fat?: number | null
          training_kcal?: number | null
          training_protein?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      food_logs: {
        Row: {
          carbs: number | null
          created_at: string
          fat: number | null
          id: string
          is_training_day: boolean
          kcal: number | null
          log_date: string
          notes: string | null
          protein: number | null
          raw_report: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          carbs?: number | null
          created_at?: string
          fat?: number | null
          id?: string
          is_training_day?: boolean
          kcal?: number | null
          log_date: string
          notes?: string | null
          protein?: number | null
          raw_report?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          carbs?: number | null
          created_at?: string
          fat?: number | null
          id?: string
          is_training_day?: boolean
          kcal?: number | null
          log_date?: string
          notes?: string | null
          protein?: number | null
          raw_report?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      measurements: {
        Row: {
          created_at: string
          id: string
          measured_at: string
          metric: string
          notes: string | null
          unit: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          measured_at?: string
          metric: string
          notes?: string | null
          unit?: string
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          measured_at?: string
          metric?: string
          notes?: string | null
          unit?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      medical_exam_files: {
        Row: {
          created_at: string
          exam_id: string
          file_name: string | null
          id: string
          mime_type: string | null
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_exam_files_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "medical_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_exams: {
        Row: {
          category: string
          created_at: string
          description: string | null
          exam_date: string
          file_name: string | null
          id: string
          mime_type: string | null
          storage_path: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          exam_date?: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          storage_path?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          exam_date?: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          storage_path?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          note_date: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          note_date?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          note_date?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      progress_photo_previews: {
        Row: {
          created_at: string
          height: number | null
          id: string
          mime_type: string
          photo_id: string
          preview_base64: string
          user_id: string
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          mime_type?: string
          photo_id: string
          preview_base64: string
          user_id: string
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          mime_type?: string
          photo_id?: string
          preview_base64?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_photo_previews_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: true
            referencedRelation: "progress_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_photos: {
        Row: {
          angle: string
          caption: string | null
          created_at: string
          id: string
          photo_date: string
          pose: string
          position: number
          storage_path: string
          user_id: string
        }
        Insert: {
          angle?: string
          caption?: string | null
          created_at?: string
          id?: string
          photo_date?: string
          pose?: string
          position?: number
          storage_path: string
          user_id: string
        }
        Update: {
          angle?: string
          caption?: string | null
          created_at?: string
          id?: string
          photo_date?: string
          pose?: string
          position?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      share_links: {
        Row: {
          created_at: string
          id: string
          label: string | null
          last_accessed_at: string | null
          revoked_at: string | null
          token: string | null
          token_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          last_accessed_at?: string | null
          revoked_at?: string | null
          token?: string | null
          token_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          last_accessed_at?: string | null
          revoked_at?: string | null
          token?: string | null
          token_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_state: {
        Row: {
          created_at: string
          days_synced: number
          detail: string | null
          id: string
          last_sync_at: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_synced?: number
          detail?: string | null
          id?: string
          last_sync_at?: string
          source: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_synced?: number
          detail?: string | null
          id?: string
          last_sync_at?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_plans: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_active: boolean
          start_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          start_date?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          start_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          session_date: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          session_date?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          session_date?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
