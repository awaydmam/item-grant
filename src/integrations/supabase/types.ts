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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      borrow_requests: {
        Row: {
          borrower_id: string
          completed_at: string | null
          created_at: string
          end_date: string
          headmaster_approved_at: string | null
          headmaster_approved_by: string | null
          headmaster_notes: string | null
          id: string
          letter_generated_at: string | null
          letter_number: string | null
          location_usage: string | null
          owner_notes: string | null
          owner_reviewed_at: string | null
          owner_reviewed_by: string | null
          pic_contact: string
          pic_name: string
          purpose: string
          rejection_reason: string | null
          start_date: string
          started_at: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          borrower_id: string
          completed_at?: string | null
          created_at?: string
          end_date: string
          headmaster_approved_at?: string | null
          headmaster_approved_by?: string | null
          headmaster_notes?: string | null
          id?: string
          letter_generated_at?: string | null
          letter_number?: string | null
          location_usage?: string | null
          owner_notes?: string | null
          owner_reviewed_at?: string | null
          owner_reviewed_by?: string | null
          pic_contact: string
          pic_name: string
          purpose: string
          rejection_reason?: string | null
          start_date: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          borrower_id?: string
          completed_at?: string | null
          created_at?: string
          end_date?: string
          headmaster_approved_at?: string | null
          headmaster_approved_by?: string | null
          headmaster_notes?: string | null
          id?: string
          letter_generated_at?: string | null
          letter_number?: string | null
          location_usage?: string | null
          owner_notes?: string | null
          owner_reviewed_at?: string | null
          owner_reviewed_by?: string | null
          pic_contact?: string
          pic_name?: string
          purpose?: string
          rejection_reason?: string | null
          start_date?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "borrow_requests_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrow_requests_headmaster_approved_by_fkey"
            columns: ["headmaster_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrow_requests_owner_reviewed_by_fkey"
            columns: ["owner_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          contact_person: string | null
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          contact_person?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          contact_person?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          accessories: Json | null
          available_quantity: number
          category_id: string | null
          code: string | null
          created_at: string
          department_id: string
          description: string | null
          id: string
          image_url: string | null
          location: string | null
          name: string
          quantity: number
          status: Database["public"]["Enums"]["item_status"]
          updated_at: string
        }
        Insert: {
          accessories?: Json | null
          available_quantity?: number
          category_id?: string | null
          code?: string | null
          created_at?: string
          department_id: string
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          name: string
          quantity?: number
          status?: Database["public"]["Enums"]["item_status"]
          updated_at?: string
        }
        Update: {
          accessories?: Json | null
          available_quantity?: number
          category_id?: string | null
          code?: string | null
          created_at?: string
          department_id?: string
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          name?: string
          quantity?: number
          status?: Database["public"]["Enums"]["item_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      request_items: {
        Row: {
          accessories_checklist: Json | null
          condition_on_borrow: string | null
          condition_on_return: string | null
          created_at: string
          id: string
          item_id: string
          notes: string | null
          quantity: number
          request_id: string
        }
        Insert: {
          accessories_checklist?: Json | null
          condition_on_borrow?: string | null
          condition_on_return?: string | null
          created_at?: string
          id?: string
          item_id: string
          notes?: string | null
          quantity?: number
          request_id: string
        }
        Update: {
          accessories_checklist?: Json | null
          condition_on_borrow?: string | null
          condition_on_return?: string | null
          created_at?: string
          id?: string
          item_id?: string
          notes?: string | null
          quantity?: number
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "borrow_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          department: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "owner" | "headmaster" | "borrower"
      item_status:
        | "available"
        | "reserved"
        | "borrowed"
        | "maintenance"
        | "damaged"
        | "lost"
      request_status:
        | "draft"
        | "pending_owner"
        | "pending_headmaster"
        | "approved"
        | "active"
        | "completed"
        | "rejected"
        | "cancelled"
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
    Enums: {
      app_role: ["admin", "owner", "headmaster", "borrower"],
      item_status: [
        "available",
        "reserved",
        "borrowed",
        "maintenance",
        "damaged",
        "lost",
      ],
      request_status: [
        "draft",
        "pending_owner",
        "pending_headmaster",
        "approved",
        "active",
        "completed",
        "rejected",
        "cancelled",
      ],
    },
  },
} as const
