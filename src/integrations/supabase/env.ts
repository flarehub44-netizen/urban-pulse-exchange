import { assertPublishableSupabaseKey } from "@/lib/supabase-key-guard";

const FALLBACK_SUPABASE_URL = "https://rzhffxiicufqcabmhscq.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6aGZmeGlpY3VmcWNhYm1oc2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjczNzUsImV4cCI6MjA5NDk0MzM3NX0.mZioGLaEUpRhsl0Hdkcj01GysdYA3nOhOMXj7msTMHA";

/** Resolves Supabase URL and anon/publishable key for browser (Vite) and SSR/Worker. */
export function resolveSupabasePublicEnv(): { url: string; publishableKey: string } {
  const serverEnv = typeof process !== "undefined" ? process.env : undefined;

  const url = import.meta.env.VITE_SUPABASE_URL || serverEnv?.SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const publishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    serverEnv?.SUPABASE_PUBLISHABLE_KEY ||
    FALLBACK_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    const missing = [
      ...(!url ? ["VITE_SUPABASE_URL or SUPABASE_URL"] : []),
      ...(!publishableKey ? ["VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    throw new Error(
      `Missing Supabase environment variable(s): ${missing.join(", ")}. ` +
        "Copy .env.example to .env.local and fill in your project credentials.",
    );
  }

  assertPublishableSupabaseKey(publishableKey);

  return { url, publishableKey };
}
