/** Structured JSON logs for Worker cron jobs (Cloudflare Logpush). */
export function logJob(
  job: string,
  payload: Record<string, unknown> & { ok?: boolean; durationMs?: number },
): void {
  console.log(
    JSON.stringify({
      job,
      ts: new Date().toISOString(),
      ...payload,
    }),
  );
}

export async function withJobLog<T extends Record<string, unknown>>(
  job: string,
  fn: () => Promise<T>,
): Promise<T & { durationMs: number }> {
  const start = Date.now();
  try {
    const result = await fn();
    const out = { ...result, durationMs: Date.now() - start };
    logJob(job, { ok: result.ok !== false, ...out });
    return out;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logJob(job, { ok: false, error: msg, durationMs: Date.now() - start });
    throw e;
  }
}
