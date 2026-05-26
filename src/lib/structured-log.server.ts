type LogPayload = { ok?: boolean; durationMs?: number; [key: string]: unknown };

/** Structured JSON logs for Worker cron jobs (Cloudflare Logpush). */
export function logJob(job: string, payload: LogPayload): void {
  console.log(
    JSON.stringify({
      job,
      ts: new Date().toISOString(),
      ...payload,
    }),
  );
}

/** Structured API/BFF metrics for p50/p95 analysis in logs. */
export function logApiMetric(endpoint: string, payload: LogPayload): void {
  console.log(
    JSON.stringify({
      kind: "api_metric",
      endpoint,
      ts: new Date().toISOString(),
      ...payload,
    }),
  );
}

export async function withJobLog<T extends LogPayload>(
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
