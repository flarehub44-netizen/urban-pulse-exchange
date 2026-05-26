import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export type SupabaseFnContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
};
