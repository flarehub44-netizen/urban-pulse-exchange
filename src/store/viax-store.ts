import { create } from "zustand";
import { HOUSE_RETENTION } from "@/lib/parimutuel";

export type Side = "YES" | "NO";

export interface Market {
  id: string;
  question: string;
  region: string;
  target: number;
  category: "Fluxo" | "Velocidade" | "Congestionamento" | "Evento";
  endsAt: number; // epoch ms
  pool: { YES: number; NO: number };
  participants: number;
  history: { t: number; p: number }[]; // probability history
  trend: number; // -1..1
  aiPrediction: { value: number; confidence: number; side: Side };
  status: "live" | "closing" | "resolved";
  resolved?: Side;
}

export interface FeedPost {
  id: string;
  user: { name: string; handle: string; verified: boolean; avatar: string; division: Division };
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
  x: number; y: number; // svg coords (0..100)
  r: number; // radius
}

export interface ViaXNotification {
  id: string;
  kind: "win" | "alert" | "rank" | "market";
  text: string;
  time: number;
  read?: boolean;
}

export interface Transaction {
  id: string;
  type: "deposit" | "withdraw" | "entry" | "payout";
  market?: string;
  amount: number; // positive in/out — signed below in UI
  time: number;
}

const avatars = [
  "https://api.dicebear.com/9.x/glass/svg?seed=Alpha",
  "https://api.dicebear.com/9.x/glass/svg?seed=Beta",
  "https://api.dicebear.com/9.x/glass/svg?seed=Gamma",
  "https://api.dicebear.com/9.x/glass/svg?seed=Delta",
  "https://api.dicebear.com/9.x/glass/svg?seed=Epsilon",
  "https://api.dicebear.com/9.x/glass/svg?seed=Zeta",
  "https://api.dicebear.com/9.x/glass/svg?seed=Eta",
  "https://api.dicebear.com/9.x/glass/svg?seed=Theta",
  "https://api.dicebear.com/9.x/glass/svg?seed=Iota",
  "https://api.dicebear.com/9.x/glass/svg?seed=Kappa",
];

const NOW = Date.now();
const min = 60_000;

const mkMarket = (
  id: string,
  question: string,
  region: string,
  target: number,
  category: Market["category"],
  endsInMin: number,
  yes: number,
  no: number,
  aiSide: Side,
  aiConf: number,
): Market => {
  const total = yes + no;
  const startP = yes / total;
  const history = Array.from({ length: 40 }, (_, i) => {
    const drift = (Math.sin(i / 4) + Math.cos(i / 7)) * 0.05;
    return { t: NOW - (40 - i) * min, p: Math.max(0.05, Math.min(0.95, startP + drift)) };
  });
  return {
    id, question, region, target, category,
    endsAt: NOW + endsInMin * min,
    pool: { YES: yes, NO: no },
    participants: Math.floor((yes + no) / 180),
    history, trend: 0,
    aiPrediction: { value: target + Math.round((Math.random() - 0.5) * 800), confidence: aiConf, side: aiSide },
    status: endsInMin < 15 ? "closing" : "live",
  };
};

const initialMarkets: Market[] = [
  mkMarket("paulista-rush", "Mais de 5.200 carros passarão na Av. Paulista entre 18h–19h?", "Av. Paulista · SP", 5200, "Fluxo", 42, 72400, 31200, "YES", 0.82),
  mkMarket("marginal-tietê", "Velocidade média na Marginal Tietê ficará abaixo de 18 km/h às 19h?", "Marginal Tietê", 18, "Velocidade", 28, 48900, 56100, "NO", 0.71),
  mkMarket("faria-lima", "Mais de 3.400 carros na Faria Lima entre 17h–18h?", "Faria Lima", 3400, "Fluxo", 12, 38200, 22100, "YES", 0.76),
  mkMarket("23-maio", "Congestionamento na 23 de Maio passará de 8 km às 18h30?", "23 de Maio", 8, "Congestionamento", 65, 29800, 41200, "NO", 0.64),
  mkMarket("rebouças", "Velocidade média na Av. Rebouças abaixo de 22 km/h às 19h?", "Av. Rebouças", 22, "Velocidade", 91, 18400, 12900, "YES", 0.69),
  mkMarket("anhangabaú", "Pico de pedestres no Vale do Anhangabaú ultrapassará 12k às 18h?", "Vale do Anhangabaú", 12000, "Evento", 134, 9800, 11400, "NO", 0.58),
  mkMarket("imigrantes", "Tempo médio Imigrantes → Cubatão ficará acima de 95 min às 18h?", "Rod. dos Imigrantes", 95, "Velocidade", 178, 24600, 18300, "YES", 0.74),
  mkMarket("brigadeiro", "Mais de 2.100 carros na Brigadeiro entre 18h–19h?", "Av. Brigadeiro", 2100, "Fluxo", 7, 14200, 17800, "NO", 0.61),
];

const regions: RegionData[] = [
  { id: "centro", name: "Centro", congestion: 0.78, flow: 5240, avgSpeed: 14, x: 50, y: 50, r: 9 },
  { id: "paulista", name: "Av. Paulista", congestion: 0.88, flow: 5180, avgSpeed: 12, x: 46, y: 54, r: 7 },
  { id: "fariaLima", name: "Faria Lima", congestion: 0.71, flow: 3320, avgSpeed: 19, x: 36, y: 58, r: 6 },
  { id: "marginal", name: "Marginal Tietê", congestion: 0.92, flow: 8900, avgSpeed: 11, x: 54, y: 32, r: 10 },
  { id: "pinheiros", name: "Pinheiros", congestion: 0.55, flow: 2780, avgSpeed: 24, x: 32, y: 52, r: 6 },
  { id: "vilaMariana", name: "Vila Mariana", congestion: 0.41, flow: 1900, avgSpeed: 28, x: 55, y: 64, r: 5 },
  { id: "moema", name: "Moema", congestion: 0.36, flow: 1620, avgSpeed: 31, x: 48, y: 70, r: 5 },
  { id: "tatuapé", name: "Tatuapé", congestion: 0.62, flow: 2940, avgSpeed: 22, x: 70, y: 44, r: 5 },
  { id: "lapa", name: "Lapa", congestion: 0.49, flow: 2100, avgSpeed: 26, x: 28, y: 38, r: 5 },
  { id: "santana", name: "Santana", congestion: 0.34, flow: 1480, avgSpeed: 33, x: 52, y: 22, r: 5 },
];

const traders: Trader[] = [
  { id: "t1", name: "Lucas Andrade",  handle: "lucasalpha",   avatar: avatars[0], division: "Elite",    accuracy: 0.812, roi: 1.47, streak: 14, volume: 184200, weeklyGrowth: 0.18, city: "São Paulo", neighborhood: "Pinheiros" },
  { id: "t2", name: "Marina Costa",   handle: "mc_oracle",    avatar: avatars[1], division: "Diamante", accuracy: 0.787, roi: 1.31, streak: 9,  volume: 142800, weeklyGrowth: 0.12, city: "São Paulo", neighborhood: "Vila Mariana" },
  { id: "t3", name: "Rafa Tanaka",    handle: "rafarush",     avatar: avatars[2], division: "Diamante", accuracy: 0.764, roi: 1.22, streak: 11, volume: 128100, weeklyGrowth: 0.21, city: "São Paulo", neighborhood: "Moema" },
  { id: "t4", name: "Bianca Reis",    handle: "bia_predicts", avatar: avatars[3], division: "Platina",  accuracy: 0.742, roi: 1.14, streak: 6,  volume: 98700,  weeklyGrowth: 0.09, city: "Campinas",  neighborhood: "Cambuí" },
  { id: "t5", name: "Diego Vargas",   handle: "dv_quant",     avatar: avatars[4], division: "Platina",  accuracy: 0.733, roi: 1.09, streak: 4,  volume: 88600,  weeklyGrowth: 0.07, city: "São Paulo", neighborhood: "Tatuapé" },
  { id: "t6", name: "Helena Mori",    handle: "helmori",      avatar: avatars[5], division: "Ouro",     accuracy: 0.701, roi: 0.92, streak: 5,  volume: 72400,  weeklyGrowth: -0.04, city: "São Paulo", neighborhood: "Lapa" },
  { id: "t7", name: "Igor Pereira",   handle: "igorflux",     avatar: avatars[6], division: "Ouro",     accuracy: 0.688, roi: 0.86, streak: 3,  volume: 61500,  weeklyGrowth: 0.03, city: "Santos",    neighborhood: "Gonzaga" },
  { id: "t8", name: "Sofia Liu",      handle: "sof.liu",      avatar: avatars[7], division: "Prata",    accuracy: 0.652, roi: 0.74, streak: 2,  volume: 42100,  weeklyGrowth: 0.06, city: "São Paulo", neighborhood: "Brooklin" },
  { id: "t9", name: "Pedro Ramos",    handle: "pedror",       avatar: avatars[8], division: "Prata",    accuracy: 0.641, roi: 0.68, streak: 1,  volume: 38900,  weeklyGrowth: -0.02, city: "São Paulo", neighborhood: "Santana" },
  { id: "t10", name: "Cris Bertolini", handle: "crisb",       avatar: avatars[9], division: "Bronze",   accuracy: 0.602, roi: 0.51, streak: 0,  volume: 21400,  weeklyGrowth: 0.02, city: "São Paulo", neighborhood: "Mooca" },
];

const initialFeed: FeedPost[] = [
  { id: "f1", user: traders[0], text: "Acidente na Marginal entre Cebolão e Lapa derruba fluxo em 22%. Probabilidade do NÃO no mercado da Marginal sobe para 58%.", time: NOW - 3*min, marketId: "marginal-tietê", likes: 184, comments: 32, reposts: 41, tag: "Alerta" },
  { id: "f2", user: traders[1], text: "Histórico: chuva forte em Pinheiros reduz fluxo na Faria Lima em ~18%. Estou no NÃO hoje.", time: NOW - 11*min, marketId: "faria-lima", likes: 96, comments: 14, reposts: 22, tag: "Análise" },
  { id: "f3", user: traders[2], text: "UrbanMind está com 82% no SIM da Paulista. Eu acompanho — fluxo dos últimos 5 dias confirma.", time: NOW - 18*min, marketId: "paulista-rush", likes: 142, comments: 28, reposts: 36, tag: "Previsão" },
  { id: "f4", user: traders[3], text: "Padrão de quartas-feiras: pico de fluxo na 23 de Maio acontece 15 min antes. Cuidado com a hora de fechamento.", time: NOW - 24*min, marketId: "23-maio", likes: 71, comments: 9, reposts: 12, tag: "Insight" },
  { id: "f5", user: traders[4], text: "Volume entrando pesado no SIM da Faria Lima. +R$ 6.8k nos últimos 4 min.", time: NOW - 30*min, marketId: "faria-lima", likes: 58, comments: 6, reposts: 9 },
  { id: "f6", user: traders[5], text: "Bati 9 acertos seguidos 🔥 obrigado UrbanMind por confirmar minha leitura na Rebouças.", time: NOW - 41*min, marketId: "rebouças", likes: 211, comments: 47, reposts: 19 },
  { id: "f7", user: traders[6], text: "Show da Madonna no Vale do Anhangabaú lotou. Pedestres acima do esperado.", time: NOW - 55*min, marketId: "anhangabaú", likes: 312, comments: 88, reposts: 122, tag: "Alerta" },
  { id: "f8", user: traders[7], text: "Imigrantes no NÃO parece teto barato — chuva no litoral já começou.", time: NOW - 72*min, marketId: "imigrantes", likes: 44, comments: 5, reposts: 7, tag: "Análise" },
];

const initialNotifications: ViaXNotification[] = [
  { id: "n1", kind: "rank",   text: "🔥 Você entrou no Top 10 da cidade de São Paulo.", time: NOW - 2*min },
  { id: "n2", kind: "market", text: "⚡ Probabilidade do OVER na Paulista subiu para 78%.", time: NOW - 9*min },
  { id: "n3", kind: "win",    text: "🏆 Você venceu 82% dos usuários hoje — +R$ 312.", time: NOW - 24*min },
  { id: "n4", kind: "alert",  text: "🚨 Acidente detectado próximo da Av. Paulista. Reavalie suas posições.", time: NOW - 31*min },
  { id: "n5", kind: "market", text: "📈 Volume do mercado da Faria Lima cresceu 24% em 10 min.", time: NOW - 48*min },
];

const initialTx: Transaction[] = [
  { id: "tx1", type: "payout",  market: "Rebouças OVER",      amount: 412, time: NOW - 1*60*min },
  { id: "tx2", type: "entry",   market: "Paulista 18h–19h",   amount: 200, time: NOW - 3*60*min },
  { id: "tx3", type: "entry",   market: "Faria Lima 17h–18h", amount: 150, time: NOW - 5*60*min },
  { id: "tx4", type: "payout",  market: "Marginal 19h",       amount: 670, time: NOW - 9*60*min },
  { id: "tx5", type: "deposit", amount: 1000, time: NOW - 2*24*60*min },
  { id: "tx6", type: "entry",   market: "23 de Maio 18h30",   amount: 80,  time: NOW - 26*60*min },
  { id: "tx7", type: "payout",  market: "Brigadeiro 18h",     amount: 240, time: NOW - 30*60*min },
  { id: "tx8", type: "withdraw", amount: 500, time: NOW - 5*24*60*min },
];

interface ViaXState {
  markets: Market[];
  regions: RegionData[];
  traders: Trader[];
  feed: FeedPost[];
  notifications: ViaXNotification[];
  transactions: Transaction[];
  me: {
    name: string; handle: string; avatar: string;
    balance: number; xp: number; xpToNext: number;
    division: Division; streak: number; volume24h: number;
    accuracy: number; roi: number; pnl: number;
  };
  aiAccuracy: { t: number; ai: number; human: number }[];
  tick: () => void;
  placeBet: (marketId: string, side: Side, stake: number) => void;
}

const initialAiAccuracy = Array.from({ length: 30 }, (_, i) => ({
  t: NOW - (30 - i) * 24 * 60 * min,
  ai: 0.68 + Math.sin(i / 3) * 0.05 + i * 0.003,
  human: 0.58 + Math.cos(i / 4) * 0.04 + i * 0.002,
}));

export const useViaX = create<ViaXState>((set, get) => ({
  markets: initialMarkets,
  regions,
  traders,
  feed: initialFeed,
  notifications: initialNotifications,
  transactions: initialTx,
  aiAccuracy: initialAiAccuracy,
  me: {
    name: "Você",
    handle: "viax_trader",
    avatar: "https://api.dicebear.com/9.x/glass/svg?seed=ViaXYou",
    balance: 4280.5,
    xp: 7420,
    xpToNext: 9000,
    division: "Platina",
    streak: 7,
    volume24h: 3120,
    accuracy: 0.732,
    roi: 0.41,
    pnl: 1840,
  },

  tick: () => {
    const s = get();
    const updated = s.markets.map((m) => {
      if (m.status === "resolved") return m;
      // random walk on each side, slight bias from trend
      const driftY = (Math.random() - 0.49) * 600 + m.trend * 80;
      const driftN = (Math.random() - 0.49) * 600 - m.trend * 80;
      const YES = Math.max(2000, m.pool.YES + driftY);
      const NO = Math.max(2000, m.pool.NO + driftN);
      const total = YES + NO;
      const p = YES / total;
      const history = [...m.history.slice(-49), { t: Date.now(), p }];
      const newTrend = Math.max(-1, Math.min(1, m.trend + (Math.random() - 0.5) * 0.2));
      const participants = m.participants + (Math.random() < 0.6 ? 1 + Math.floor(Math.random() * 3) : 0);
      return { ...m, pool: { YES, NO }, history, trend: newTrend, participants };
    });
    set({ markets: updated });
    // update region congestion subtly
    set({
      regions: s.regions.map((r) => ({
        ...r,
        congestion: Math.max(0.15, Math.min(0.98, r.congestion + (Math.random() - 0.5) * 0.04)),
        flow: Math.max(400, Math.round(r.flow + (Math.random() - 0.5) * 280)),
        avgSpeed: Math.max(6, Math.min(48, r.avgSpeed + (Math.random() - 0.5) * 1.4)),
      })),
    });
  },

  placeBet: (marketId, side, stake) => {
    const s = get();
    if (stake <= 0 || stake > s.me.balance) return;
    set({
      me: { ...s.me, balance: s.me.balance - stake, volume24h: s.me.volume24h + stake },
      markets: s.markets.map((m) =>
        m.id === marketId
          ? { ...m, pool: { ...m.pool, [side]: m.pool[side] + stake }, participants: m.participants + 1 }
          : m,
      ),
      transactions: [
        { id: "tx_" + Date.now(), type: "entry", market: s.markets.find(m=>m.id===marketId)?.region ?? "Mercado", amount: stake, time: Date.now() },
        ...s.transactions,
      ],
    });
  },
}));

export const HOUSE = HOUSE_RETENTION;
