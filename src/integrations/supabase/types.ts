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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      businesses: {
        Row: {
          address: string | null
          category_id: string
          coupon_expires: string | null
          coupon_text: string | null
          created_at: string
          description: string | null
          featured_order: number
          id: string
          last_scraped: string | null
          logo_url: string | null
          name: string
          phone: string | null
          scraped_from: string | null
          sponsor_tier: Database["public"]["Enums"]["sponsor_tier"]
          subcategory: string | null
          town_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category_id: string
          coupon_expires?: string | null
          coupon_text?: string | null
          created_at?: string
          description?: string | null
          featured_order?: number
          id?: string
          last_scraped?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          scraped_from?: string | null
          sponsor_tier?: Database["public"]["Enums"]["sponsor_tier"]
          subcategory?: string | null
          town_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category_id?: string
          coupon_expires?: string | null
          coupon_text?: string | null
          created_at?: string
          description?: string | null
          featured_order?: number
          id?: string
          last_scraped?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          scraped_from?: string | null
          sponsor_tier?: Database["public"]["Enums"]["sponsor_tier"]
          subcategory?: string | null
          town_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          display_order: number
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          display_order?: number
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          display_order?: number
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      packets: {
        Row: {
          address: string
          buyer_email: string | null
          buyer_first_name: string
          buyer_last_name: string | null
          closing_date: string | null
          created_at: string
          has_kids: boolean
          has_pets: boolean
          home_photo_url: string | null
          id: string
          interests: string[]
          lifestyle_tags: string[]
          pdf_download_count: number
          pdf_url: string | null
          realtor_id: string
          slug: string
          status: Database["public"]["Enums"]["packet_status"]
          town_id: string | null
          updated_at: string
          welcome_note: string | null
        }
        Insert: {
          address: string
          buyer_email?: string | null
          buyer_first_name: string
          buyer_last_name?: string | null
          closing_date?: string | null
          created_at?: string
          has_kids?: boolean
          has_pets?: boolean
          home_photo_url?: string | null
          id?: string
          interests?: string[]
          lifestyle_tags?: string[]
          pdf_download_count?: number
          pdf_url?: string | null
          realtor_id: string
          slug: string
          status?: Database["public"]["Enums"]["packet_status"]
          town_id?: string | null
          updated_at?: string
          welcome_note?: string | null
        }
        Update: {
          address?: string
          buyer_email?: string | null
          buyer_first_name?: string
          buyer_last_name?: string | null
          closing_date?: string | null
          created_at?: string
          has_kids?: boolean
          has_pets?: boolean
          home_photo_url?: string | null
          id?: string
          interests?: string[]
          lifestyle_tags?: string[]
          pdf_download_count?: number
          pdf_url?: string | null
          realtor_id?: string
          slug?: string
          status?: Database["public"]["Enums"]["packet_status"]
          town_id?: string | null
          updated_at?: string
          welcome_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packets_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          brokerage_logo_url: string | null
          brokerage_name: string | null
          created_at: string
          default_town_id: string | null
          email_public: string | null
          full_name: string | null
          headshot_url: string | null
          id: string
          phone: string | null
          social_links: Json
          thank_you_message: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brokerage_logo_url?: string | null
          brokerage_name?: string | null
          created_at?: string
          default_town_id?: string | null
          email_public?: string | null
          full_name?: string | null
          headshot_url?: string | null
          id?: string
          phone?: string | null
          social_links?: Json
          thank_you_message?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brokerage_logo_url?: string | null
          brokerage_name?: string | null
          created_at?: string
          default_town_id?: string | null
          email_public?: string | null
          full_name?: string | null
          headshot_url?: string | null
          id?: string
          phone?: string | null
          social_links?: Json
          thank_you_message?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_town_id_fkey"
            columns: ["default_town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_tiers: {
        Row: {
          display_priority: number
          id: string
          key: Database["public"]["Enums"]["sponsor_tier"]
          name: string
          price_monthly: number
        }
        Insert: {
          display_priority?: number
          id?: string
          key: Database["public"]["Enums"]["sponsor_tier"]
          name: string
          price_monthly?: number
        }
        Update: {
          display_priority?: number
          id?: string
          key?: Database["public"]["Enums"]["sponsor_tier"]
          name?: string
          price_monthly?: number
        }
        Relationships: []
      }
      towns: {
        Row: {
          county: string
          created_at: string
          hero_blurb: string | null
          id: string
          latitude: number
          longitude: number
          name: string
          slug: string
          state: string
          zip_codes: string[]
        }
        Insert: {
          county: string
          created_at?: string
          hero_blurb?: string | null
          id?: string
          latitude: number
          longitude: number
          name: string
          slug: string
          state?: string
          zip_codes?: string[]
        }
        Update: {
          county?: string
          created_at?: string
          hero_blurb?: string | null
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          slug?: string
          state?: string
          zip_codes?: string[]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      nearest_town: {
        Args: { lat: number; lng: number; max_km?: number }
        Returns: {
          distance_km: number
          name: string
          slug: string
        }[]
      }
      town_by_zip: {
        Args: { zip: string }
        Returns: {
          name: string
          slug: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "realtor"
      packet_status: "draft" | "generated"
      sponsor_tier: "none" | "bronze" | "silver" | "gold" | "s_tier"
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
      app_role: ["admin", "realtor"],
      packet_status: ["draft", "generated"],
      sponsor_tier: ["none", "bronze", "silver", "gold", "s_tier"],
    },
  },
} as const
