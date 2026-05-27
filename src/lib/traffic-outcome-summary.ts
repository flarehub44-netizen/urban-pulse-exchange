import type { MarketStatus } from "@/lib/market-status";

export type TrafficOutcomeInput = {
  status: MarketStatus;
  target: number;
  comparisonOp: string | null;
  resolutionMetric: string | null;
  category: string;
  rawValue: number | null;
  derivedSide: string | null;
  resolved: "YES" | "NO" | null;
};

function comparisonLabel(op: string | null): string {
  if (op === "gt") return "acima de";
  if (op === "gte") return "acima ou igual a";
  if (op === "lt") return "abaixo de";
  if (op === "lte") return "abaixo ou igual a";
  return "em relação a";
}

function metricLabel(metric: string | null, category: string): string {
  if (metric === "avg_speed") return "velocidade média";
  if (metric === "flow") return "fluxo";
  if (metric === "congestion") return "congestionamento";
  if (category === "Velocidade") return "velocidade";
  if (category === "Congestionamento") return "congestionamento";
  return "indicador";
}

function formatMeasuredValue(raw: number, metric: string | null, category: string): string {
  if (metric === "avg_speed" || category === "Velocidade") {
    return `${raw.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km/h`;
  }
  return raw.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function formatTarget(target: number, metric: string | null, category: string): string {
  if (metric === "avg_speed" || category === "Velocidade") {
    return `${target.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} km/h`;
  }
  return target.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export function formatTrafficOutcomeSummary(input: TrafficOutcomeInput): string {
  if (input.status === "void") {
    return "Cancelado · reembolso integral aos participantes.";
  }
  if (input.status === "dispute") {
    return "Em disputa · validação manual em andamento.";
  }

  const side = input.resolved ?? (input.derivedSide as "YES" | "NO" | null);
  const sideLabel = side === "YES" ? "SIM" : side === "NO" ? "NÃO" : "—";

  if (input.rawValue == null) {
    return `Resultado oficial: ${sideLabel}.`;
  }

  const measured = formatMeasuredValue(input.rawValue, input.resolutionMetric, input.category);
  const target = formatTarget(input.target, input.resolutionMetric, input.category);
  const cmp = comparisonLabel(input.comparisonOp);
  const metric = metricLabel(input.resolutionMetric, input.category);

  return `Medido ${measured} (${metric}) · meta ${cmp} ${target} · resultado ${sideLabel}.`;
}

export function trafficOutcomeStatusBadge(status: MarketStatus): string {
  if (status === "void") return "Cancelado";
  if (status === "dispute") return "Em disputa";
  return "Encerrado";
}
