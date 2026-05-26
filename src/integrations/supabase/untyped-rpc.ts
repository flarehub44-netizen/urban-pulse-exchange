import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { supabase as defaultClient } from "./client";

type UntypedRpc = (
  fn: string,
  params?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

/**
 * Chama uma RPC do Supabase que ainda não está nos tipos gerados pelo Database.
 * Centraliza o único cast necessário para RPCs não tipadas.
 * Prefira adicionar a RPC via `supabase gen types` quando possível.
 */
export async function callUntypedRpc<T>(
  fnName: string,
  params?: Record<string, unknown>,
  client?: SupabaseClient<Database>,
): Promise<T> {
  const c = client ?? defaultClient;
  const { data, error } = await (c.rpc as unknown as UntypedRpc)(fnName, params);
  if (error) throw new Error(error.message);
  return data as T;
}
