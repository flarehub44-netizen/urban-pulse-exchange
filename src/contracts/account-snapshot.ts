import { z } from "zod";

export const ownProfileSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  avatar: z.string(),
  division: z.enum(["Bronze", "Prata", "Ouro", "Platina", "Diamante", "Elite"]),
  balance: z.number(),
  xp: z.number(),
  xpToNext: z.number(),
  streak: z.number(),
  streakMultiplier: z.number(),
  streakFreezesLeft: z.number(),
  recoveryMode: z.boolean(),
  recoveryDaysLeft: z.number(),
  accuracy: z.number(),
  roi: z.number(),
  pnl: z.number(),
  volume24h: z.number(),
  city: z.string(),
  neighborhood: z.string(),
  isAdmin: z.boolean(),
});

export const transactionSchema = z.object({
  id: z.string(),
  type: z.enum(["deposit", "withdraw", "entry", "payout", "refund"]),
  market: z.string().optional(),
  amount: z.number(),
  time: z.number(),
});

export const accountContextSnapshotSchema = z.object({
  auth: z.object({
    authenticated: z.boolean(),
    registered: z.boolean(),
    anonymous: z.boolean(),
    email: z.string().nullable().optional(),
  }),
  trader: z.object({
    profile_id: z.string(),
    handle: z.string(),
    name: z.string(),
    account_kind: z.string(),
  }),
  partner: z.object({
    role: z.enum(["none", "applicant", "partner"]),
    status: z.string().optional(),
    slug: z.string().optional(),
    tier: z.string().optional(),
    verified: z.boolean().optional(),
    balance: z.number().optional(),
  }),
  admin: z.object({
    is_admin: z.boolean(),
    can_claim_invite: z.boolean().optional(),
  }),
});

export const openBetSnapshotSchema = z.object({
  id: z.string(),
  marketId: z.string(),
  marketQuestion: z.string(),
  marketRegion: z.string(),
  marketStatus: z.enum([
    "draft",
    "live",
    "closing",
    "closed",
    "resolving",
    "settled",
    "dispute",
    "void",
  ]),
  marketEndsAt: z.number(),
  poolYes: z.number(),
  poolNo: z.number(),
  side: z.enum(["YES", "NO"]),
  stake: z.number(),
  share: z.number().nullable(),
  payout: z.number().nullable(),
  note: z.string().nullable(),
  createdAt: z.number(),
});

const feedUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  avatar: z.string(),
  division: z.enum(["Bronze", "Prata", "Ouro", "Platina", "Diamante", "Elite"]),
  accuracy: z.number(),
  roi: z.number(),
  streak: z.number(),
  volume: z.number(),
  weeklyGrowth: z.number(),
  city: z.string(),
  neighborhood: z.string(),
});

export const feedPostSchema = z.object({
  id: z.string(),
  user: feedUserSchema,
  text: z.string(),
  time: z.number(),
  marketId: z.string().optional(),
  likes: z.number(),
  comments: z.number(),
  reposts: z.number(),
  tag: z.enum(["Alerta", "Análise", "Previsão", "Insight"]).optional(),
});

export const notificationSchema = z.object({
  id: z.string(),
  kind: z.enum(["win", "alert", "rank", "market", "closing", "refund", "void"]),
  text: z.string(),
  time: z.number(),
  read: z.boolean().optional(),
  marketId: z.string().optional(),
});

export const walletOverviewSchema = z.object({
  profile: ownProfileSnapshotSchema,
  transactions: z.array(transactionSchema),
});

export const dashboardSnapshotSchema = z.object({
  profile: ownProfileSnapshotSchema,
  transactions: z.array(transactionSchema),
  accountContext: accountContextSnapshotSchema,
});

export const engagementSnapshotSchema = z.object({
  bets: z.array(openBetSnapshotSchema),
  feed: z.array(feedPostSchema),
  notifications: z.array(notificationSchema),
});

export type OwnProfileSnapshotContract = z.infer<typeof ownProfileSnapshotSchema>;
export type AccountContextSnapshotContract = z.infer<typeof accountContextSnapshotSchema>;
export type WalletOverviewContract = z.infer<typeof walletOverviewSchema>;
export type DashboardSnapshotContract = z.infer<typeof dashboardSnapshotSchema>;
export type EngagementSnapshotContract = z.infer<typeof engagementSnapshotSchema>;
