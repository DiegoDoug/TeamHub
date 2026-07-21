export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      calendar_events: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          end_time: string | null
          event_group_id: string | null
          id: string
          location: string | null
          start_time: string | null
          team_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          description?: string | null
          end_time?: string | null
          event_group_id?: string | null
          id?: string
          location?: string | null
          start_time?: string | null
          team_id: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          end_time?: string | null
          event_group_id?: string | null
          id?: string
          location?: string | null
          start_time?: string | null
          team_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_event_group_id_fkey"
            columns: ["event_group_id"]
            isOneToOne: false
            referencedRelation: "event_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          created_at: string
          event_group_id: string | null
          id: string
          name: string
          team_id: string
          type: string
        }
        Insert: {
          created_at?: string
          event_group_id?: string | null
          id?: string
          name: string
          team_id: string
          type: string
        }
        Update: {
          created_at?: string
          event_group_id?: string | null
          id?: string
          name?: string
          team_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_event_group_id_fkey"
            columns: ["event_group_id"]
            isOneToOne: false
            referencedRelation: "event_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      event_group_members: {
        Row: {
          created_at: string
          event_group_id: string
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          event_group_id: string
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          event_group_id?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_group_members_event_group_id_fkey"
            columns: ["event_group_id"]
            isOneToOne: false
            referencedRelation: "event_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_group_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_groups: {
        Row: {
          created_at: string
          event_coach_id: string | null
          id: string
          name: string
          team_id: string
        }
        Insert: {
          created_at?: string
          event_coach_id?: string | null
          id?: string
          name: string
          team_id: string
        }
        Update: {
          created_at?: string
          event_coach_id?: string | null
          id?: string
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_groups_event_coach_id_fkey"
            columns: ["event_coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_groups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_roster_members: {
        Row: {
          claimed_profile_id: string | null
          created_at: string
          created_by: string | null
          event_group_id: string | null
          full_name: string
          id: string
          role: string
          source: string
          status: string
          team_id: string
        }
        Insert: {
          claimed_profile_id?: string | null
          created_at?: string
          created_by?: string | null
          event_group_id?: string | null
          full_name: string
          id?: string
          role?: string
          source: string
          status?: string
          team_id: string
        }
        Update: {
          claimed_profile_id?: string | null
          created_at?: string
          created_by?: string | null
          event_group_id?: string | null
          full_name?: string
          id?: string
          role?: string
          source?: string
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_roster_members_claimed_profile_id_fkey"
            columns: ["claimed_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_roster_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_roster_members_event_group_id_fkey"
            columns: ["event_group_id"]
            isOneToOne: false
            referencedRelation: "event_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_roster_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          primary_events: string
          prs: Json
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id: string
          primary_events?: string
          prs?: Json
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          primary_events?: string
          prs?: Json
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          role: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          role: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          role?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          join_code: string | null
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          join_code?: string | null
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          join_code?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_cycles: {
        Row: {
          created_at: string
          end_date: string | null
          event_group_id: string
          id: string
          name: string
          phase: string | null
          start_date: string | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          event_group_id: string
          id?: string
          name: string
          phase?: string | null
          start_date?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          event_group_id?: string
          id?: string
          name?: string
          phase?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_cycles_event_group_id_fkey"
            columns: ["event_group_id"]
            isOneToOne: false
            referencedRelation: "event_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      training_days: {
        Row: {
          cooldown: string | null
          day_of_week: number
          drills: string | null
          id: string
          main_work: string | null
          notes: string | null
          warmup: string | null
          week_id: string
        }
        Insert: {
          cooldown?: string | null
          day_of_week: number
          drills?: string | null
          id?: string
          main_work?: string | null
          notes?: string | null
          warmup?: string | null
          week_id: string
        }
        Update: {
          cooldown?: string | null
          day_of_week?: number
          drills?: string | null
          id?: string
          main_work?: string | null
          notes?: string | null
          warmup?: string | null
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_days_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "training_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      training_weeks: {
        Row: {
          cycle_id: string
          focus: string | null
          id: string
          notes: string | null
          week_number: number
        }
        Insert: {
          cycle_id: string
          focus?: string | null
          id?: string
          notes?: string | null
          week_number: number
        }
        Update: {
          cycle_id?: string
          focus?: string | null
          id?: string
          notes?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_weeks_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "training_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          athlete_id: string
          data: Json
          effort_rating: number | null
          id: string
          logged_at: string
          notes: string | null
          training_day_id: string | null
          workout_type: string
        }
        Insert: {
          athlete_id: string
          data?: Json
          effort_rating?: number | null
          id?: string
          logged_at?: string
          notes?: string | null
          training_day_id?: string | null
          workout_type: string
        }
        Update: {
          athlete_id?: string
          data?: Json
          effort_rating?: number | null
          id?: string
          logged_at?: string
          notes?: string | null
          training_day_id?: string | null
          workout_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_training_day_id_fkey"
            columns: ["training_day_id"]
            isOneToOne: false
            referencedRelation: "training_days"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_can_access_channel: {
        Args: { p_channel_id: string }
        Returns: boolean
      }
      app_can_view_group: {
        Args: { p_event_group_id: string }
        Returns: boolean
      }
      app_channel_team_id: { Args: { p_channel_id: string }; Returns: string }
      app_cycle_group_id: { Args: { p_cycle_id: string }; Returns: string }
      app_day_group_id: { Args: { p_day_id: string }; Returns: string }
      app_event_group_team_id: {
        Args: { p_event_group_id: string }
        Returns: string
      }
      app_is_coach_of_athlete: {
        Args: { p_athlete_id: string }
        Returns: boolean
      }
      app_is_group_coach: {
        Args: { p_event_group_id: string }
        Returns: boolean
      }
      app_is_head_coach: { Args: { p_team_id: string }; Returns: boolean }
      app_is_team_member: { Args: { p_team_id: string }; Returns: boolean }
      app_shares_team_with: { Args: { p_profile_id: string }; Returns: boolean }
      app_team_role: { Args: { p_team_id: string }; Returns: string }
      app_week_group_id: { Args: { p_week_id: string }; Returns: string }
      claim_roster_slot: {
        Args: { p_code: string; p_pending_id: string }
        Returns: undefined
      }
      list_pending_roster_by_join_code: {
        Args: { p_code: string }
        Returns: {
          event_group_name: string
          full_name: string
          pending_id: string
          team_id: string
          team_name: string
        }[]
      }
      lookup_profile_by_email: {
        Args: { p_email: string }
        Returns: {
          full_name: string
          id: string
        }[]
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

