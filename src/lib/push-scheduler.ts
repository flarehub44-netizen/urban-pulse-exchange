// Morning Pulse + Rush Hour push notification scheduler
// Usa Web Notifications API (browser). Não requer service worker.

export type PushWindow = {
  hour: number;
  minute: number;
  title: string;
  body: (ctx: PushCtx) => string;
  tag: string;
};

export type PushCtx = {
  name: string;
  neighborhood: string;
  city: string;
  streak: number;
  openMarkets: number;
  multiplier: number;
};

const WINDOWS: PushWindow[] = [
  {
    hour: 7,
    minute: 30,
    tag: "morning-pulse",
    title: "☀️ Seu Pulso Urbano está pronto",
    body: (ctx) => {
      const region = ctx.neighborhood || ctx.city || "São Paulo";
      const streakLine = ctx.streak >= 3 ? ` Streak: ${ctx.streak} dias 🔥` : "";
      const mktLine = ctx.openMarkets > 0 ? ` ${ctx.openMarkets} mercados abertos.` : "";
      return `Bom dia, ${ctx.name}. Veja o que acontece em ${region} hoje.${mktLine}${streakLine}`;
    },
  },
  {
    hour: 17,
    minute: 0,
    tag: "rush-hour",
    title: "🚦 Hora do Pico — mercados ao vivo",
    body: (ctx) =>
      ctx.openMarkets > 0
        ? `${ctx.openMarkets} mercados de congestionamento abertos agora. Aposte antes de fechar.`
        : "O trânsito de São Paulo está no pico. Confira os mercados ao vivo.",
  },
  {
    hour: 21,
    minute: 0,
    tag: "streak-risk",
    title: "🔥 Seu streak precisa de você",
    body: (ctx) =>
      ctx.streak >= 3
        ? `${ctx.streak} dias seguidos — não perca agora. Faça o check-in de hoje.`
        : "Não esqueça do check-in diário. Construa seu streak!",
  },
];

const STORAGE_KEY = "viax_push_scheduled_date";
const PREF_KEY = "viax_notification_prefs";

function canNotify(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  );
}

function loadPushPref(): boolean {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return false;
    return JSON.parse(raw)?.pushDigest === true;
  } catch {
    return false;
  }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function scheduleForWindow(win: PushWindow, ctx: PushCtx, delayMs: number) {
  setTimeout(() => {
    if (!canNotify() || !loadPushPref()) return;
    // eslint-disable-next-line no-new
    new Notification(win.title, {
      body: win.body(ctx),
      tag: win.tag,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
    });
  }, delayMs);
}

export async function requestPushPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const perm = await Notification.requestPermission();
  return perm === "granted";
}

export function scheduleDailyPush(ctx: PushCtx) {
  if (typeof window === "undefined") return;
  if (!loadPushPref()) return;
  if (!canNotify()) return;

  const today = todayKey();
  if (localStorage.getItem(STORAGE_KEY) === today) return;
  localStorage.setItem(STORAGE_KEY, today);

  const now = new Date();
  const nowSP = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

  for (const win of WINDOWS) {
    const fireAt = new Date(nowSP);
    fireAt.setHours(win.hour, win.minute, 0, 0);
    const delayMs = fireAt.getTime() - nowSP.getTime();
    if (delayMs > 0 && delayMs < 24 * 60 * 60 * 1000) {
      scheduleForWindow(win, ctx, delayMs);
    }
  }
}
