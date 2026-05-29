/** Sempre usar dados reais do Supabase; sem fallback de seed no client. */
export const USE_SEED_FALLBACK = false;

export function pickDbOrSeed<T>(db: T | undefined, _seed: T): T | undefined {
  return db;
}

export function pickDbOrEmptyArray<T>(db: T[] | undefined, _seed: T[]): T[] {
  return db ?? [];
}
