import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { MarketVertical } from "@/lib/catalog-market";

const FAQ: Record<MarketVertical, { q: string; a: string }[]> = {
  transito: [
    {
      q: "O que são mercados de trânsito na ViaX?",
      a: "Previsões sobre fluxo, velocidade e congestionamento urbano com liquidação automática via dados de trânsito.",
    },
    {
      q: "Como funcionam as probabilidades?",
      a: "São implícitas no pool parimutuel: a fatia apostada em cada lado define a chance exibida.",
    },
  ],
  esportes: [
    {
      q: "Como apostar em jogos?",
      a: "Escolha Casa, Empate ou Fora. O prêmio é dividido entre quem acertar o resultado final.",
    },
  ],
  copa: [
    {
      q: "Quais mercados existem para a Copa?",
      a: "Jogos 1X2, vencedor do torneio, grupos, props e chaveamento — tudo em parimutuel.",
    },
  ],
  politica: [
    {
      q: "Como os mercados políticos são resolvidos?",
      a: "Com base em resultados oficiais documentados, validados pela equipe ViaX.",
    },
  ],
  crypto: [
    {
      q: "Os mercados crypto usam preço ao vivo?",
      a: "Mercados de faixa usam referência documentada na resolução. Slots curtos seguem janela fixa.",
    },
  ],
  tech: [
    {
      q: "O que posso prever em Tech?",
      a: "Lançamentos, IPOs, benchmarks de IA e eventos do ecossistema.",
    },
  ],
  cultura: [
    {
      q: "Que tipo de eventos entram em Cultura?",
      a: "Prêmios, entretenimento, virais e fenômenos culturais com critério claro de resolução.",
    },
  ],
  economia: [
    {
      q: "Mercados econômicos seguem calendário?",
      a: "Sim — Selic, inflação e indicadores usam divulgação oficial.",
    },
  ],
  geopolitica: [
    {
      q: "Como evitar ambiguidade?",
      a: "Cada mercado define fonte e critério de resolução antes de abrir apostas.",
    },
  ],
  comunidade: [
    {
      q: "Posso criar meu mercado?",
      a: "Sim — mercados comunitários permitem criar previsões Sim/Não com capa e prazo.",
    },
  ],
};

type CategoryFaqProps = {
  vertical: MarketVertical;
  className?: string;
};

export function CategoryFaq({ vertical, className }: CategoryFaqProps) {
  const items = FAQ[vertical] ?? FAQ.transito;
  return (
    <section className={cn("", className)}>
      <h2 className="mb-4 text-lg font-semibold">Perguntas frequentes</h2>
      <Accordion type="single" collapsible className="w-full">
        {items.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger>{item.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
