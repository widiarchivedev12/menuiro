// Auto-generated: run `npx supabase gen types typescript --local > src/types/database.ts`
// This is a manual approximation — regenerate after any migration.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          plan: "free_testimonial" | "waitlist" | "paid";
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          plan?: "free_testimonial" | "waitlist" | "paid";
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
        };
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          business_type:
            | "cafe"
            | "restaurant"
            | "food_stall"
            | "bakery"
            | "other";
          description: string | null;
          address: string | null;
          whatsapp_number: string | null;
          opening_hours: Json | null;
          logo_path: string | null;
          cover_path: string | null;
          template_key: string;
          theme: Json;
          is_published: boolean;
          slug_changed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          business_type?:
            | "cafe"
            | "restaurant"
            | "food_stall"
            | "bakery"
            | "other";
          description?: string | null;
          address?: string | null;
          whatsapp_number?: string | null;
          opening_hours?: Json | null;
          logo_path?: string | null;
          cover_path?: string | null;
          template_key?: string;
          theme?: Json;
          is_published?: boolean;
          slug_changed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          business_type?:
            | "cafe"
            | "restaurant"
            | "food_stall"
            | "bakery"
            | "other";
          description?: string | null;
          address?: string | null;
          whatsapp_number?: string | null;
          opening_hours?: Json | null;
          logo_path?: string | null;
          cover_path?: string | null;
          template_key?: string;
          theme?: Json;
          is_published?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      social_links: {
        Row: {
          id: string;
          business_id: string;
          platform:
            | "instagram"
            | "tiktok"
            | "facebook"
            | "website"
            | "grabfood"
            | "gofood"
            | "shopeefood";
          url: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          platform:
            | "instagram"
            | "tiktok"
            | "facebook"
            | "website"
            | "grabfood"
            | "gofood"
            | "shopeefood";
          url: string;
        };
        Update: {
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "social_links_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "categories_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_items: {
        Row: {
          id: string;
          business_id: string;
          category_id: string;
          name: string;
          description: string | null;
          price: number;
          image_path: string | null;
          is_available: boolean;
          is_featured: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          category_id: string;
          name: string;
          description?: string | null;
          price: number;
          image_path?: string | null;
          is_available?: boolean;
          is_featured?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          price?: number;
          image_path?: string | null;
          is_available?: boolean;
          is_featured?: boolean;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_items_category_id_fkey";
            columns: ["category_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      templates: {
        Row: {
          key: string;
          name: string;
          is_active: boolean;
          sort_order: number;
        };
        Insert: {
          key: string;
          name: string;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: {
          name?: string;
          is_active?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Business = Database["public"]["Tables"]["businesses"]["Row"];
export type SocialLink = Database["public"]["Tables"]["social_links"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
export type Template = Database["public"]["Tables"]["templates"]["Row"];

export type Plan = Profile["plan"];
export type BusinessType = Business["business_type"];
export type SocialPlatform = SocialLink["platform"];
