import type { MarketVertical } from "@/lib/catalog-market";

const POPULAR_BY_VERTICAL: Record<MarketVertical, { label: string; href: string }[]> = {
  transito: [
    { label: "Marginal Tietê fluxo", href: "/v/transito" },
    { label: "Trânsito SP", href: "/markets?segment=transito" },
  ],
  esportes: [
    { label: "Jogos ao vivo", href: "/v/esportes" },
    { label: "Agenda futebol", href: "/football" },
  ],
  copa: [
    { label: "Campeão Copa 2026", href: "/pm/pm-copa-winner-2026" },
    { label: "Grupo A", href: "/pm/pm-copa-group-a" },
    { label: "Props Messi", href: "/pm/pm-copa-messi-plays" },
  ],
  politica: [
    { label: "Eleições Peru", href: "/pm/pm-pol-peru-president" },
    { label: "Eleições EUA", href: "/pm/pm-pol-us-election" },
    { label: "Reforma tributária", href: "/pm/pm-pol-tax-reform" },
  ],
  crypto: [
    { label: "Bitcoin junho", href: "/pm/pm-crypto-btc-june" },
    { label: "ETH acima de 4k", href: "/pm/pm-crypto-eth-4k" },
    { label: "Solana ETF", href: "/pm/pm-crypto-sol-etf" },
  ],
  tech: [
    { label: "Melhor IA junho", href: "/pm/pm-tech-best-ai-june" },
    { label: "IPO SpaceX", href: "/pm/pm-tech-spacex-ipo" },
    { label: "Apple WWDC", href: "/pm/pm-tech-apple-wwdc" },
  ],
  cultura: [
    { label: "Neymar gol Copa", href: "/pm/pm-cult-neymar-goal" },
    { label: "Oscar melhor filme", href: "/pm/pm-cult-oscar-film" },
    { label: "BBB vencedor", href: "/pm/pm-cult-bbb-winner" },
  ],
  economia: [
    { label: "Selic dezembro", href: "/pm/pm-eco-selic-dec" },
    { label: "IPCA junho", href: "/pm/pm-eco-ipca-june" },
    { label: "Dólar abaixo de 5", href: "/pm/pm-eco-usd-5" },
  ],
  geopolitica: [{ label: "Acordo comercial", href: "/v/geopolitica" }],
  comunidade: [
    { label: "Criar mercado", href: "/markets/create" },
    { label: "Comunidade", href: "/markets?segment=outros" },
  ],
};

export function catalogFooterLinks(vertical: MarketVertical) {
  return POPULAR_BY_VERTICAL[vertical] ?? [];
}
