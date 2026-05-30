import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware.server";
import { requireRegisteredAuth } from "@/integrations/supabase/require-registered-middleware";
import { getSupabaseCtx, type SupabaseFnContext } from "@/integrations/supabase/context";
import { callUntypedRpc } from "@/integrations/supabase/untyped-rpc";
import type { Division, FeedPost, Side, Transaction, ViaXNotification } from "@/store/viax-store";
import { AppError } from "@/lib/server-errors";
import { logApiMetric } from "@/lib/structured-log.server";
import { assertActionVelocity } from "@/lib/velocity.server";
import { normalizeMarketStatus, type MarketStatus } from "@/lib/market-status";
import {
  accountContextSnapshotSchema,
  dashboardSnapshotSchema,
  engagementSnapshotSchema,
  ownProfileSnapshotSchema,
  walletOverviewSchema,
} from "@/contracts/account-snapshot";

const ownProfileColumns =
  "id,name,handle,avatar,division,balance,xp,xp_to_next,streak,streak_multiplier,streak_freezes_left,recovery_mode,recovery_days_left,accuracy,roi,pnl,volume_24h,city,neighborhood,is_admin" as const;

export type OwnProfileSnapshot = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  division: Division;
  balance: number;
  xp: number;
  xpToNext: number;
  streak: number;
  streakMultiplier: number;
  streakFreezesLeft: number;
  recoveryMode: boolean;
  recoveryDaysLeft: number;
  accuracy: number;
  roi: number;
  pnl: number;
  volume24h: number;
  city: string;
  neighborhood: string;
  isAdmin: boolean;
};

export type AccountContextSnapshot = {
  auth: {
    authenticated: boolean;
    registered: boolean;
    email?: string | null;
  };
  trader: {
    profile_id: string;
    handle: string;
    name: string;
    account_kind: string;
  };
  partner: {
    role: "none" | "applicant" | "partner";
    status?: string;
    slug?: string;
    tier?: string;
    verified?: boolean;
    balance?: number;
  };
  admin: {
    is_admin: boolean;
    can_claim_invite?: boolean;
  };
};

export type OpenBetSnapshot = {
  id: string;
  marketId: string;
  marketQuestion: string;
  marketRegion: string;
  marketStatus: MarketStatus;
  marketEndsAt: number;
  poolYes: number;
  poolNo: number;
  side: Side;
  stake: number;
  share: number | null;
  payout: number | null;
  note: string | null;
  createdAt: number;
};

function mapOwnProfile(row: Record<string, unknown>): OwnProfileSnapshot {
  return {
    id: row.id as string,
    name: row.name as string,
    handle: row.handle as string,
    avatar: row.avatar as string,
    division: row.division as Division,
    balance: Number(row.balance),
    xp: Number(row.xp),
    xpToNext: Number(row.xp_to_next),
    streak: Number(row.streak),
    streakMultiplier: Number(row.streak_multiplier ?? 1),
    streakFreezesLeft: Number(row.streak_freezes_left ?? 0),
    recoveryMode: Boolean(row.recovery_mode),
    recoveryDaysLeft: Number(row.recovery_days_left ?? 0),
    accuracy: Number(row.accuracy),
    roi: Number(row.roi),
    pnl: Number(row.pnl),
    volume24h: Number(row.volume_24h ?? 0),
    city: (row.city as string) ?? "",
    neighborhood: (row.neighborhood as string) ?? "",
    isAdmin: Boolean(row.is_admin),
  };
}

function mapTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    type: row.type as Transaction["type"],
    market: (row.market_label as string) ?? undefined,
    amount: Number(row.amount),
    time: new Date(row.created_at as string).getTime(),
  };
}

function mapOpenBet(row: Record<string, unknown>): OpenBetSnapshot {
  const market = row.markets as Record<string, unknown> | null;
  return {
    id: row.id as string,
    marketId: row.market_id as string,
    marketQuestion: (market?.question as string) ?? "",
    marketRegion: (market?.region as string) ?? "",
    marketStatus: normalizeMarketStatus((market?.status as string) ?? "live"),
    marketEndsAt: market?.ends_at ? new Date(market.ends_at as string).getTime() : 0,
    poolYes: Number(market?.pool_yes ?? 0),
    poolNo: Number(market?.pool_no ?? 0),
    side: row.side as Side,
    stake: Number(row.stake),
    share: row.share != null ? Number(row.share) : null,
    payout: row.payout != null ? Number(row.payout) : null,
    note: (row.note as string | null) ?? null,
    createdAt: new Date(row.created_at as string).getTime(),
  };
}

function mapFeedPost(row: Record<string, unknown>): FeedPost {
  const profile = (row.profile_public ?? row.profiles) as Record<string, unknown> | null;
  return {
    id: row.id as string,
    user: {
      id: (profile?.id ?? "") as string,
      name: (profile?.name ?? "Trader") as string,
      handle: (profile?.handle ?? "") as string,
      avatar: (profile?.avatar ?? "") as string,
      division: (profile?.division ?? "Bronze") as FeedPost["user"]["division"],
      accuracy: Number(profile?.accuracy ?? 0.5),
      roi: Number(profile?.roi ?? 0),
      streak: Number(profile?.streak ?? 0),
      volume: Number(profile?.volume_24h ?? 0),
      weeklyGrowth: 0,
      city: (profile?.city ?? "São Paulo") as string,
      neighborhood: (profile?.neighborhood ?? "") as string,
    },
    text: row.text as string,
    time: new Date(row.created_at as string).getTime(),
    marketId: (row.market_id as string) ?? undefined,
    likes: Number(row.likes ?? 0),
    comments: Number(row.comments ?? 0),
    reposts: Number(row.reposts ?? 0),
    tag: (row.tag as FeedPost["tag"]) ?? undefined,
  };
}

function mapNotification(row: Record<string, unknown>): ViaXNotification {
  return {
    id: row.id as string,
    kind: row.kind as ViaXNotification["kind"],
    text: row.text as string,
    time: new Date(row.created_at as string).getTime(),
    read: Boolean(row.read),
    marketId: (row.market_id as string) ?? undefined,
  };
}

async function loadOwnProfile(supabase: SupabaseFnContext["supabase"], userId: string) {
  const { data, error } = (await supabase
    .from("profiles")
    .select(ownProfileColumns)
    .eq("id", userId)
    .single()) as { data: Record<string, unknown> | null; error: Error | null };
  if (error || !data) {
    throw new AppError("PROFILE_NOT_FOUND", "Perfil não encontrado.", 404);
  }
  return mapOwnProfile(data);
}

async function loadTransactions(supabase: SupabaseFnContext["supabase"]) {
  const { data, error } = (await supabase
    .from("transactions")
    .select("id,type,market_label,amount,created_at")
    .order("created_at", { ascending: false })
    .limit(100)) as { data: Record<string, unknown>[] | null; error: Error | null };
  if (error) throw error;
  return (data ?? []).map(mapTransaction);
}

async function loadOpenBets(supabase: SupabaseFnContext["supabase"]) {
  const { data, error } = (await supabase
    .from("bets")
    .select(
      "id,market_id,side,stake,share,payout,note,created_at,markets(question, region, status, ends_at, pool_yes, pool_no)",
    )
    .order("created_at", { ascending: false })
    .limit(100)) as { data: Record<string, unknown>[] | null; error: Error | null };
  if (error) throw error;
  return (data ?? []).map(mapOpenBet);
}

async function loadFeed(
  supabase: SupabaseFnContext["supabase"],
  options?: { marketId?: string; limit?: number },
) {
  let query = supabase
    .from("feed_posts")
    .select(
      "id,text,market_id,likes,comments,reposts,tag,created_at,profile_public(id, name, handle, avatar, division, accuracy, roi, streak, volume_24h, city, neighborhood)",
    )
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 40);

  if (options?.marketId) query = query.eq("market_id", options.marketId);
  const { data, error } = (await query) as {
    data: Record<string, unknown>[] | null;
    error: Error | null;
  };
  if (error) throw error;
  return (data ?? []).map(mapFeedPost);
}

async function loadNotifications(
  supabase: SupabaseFnContext["supabase"],
  options?: { limit?: number },
) {
  const { data, error } = (await supabase
    .from("notifications")
    .select("id,kind,text,created_at,read,market_id")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 20)) as {
    data: Record<string, unknown>[] | null;
    error: Error | null;
  };
  if (error) throw error;
  return (data ?? []).map(mapNotification);
}

const walletOverviewInput = z
  .object({
    limit: z.number().int().min(10).max(200).optional(),
  })
  .optional();

const engagementSnapshotInput = z
  .object({
    marketId: z.string().uuid().optional(),
    feedLimit: z.number().int().min(1).max(100).optional(),
    notificationLimit: z.number().int().min(1).max(100).optional(),
    betsLimit: z.number().int().min(1).max(200).optional(),
  })
  .optional();

export const getOwnProfileFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const started = Date.now();
    const { supabase, userId } = getSupabaseCtx(context);
    const profile = await loadOwnProfile(supabase, userId);
    logApiMetric("bff.get_own_profile", { ok: true, durationMs: Date.now() - started });
    return ownProfileSnapshotSchema.parse(profile);
  });

export const getAccountContextFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const started = Date.now();
    const { supabase } = getSupabaseCtx(context);
    const { data, error } = await supabase.rpc("get_my_account_context");
    if (error) throw error;
    logApiMetric("bff.get_account_context", { ok: true, durationMs: Date.now() - started });
    return accountContextSnapshotSchema.parse(data as AccountContextSnapshot);
  });

export const getWalletOverviewFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(walletOverviewInput)
  .handler(async ({ context, data }) => {
    const started = Date.now();
    const { supabase, userId } = getSupabaseCtx(context);
    const profile = await loadOwnProfile(supabase, userId);
    const transactions = await loadTransactions(supabase);
    const limit = data?.limit ?? 100;
    const payload = { profile, transactions: transactions.slice(0, limit) };
    logApiMetric("bff.get_wallet_overview", {
      ok: true,
      durationMs: Date.now() - started,
      txCount: payload.transactions.length,
    });
    return walletOverviewSchema.parse(payload);
  });

export const getDashboardSnapshotFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requireRegisteredAuth])
  .handler(async ({ context }) => {
    const started = Date.now();
    const { supabase, userId } = getSupabaseCtx(context);
    const [profile, transactions, accountContextRes] = await Promise.all([
      loadOwnProfile(supabase, userId),
      loadTransactions(supabase),
      supabase.rpc("get_my_account_context"),
    ]);

    if (accountContextRes.error) throw accountContextRes.error;
    const payload = {
      profile,
      transactions,
      accountContext: accountContextRes.data as AccountContextSnapshot,
    };

    logApiMetric("bff.get_dashboard_snapshot", {
      ok: true,
      durationMs: Date.now() - started,
      txCount: transactions.length,
    });
    return dashboardSnapshotSchema.parse(payload);
  });

const updateProfileSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, "Apenas letras minúsculas, números e _")
    .optional(),
  city: z.string().max(80).optional(),
  neighborhood: z.string().max(80).optional(),
});

export const updateProfileFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(updateProfileSchema)
  .handler(async ({ data, context }) => {
    const started = Date.now();
    const { supabase } = getSupabaseCtx(context);
    await callUntypedRpc<void>(
      "update_profile",
      {
        p_name: data.name ?? null,
        p_handle: data.handle ?? null,
        p_city: data.city ?? null,
        p_neighborhood: data.neighborhood ?? null,
      },
      supabase,
    );
    logApiMetric("bff.update_profile", { ok: true, durationMs: Date.now() - started });
    return { ok: true };
  });

const saveProfileCpfSchema = z.object({
  cpf: z.string().min(11).max(14),
});

export const recordSignupVelocityFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ deviceId: z.string().max(128).optional() }))
  .handler(async ({ data, context }) => {
    const { userId } = getSupabaseCtx(context);
    await assertActionVelocity("signup", userId, data.deviceId);
    return { ok: true };
  });

export const saveProfileCpfFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(saveProfileCpfSchema)
  .handler(async ({ data, context }) => {
    const started = Date.now();
    const { supabase } = getSupabaseCtx(context);
    const { error } = await supabase.rpc("update_profile_cpf", { p_cpf: data.cpf });
    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("CPF_ALREADY_USED")) {
        throw new AppError("CPF_ALREADY_USED", "Este CPF já está vinculado a outra conta.", 409);
      }
      if (msg.includes("CPF_INVALID")) {
        throw new AppError("CPF_INVALID", "Informe um CPF válido.", 400);
      }
      throw error;
    }
    logApiMetric("bff.save_profile_cpf", { ok: true, durationMs: Date.now() - started });
    return { ok: true };
  });

export const getEngagementSnapshotFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(engagementSnapshotInput)
  .handler(async ({ context, data }) => {
    const started = Date.now();
    const { supabase } = getSupabaseCtx(context);
    const [bets, feed, notifications] = await Promise.all([
      loadOpenBets(supabase),
      loadFeed(supabase, { marketId: data?.marketId, limit: data?.feedLimit ?? 40 }),
      loadNotifications(supabase, { limit: data?.notificationLimit ?? 20 }),
    ]);

    const betsLimit = data?.betsLimit ?? 100;
    const payload = {
      bets: bets.slice(0, betsLimit),
      feed,
      notifications,
    };

    logApiMetric("bff.get_engagement_snapshot", {
      ok: true,
      durationMs: Date.now() - started,
      betsCount: payload.bets.length,
      feedCount: payload.feed.length,
      notificationCount: payload.notifications.length,
    });
    return engagementSnapshotSchema.parse(payload);
  });
