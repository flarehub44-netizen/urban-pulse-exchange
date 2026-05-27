import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export type SupabaseFnContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
};

/**
 * Extrai o contexto Supabase do middleware TanStack Start.
 * Substitui o padrão `context as unknown as SupabaseFnContext` em handlers.
 * Inclui guard de desenvolvimento para detectar contexto ausente antes de chegar à produção.
 */
export function getSupabaseCtx(context: unknown): SupabaseFnContext {
  const ctx = context as SupabaseFnContext;
  if (process.env.NODE_ENV !== "production") {
    if (!ctx?.supabase)
      throw new Error("[getSupabaseCtx] supabase ausente no contexto do middleware");
    if (!ctx?.userId) throw new Error("[getSupabaseCtx] userId ausente no contexto do middleware");
  }
  return ctx;
}
