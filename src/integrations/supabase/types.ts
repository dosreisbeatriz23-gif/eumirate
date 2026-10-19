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
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          invite_code: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          invite_code?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_premium: boolean
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_premium?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_premium?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_accounts: {
        Row: {
          code: string
          created_at: string
          first_list_at: string | null
          user_id: string
        }
        Insert: {
          code?: string
          created_at?: string
          first_list_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          first_list_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referral_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          user_id: string | null
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          user_id?: string | null
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          user_id?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_events_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "referral_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_rewards: {
        Row: {
          earned_at: string
          ends_at: string | null
          starts_at: string | null
          user_id: string
        }
        Insert: {
          earned_at?: string
          ends_at?: string | null
          starts_at?: string | null
          user_id: string
        }
        Update: {
          earned_at?: string
          ends_at?: string | null
          starts_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "referral_accounts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      referral_visits: {
        Row: {
          claimed_by: string | null
          expires_at: string
          id: string
          referrer_id: string
          visited_at: string
        }
        Insert: {
          claimed_by?: string | null
          expires_at?: string
          id?: string
          referrer_id: string
          visited_at?: string
        }
        Update: {
          claimed_by?: string | null
          expires_at?: string
          id?: string
          referrer_id?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_visits_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "referral_accounts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      referrals: {
        Row: {
          first_list_at: string | null
          id: string
          qualified_at: string | null
          referred_id: string
          referrer_id: string
          signed_up_at: string
          visit_id: string
          visited_at: string
        }
        Insert: {
          first_list_at?: string | null
          id?: string
          qualified_at?: string | null
          referred_id: string
          referrer_id: string
          signed_up_at: string
          visit_id: string
          visited_at: string
        }
        Update: {
          first_list_at?: string | null
          id?: string
          qualified_at?: string | null
          referred_id?: string
          referrer_id?: string
          signed_up_at?: string
          visit_id?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "referral_accounts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referrals_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: true
            referencedRelation: "referral_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string
          expected_delivery_date: string | null
          id: string
          is_surprise: boolean
          message: string | null
          reserver_user_id: string | null
          updated_at: string
          visitor_name: string | null
          visitor_token: string | null
          wishlist_item_id: string
        }
        Insert: {
          created_at?: string
          expected_delivery_date?: string | null
          id?: string
          is_surprise?: boolean
          message?: string | null
          reserver_user_id?: string | null
          updated_at?: string
          visitor_name?: string | null
          visitor_token?: string | null
          wishlist_item_id: string
        }
        Update: {
          created_at?: string
          expected_delivery_date?: string | null
          id?: string
          is_surprise?: boolean
          message?: string | null
          reserver_user_id?: string | null
          updated_at?: string
          visitor_name?: string | null
          visitor_token?: string | null
          wishlist_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_wishlist_item_id_fkey"
            columns: ["wishlist_item_id"]
            isOneToOne: true
            referencedRelation: "wishlist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          created_at: string
          description: string | null
          external_link: string | null
          id: string
          image_url: string | null
          is_reserved: boolean
          name: string
          price_range: string | null
          priority: string | null
          updated_at: string
          visibility: string
          wishlist_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          external_link?: string | null
          id?: string
          image_url?: string | null
          is_reserved?: boolean
          name: string
          price_range?: string | null
          priority?: string | null
          updated_at?: string
          visibility?: string
          wishlist_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          external_link?: string | null
          id?: string
          image_url?: string | null
          is_reserved?: boolean
          name?: string
          price_range?: string | null
          priority?: string | null
          updated_at?: string
          visibility?: string
          wishlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_wishlist_id_fkey"
            columns: ["wishlist_id"]
            isOneToOne: false
            referencedRelation: "wishlists"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          share_token: string
          title: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          share_token?: string
          title?: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          share_token?: string
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      attribute_referral: {
        Args: { p_user_id: string; p_visit_id: string }
        Returns: boolean
      }
      claim_referral: { Args: { p_visit_id: string }; Returns: boolean }
      create_reservation: {
        Args: {
          p_item_id: string
          p_visitor_name?: string
          p_visitor_token: string
        }
        Returns: string
      }
      delete_reservation_by_token: {
        Args: { p_reservation_id: string; p_visitor_token: string }
        Returns: boolean
      }
      get_group_by_invite_code: {
        Args: { p_invite_code: string }
        Returns: {
          description: string
          icon: string
          id: string
          member_count: number
          name: string
        }[]
      }
      get_my_share_token: { Args: { p_wishlist_id: string }; Returns: string }
      get_public_wishlist: { Args: { p_token: string }; Returns: Json }
      get_referral_dashboard: { Args: never; Returns: Json }
      get_wishlist_by_share_token: { Args: { token: string }; Returns: string }
      has_premium_access: { Args: never; Returns: boolean }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      owns_wishlist: { Args: { wishlist_uuid: string }; Returns: boolean }
      owns_wishlist_item: { Args: { item_uuid: string }; Returns: boolean }
      qualify_referral: { Args: { p_user_id: string }; Returns: undefined }
      reserve_gift: {
        Args: {
          p_expected_delivery_date?: string
          p_is_surprise?: boolean
          p_item_id: string
          p_message?: string
          p_visitor_name?: string
        }
        Returns: string
      }
      start_referral_visit: { Args: { p_code: string }; Returns: string }
      track_referral_event: { Args: { p_event: string }; Returns: undefined }
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
