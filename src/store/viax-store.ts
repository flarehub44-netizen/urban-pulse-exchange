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
  endsAt: number; // epoch ms
  pool: { YES: number; NO: number };
  participants: number;
  history: { t: number; p: number }[]; // probability history
  trend: number; // -1..1
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
  congestion: number; // 0..1
  flow: number; // cars/hour
  avgSpeed: number; // km/h
  x: number;
  y: number; // svg coords (0..100)
  r: number; // radius
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

// Initial region data used as starting values before Supabase data loads
const initialRegions: RegionData[] = [
  { id: "centro", name: "Centro", congestion: 0.78, flow: 5240, avgSpeed: 14, x: 50, y: 50, r: 9 },
  {
    id: "paulista",
    name: "Av. Paulista",
    congestion: 0.88,
    flow: 5180,
    avgSpeed: 12,
    x: 46,
    y: 54,
    r: 7,
  },
  {
    id: "fariaLima",
    name: "Faria Lima",
    congestion: 0.71,
    flow: 3320,
    avgSpeed: 19,
    x: 36,
    y: 58,
    r: 6,
  },
  {
    id: "marginal",
    name: "Marginal Tietê",
    congestion: 0.92,
    flow: 8900,
    avgSpeed: 11,
    x: 54,
    y: 32,
    r: 10,
  },
  {
    id: "pinheiros",
    name: "Pinheiros",
    congestion: 0.55,
    flow: 2780,
    avgSpeed: 24,
    x: 32,
    y: 52,
    r: 6,
  },
  {
    id: "vilaMariana",
    name: "Vila Mariana",
    congestion: 0.41,
    flow: 1900,
    avgSpeed: 28,
    x: 55,
    y: 64,
    r: 5,
  },
  { id: "moema", name: "Moema", congestion: 0.36, flow: 1620, avgSpeed: 31, x: 48, y: 70, r: 5 },
  {
    id: "tatuapé",
    name: "Tatuapé",
    congestion: 0.62,
    flow: 2940,
    avgSpeed: 22,
    x: 70,
    y: 44,
    r: 5,
  },
  { id: "lapa", name: "Lapa", congestion: 0.49, flow: 2100, avgSpeed: 26, x: 28, y: 38, r: 5 },
  {
    id: "santana",
    name: "Santana",
    congestion: 0.34,
    flow: 1480,
    avgSpeed: 33,
    x: 52,
    y: 22,
    r: 5,
  },
];

// Fallback traders shown before Supabase data loads
const fallbackTraders: Trader[] = [
  {
    id: "t1",
    name: "Lucas Andrade",
    handle: "lucasalpha",
    avatar: "https://api.dicebear.com/9.x/glass/svg?seed=Alpha",
    division: "Elite",
    accuracy: 0.812,
    roi: 1.47,
    streak: 14,
    volume: 184200,
    weeklyGrowth: 0.18,
    city: "São Paulo",
    neighborhood: "Pinheiros",
  },
  {
    id: "t2",
    name: "Marina Costa",
    handle: "mc_oracle",
    avatar: "https://api.dicebear.com/9.x/glass/svg?seed=Beta",
    division: "Diamante",
    accuracy: 0.787,
    roi: 1.31,
    streak: 9,
    volume: 142800,
    weeklyGrowth: 0.12,
    city: "São Paulo",
    neighborhood: "Vila Mariana",
  },
  {
    id: "t3",
    name: "Rafa Tanaka",
    handle: "rafarush",
    avatar: "https://api.dicebear.com/9.x/glass/svg?seed=Gamma",
    division: "Diamante",
    accuracy: 0.764,
    roi: 1.22,
    streak: 11,
    volume: 128100,
    weeklyGrowth: 0.21,
    city: "São Paulo",
    neighborhood: "Moema",
  },
  {
    id: "t4",
    name: "Bianca Reis",
    handle: "bia_predicts",
    avatar: "https://api.dicebear.com/9.x/glass/svg?seed=Delta",
    division: "Platina",
    accuracy: 0.742,
    roi: 1.14,
    streak: 6,
    volume: 98700,
    weeklyGrowth: 0.09,
    city: "Campinas",
    neighborhood: "Cambuí",
  },
  {
    id: "t5",
    name: "Diego Vargas",
    handle: "dv_quant",
    avatar: "https://api.dicebear.com/9.x/glass/svg?seed=Epsilon",
    division: "Platina",
    accuracy: 0.733,
    roi: 1.09,
    streak: 4,
    volume: 88600,
    weeklyGrowth: 0.07,
    city: "São Paulo",
    neighborhood: "Tatuapé",
  },
];

// Fallback markets for SSR and before Supabase loads
const NOW = Date.now();
const min = 60_000;

const fallbackMarkets: Market[] = [
  {
    id: "paulista-rush",
    question: "Mais de 5.200 carros passarão na Av. Paulista entre 18h–19h?",
    region: "Av. Paulista · SP",
    target: 5200,
    category: "Fluxo",
    endsAt: NOW + 42 * min,
    pool: { YES: 72400, NO: 31200 },
    participants: 578,
    history: [],
    trend: 0.2,
    aiPrediction: { value: 5432, confidence: 0.82, side: "YES" },
    status: "live",
  },
  {
    id: "marginal-tietê",
    question: "Velocidade média na Marginal Tietê ficará abaixo de 18 km/h às 19h?",
    region: "Marginal Tietê",
    target: 18,
    category: "Velocidade",
    endsAt: NOW + 28 * min,
    pool: { YES: 48900, NO: 56100 },
    participants: 376,
    history: [],
    trend: -0.1,
    aiPrediction: { value: 16, confidence: 0.71, side: "NO" },
    status: "closing",
  },
  {
    id: "faria-lima",
    question: "Mais de 3.400 carros na Faria Lima entre 17h–18h?",
    region: "Faria Lima",
    target: 3400,
    category: "Fluxo",
    endsAt: NOW + 12 * min,
    pool: { YES: 38200, NO: 22100 },
    participants: 336,
    history: [],
    trend: 0.15,
    aiPrediction: { value: 3580, confidence: 0.76, side: "YES" },
    status: "closing",
  },
  {
    id: "23-maio",
    question: "Congestionamento na 23 de Maio passará de 8 km às 18h30?",
    region: "23 de Maio",
    target: 8,
    category: "Congestionamento",
    endsAt: NOW + 65 * min,
    pool: { YES: 29800, NO: 41200 },
    participants: 394,
    history: [],
    trend: -0.05,
    aiPrediction: { value: 7, confidence: 0.64, side: "NO" },
    status: "live",
  },
  {
    id: "rebouças",
    question: "Velocidade média na Av. Rebouças abaixo de 22 km/h às 19h?",
    region: "Av. Rebouças",
    target: 22,
    category: "Velocidade",
    endsAt: NOW + 91 * min,
    pool: { YES: 18400, NO: 12900 },
    participants: 174,
    history: [],
    trend: 0.1,
    aiPrediction: { value: 20, confidence: 0.69, side: "YES" },
    status: "live",
  },
  {
    id: "anhangabaú",
    question: "Pico de pedestres no Vale do Anhangabaú ultrapassará 12k às 18h?",
    region: "Vale do Anhangabaú",
    target: 12000,
    category: "Evento",
    endsAt: NOW + 134 * min,
    pool: { YES: 9800, NO: 11400 },
    participants: 186,
    history: [],
    trend: -0.08,
    aiPrediction: { value: 11200, confidence: 0.58, side: "NO" },
    status: "live",
  },
  {
    id: "imigrantes",
    question: "Tempo médio Imigrantes → Cubatão ficará acima de 95 min às 18h?",
    region: "Rod. dos Imigrantes",
    target: 95,
    category: "Velocidade",
    endsAt: NOW + 178 * min,
    pool: { YES: 24600, NO: 18300 },
    participants: 240,
    history: [],
    trend: 0.12,
    aiPrediction: { value: 98, confidence: 0.74, side: "YES" },
    status: "live",
  },
  {
    id: "brigadeiro",
    question: "Mais de 2.100 carros na Brigadeiro entre 18h–19h?",
    region: "Av. Brigadeiro",
    target: 2100,
    category: "Fluxo",
    endsAt: NOW + 7 * min,
    pool: { YES: 14200, NO: 17800 },
    participants: 178,
    history: [],
    trend: -0.06,
    aiPrediction: { value: 1980, confidence: 0.61, side: "NO" },
    status: "closing",
  },
];

const initialAiAccuracy = Array.from({ length: 30 }, (_, i) => ({
  t: NOW - (30 - i) * 24 * 60 * min,
  ai: 0.68 + Math.sin(i / 3) * 0.05 + i * 0.003,
  human: 0.58 + Math.cos(i / 4) * 0.04 + i * 0.002,
}));

const seedFeed: FeedPost[] = [
  {
    id: "seed-f1",
    user: { ...fallbackTraders[0], verified: true },
    text: "Marginal Tietê deve fechar abaixo de 18 km/h no rush — muita gente previu o NÃO.",
    time: NOW - 12 * min,
    marketId: "marginal-tietê",
    likes: 42,
    comments: 8,
    reposts: 5,
    tag: "Análise",
  },
  {
    id: "seed-f2",
    user: { ...fallbackTraders[1], verified: true },
    text: "Alerta: acidente reportado altura Cebolão. Evitem prever fluxo alto na Marginal nas próximas 2h.",
    time: NOW - 28 * min,
    marketId: "marginal-tietê",
    likes: 118,
    comments: 24,
    reposts: 31,
    tag: "Alerta",
  },
  {
    id: "seed-f3",
    user: { ...fallbackTraders[2], verified: true },
    text: "Paulista 18h–19h: UrbanMind e eu divergem. Vou no SIM com participação menor.",
    time: NOW - 45 * min,
    marketId: "paulista-rush",
    likes: 67,
    comments: 12,
    reposts: 9,
    tag: "Previsão",
  },
];

const seedNotifications: ViaXNotification[] = [
  {
    id: "seed-n1",
    kind: "market",
    text: "Novo mercado: Congestionamento na 23 de Maio",
    time: NOW - 5 * min,
    marketId: "23-maio",
  },
  {
    id: "seed-n2",
    kind: "alert",
    text: "Chuva moderada prevista na zona oeste às 17h30",
    time: NOW - 18 * min,
  },
  {
    id: "seed-n3",
    kind: "rank",
    text: "Você subiu 3 posições no ranking da cidade",
    time: NOW - 2 * 60 * min,
  },
  {
    id: "seed-n4",
    kind: "win",
    text: "Você ganhou 184 BRL no mercado Av. Paulista",
    time: NOW - 4 * 60 * min,
    marketId: "paulista-rush",
  },
  {
    id: "seed-n5",
    kind: "market",
    text: "Prêmio da Faria Lima passou de 60 mil BRL",
    time: NOW - 55 * min,
    marketId: "faria-lima",
  },
];

const seedTransactions: Transaction[] = [
  { id: "seed-t1", type: "deposit", amount: 1000, time: NOW - 7 * 24 * 60 * min },
  {
    id: "seed-t2",
    type: "entry",
    market: "Av. Paulista",
    amount: 120,
    time: NOW - 2 * 24 * 60 * min,
  },
  { id: "seed-t3", type: "entry", market: "Marginal Tietê", amount: 80, time: NOW - 36 * 60 * min },
  { id: "seed-t4", type: "payout", market: "Faria Lima", amount: 210, time: NOW - 12 * 60 * min },
];

export const LIVE_EVENTS = [
  {
    kind: "alerta" as const,
    text: "Acidente reportado na Marginal Tietê altura Cebolão",
    time: "agora",
    marketId: "marginal-tietê",
  },
  {
    kind: "evento" as const,
    text: "Show no Vale do Anhangabaú aumenta fluxo de pedestres",
    time: "5 min",
    marketId: "anhangabaú",
  },
  {
    kind: "clima" as const,
    text: "Chuva moderada prevista na zona oeste a partir das 17h30",
    time: "12 min",
  },
  {
    kind: "alerta" as const,
    text: "Obras na Rebouças reduzem 1 faixa",
    time: "28 min",
    marketId: "rebouças",
  },
];

interface ViaXState {
  // Fallback / animation state (real data comes from Supabase via TanStack Query)
  markets: Market[];
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
  // Animation tick — updates pools/regions for visual simulation
  tick: () => void;
}

export const useViaX = create<ViaXState>((set, get) => ({
  markets: fallbackMarkets,
  regions: initialRegions,
  traders: fallbackTraders,
  feed: seedFeed,
  notifications: seedNotifications,
  transactions: seedTransactions,
  aiAccuracy: initialAiAccuracy,
  me: {
    name: "Você",
    handle: "viax_trader",
    avatar: "https://api.dicebear.com/9.x/glass/svg?seed=ViaXYou",
    balance: 1000.0,
    xp: 0,
    xpToNext: 2000,
    division: "Bronze",
    streak: 0,
    volume24h: 0,
    accuracy: 0.5,
    roi: 0,
    pnl: 0,
  },

  tick: () => {
    const s = get();
    // Visual animation only — real pool values are anchored by Supabase Realtime
    const updated = s.markets.map((m) => {
      if (m.status === "settled" || m.status === "resolved" || m.status === "void") return m;
      const driftY = (Math.random() - 0.49) * 600 + m.trend * 80;
      const driftN = (Math.random() - 0.49) * 600 - m.trend * 80;
      const YES = Math.max(2000, m.pool.YES + driftY);
      const NO = Math.max(2000, m.pool.NO + driftN);
      const total = YES + NO;
      const p = YES / total;
      const history = [...m.history.slice(-49), { t: Date.now(), p }];
      const newTrend = Math.max(-1, Math.min(1, m.trend + (Math.random() - 0.5) * 0.2));
      const participants =
        m.participants + (Math.random() < 0.6 ? 1 + Math.floor(Math.random() * 3) : 0);
      return { ...m, pool: { YES, NO }, history, trend: newTrend, participants };
    });
    set({ markets: updated });
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
