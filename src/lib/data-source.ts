/** Em produção só dados do Supabase; seed Zustand só em dev local. */
export const USE_SEED_FALLBACK = import.meta.env.DEV;

export function pickDbOrSeed<T>(db: T | undefined, seed: T): T {
  if (db !== undefined) return db;
  if (USE_SEED_FALLBACK) return seed;
  return seed;
}

export function pickDbOrEmptyArray<T>(db: T[] | undefined, seed: T[]): T[] {
  if (db !== undefined) return db;
  if (USE_SEED_FALLBACK) return seed;
  return [];
}
