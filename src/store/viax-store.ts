import { create } from "zustand";
import { HOUSE_RETENTION } from "@/lib/parimutuel";
import type { MarketStatus } from "@/lib/market-status";

export type Side = "YES" | "NO";

export interface Market {
  id: string;
  question: string;
  region: string;
  regionId?: string | null;
  target: number;
  category: "Fluxo" | "Velocidade" | "Congestionamento" | "Evento";
  endsAt: number;
  pool: { YES: number; NO: number };
  participants: number;
  history: { t: number; p: number }[];
  trend: number;
  aiPrediction: { value: number; confidence: number; side: Side };
  status: MarketStatus;
  acceptBets?: boolean;
  frozen?: boolean;
  resolved?: Side;
  archived?: boolean;
  marketKind?: "platform" | "community";
  visibility?: "public" | "unlisted";
  createdBy?: string | null;
  coverUrl?: string | null;
  isTrafficSlot?: boolean;
  comparisonOp?: string | null;
  resolutionMetric?: string | null;
  startsAt?: number;
}

export interface FeedPost {
  id: string;
  user: Trader & { verified?: boolean };
  text: string;
  time: number;
  marketId?: string;
  likes: number;
  comments: number;
  reposts: number;
  tag?: "Alerta" | "Análise" | "Previsão" | "Insight";
}

export type Division = "Bronze" | "Prata" | "Ouro" | "Platina" | "Diamante" | "Elite";

export interface Trader {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  division: Division;
  accuracy: number;
  roi: number;
  streak: number;
  volume: number;
  weeklyGrowth: number;
  city: string;
  neighborhood: string;
}

export interface RegionData {
  id: string;
  name: string;
  congestion: number;
  flow: number;
  avgSpeed: number;
  x: number;
  y: number;
  r: number;
}

export interface ViaXNotification {
  id: string;
  kind: "win" | "alert" | "rank" | "market" | "closing" | "refund" | "void";
  text: string;
  time: number;
  read?: boolean;
  marketId?: string;
}

export interface Transaction {
  id: string;
  type: "deposit" | "withdraw" | "entry" | "payout" | "refund";
  market?: string;
  amount: number;
  time: number;
}

/** Mantido vazio — dados vêm do Supabase via TanStack Query. */
export const SEED_MARKETS: Market[] = [];

export type LiveMapEvent = {
  kind: "alerta" | "evento" | "clima";
  text: string;
  time: string;
  marketId?: string;
};

/** Mantido vazio — use `get_active_events` / dados reais na UI. */
export const LIVE_EVENTS: LiveMapEvent[] = [];

interface ViaXState {
  regions: RegionData[];
  traders: Trader[];
  feed: FeedPost[];
  notifications: ViaXNotification[];
  transactions: Transaction[];
  me: {
    name: string;
    handle: string;
    avatar: string;
    balance: number;
    xp: number;
    xpToNext: number;
    division: Division;
    streak: number;
    volume24h: number;
    accuracy: number;
    roi: number;
    pnl: number;
  };
  aiAccuracy: { t: number; ai: number; human: number }[];
  tick: () => void;
}

export const useViaX = create<ViaXState>((set, get) => ({
  regions: [],
  traders: [],
  feed: [],
  notifications: [],
  transactions: [],
  aiAccuracy: [],
  me: {
    name: "",
    handle: "",
    avatar: "",
    balance: 0,
    xp: 0,
    xpToNext: 2000,
    division: "Bronze",
    streak: 0,
    volume24h: 0,
    accuracy: 0,
    roi: 0,
    pnl: 0,
  },

  tick: () => {
    const s = get();
    if (s.regions.length === 0) return;
    set({
      regions: s.regions.map((r) => ({
        ...r,
        congestion: Math.max(0.15, Math.min(0.98, r.congestion + (Math.random() - 0.5) * 0.04)),
        flow: Math.max(400, Math.round(r.flow + (Math.random() - 0.5) * 280)),
        avgSpeed: Math.max(6, Math.min(48, r.avgSpeed + (Math.random() - 0.5) * 1.4)),
      })),
    });
  },
}));

export const HOUSE = HOUSE_RETENTION;
