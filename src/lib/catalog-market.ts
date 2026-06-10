import type { Side } from "@/lib/parimutuel";
import type { FootballOutcome } from "@/lib/football-parimutuel";

export type CatalogMarketType = "binary" | "football_1x3" | "multi_outcome" | "crypto_slot";
export type CatalogMarketSource =
  | "platform"
  | "football"
  | "prediction"
  | "community"
  | "crypto_slot";

export type MarketVertical =
  | "transito"
  | "esportes"
  | "copa"
  | "politica"
  | "crypto"
  | "tech"
  | "cultura"
  | "economia"
  | "geopolitica"
  | "comunidade";

export type CatalogOutcome = {
  id: string;
  slug: string;
  label: string;
  pool: number;
  probability: number;
};

export type CatalogMarket = {
  id: string;
  type: CatalogMarketType;
  source: CatalogMarketSource;
  question: string;
  vertical: MarketVertical;
  status: string;
  endsAt: string;
  imageUrl: string | null;
  volume: number;
  participants: number;
  trend: number;
  outcomes: CatalogOutcome[];
  topics: string[];
  detailPath: string;
};

export type CatalogTopicCount = {
  slug: string;
  label: string;
  vertical: MarketVertical;
  count: number;
};

export const MARKET_VERTICALS: { slug: MarketVertical; label: string; href: string }[] = [
  { slug: "transito", label: "Trânsito", href: "/v/transito" },
  { slug: "copa", label: "Copa do Mundo", href: "/copa" },
  { slug: "esportes", label: "Esportes", href: "/v/esportes" },
  { slug: "politica", label: "Política", href: "/v/politica" },
  { slug: "crypto", label: "Crypto", href: "/v/crypto" },
  { slug: "tech", label: "Tech", href: "/v/tech" },
  { slug: "cultura", label: "Cultura", href: "/v/cultura" },
  { slug: "economia", label: "Economia", href: "/v/economia" },
  { slug: "comunidade", label: "Comunidade", href: "/v/comunidade" },
];

export function parseCatalogMarkets(raw: unknown): CatalogMarket[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseCatalogMarket).filter(Boolean) as CatalogMarket[];
}

export function parseCatalogMarket(row: unknown): CatalogMarket | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const outcomesRaw = r.outcomes;
  const outcomes: CatalogOutcome[] = Array.isArray(outcomesRaw)
    ? outcomesRaw.map((o) => {
        const x = o as Record<string, unknown>;
        return {
          id: String(x.id ?? ""),
          slug: String(x.slug ?? ""),
          label: String(x.label ?? ""),
          pool: Number(x.pool ?? 0),
          probability: Number(x.probability ?? 0),
        };
      })
    : [];

  return {
    id: String(r.id ?? ""),
    type: (r.type as CatalogMarketType) ?? "binary",
    source: (r.source as CatalogMarketSource) ?? "platform",
    question: String(r.question ?? ""),
    vertical: (r.vertical as MarketVertical) ?? "transito",
    status: String(r.status ?? "live"),
    endsAt: String(r.endsAt ?? r.ends_at ?? ""),
    imageUrl: r.imageUrl != null ? String(r.imageUrl) : null,
    volume: Number(r.volume ?? 0),
    participants: Number(r.participants ?? 0),
    trend: Number(r.trend ?? 0),
    outcomes,
    topics: Array.isArray(r.topics) ? r.topics.map(String) : [],
    detailPath: String(r.detailPath ?? r.detail_path ?? `/markets/${r.id}`),
  };
}

/** Map catalog outcome id to place_bet side for binary markets */
export function binarySideFromOutcomeId(outcomeId: string): Side {
  return outcomeId === "NO" || outcomeId.toLowerCase() === "no" ? "NO" : "YES";
}

/** Map catalog outcome id to football outcome */
export function footballOutcomeFromId(outcomeId: string): FootballOutcome {
  if (outcomeId === "DRAW") return "DRAW";
  if (outcomeId === "AWAY") return "AWAY";
  return "HOME";
}

export function isVerticalSlug(value: string): value is MarketVertical {
  return MARKET_VERTICALS.some((v) => v.slug === value);
}

export function verticalLabel(slug: MarketVertical): string {
  return MARKET_VERTICALS.find((v) => v.slug === slug)?.label ?? slug;
}
