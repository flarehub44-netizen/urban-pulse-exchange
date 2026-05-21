import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./client";

/** PostgREST schema until `types.ts` lists all tables (generated stub is empty). */
type LooseDatabase = {
  public: {
    Tables: Record<
      string,
      {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      }
    >;
    Views: Record<string, never>;
    Functions: Record<
      string,
      {
        Args: Record<string, unknown>;
        Returns: unknown;
      }
    >;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type LooseSupabaseClient = SupabaseClient<LooseDatabase>;

export const db: LooseSupabaseClient = supabase as unknown as LooseSupabaseClient;

export type SupabaseFnContext = {
  supabase: LooseSupabaseClient;
  userId: string;
};
