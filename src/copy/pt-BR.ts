/**
 * Copy em português simples — glossário de referência:
 * - pool / prize pool → prêmio total / total apostado
 * - payout → quanto você pode ganhar / ganho
 * - ROI → retorno (%)
 * - PnL → ganhos acumulados
 * - edge → dica da IA
 * - operar / pregão / terminal → apostar / mercados / painel
 * - accuracy → precisão
 * - SIM/NÃO → mantidos nos botões
 */
import type { Side } from "@/store/viax-store";

export const copy = {
  nav: {
    home: "Início",
    markets: "Mercados",
    live: "Ao vivo",
    ranking: "Ranking",
    feed: "Feed",
    urbanmind: "UrbanMind",
    account: "Minha conta",
    settings: "Configurações",
    notifications: "Notificações",
    positions: "Minhas apostas",
    wallet: "Carteira",
    more: "Mais",
    backToApp: "Voltar ao app",
  },

  landing: {
    metaTitle: "ViaX — Previsões sobre trânsito e cidade",
    metaDescription:
      "Preveja trânsito e fluxo urbano em tempo real. Aposte com outras pessoas e compare com a UrbanMind AI. Ranking ao vivo e prêmios justos.",
    ogTitle: "ViaX — Entenda a cidade apostando no trânsito",
    ogDescription:
      "Mercados ao vivo sobre São Paulo. Prêmio compartilhado, palpite da IA e ranking da comunidade.",
    badge: "Previsões urbanas · Ao vivo",
    heroTitle: "Transforme o movimento da cidade em palpites que valem prêmio.",
    heroBody:
      "Preveja trânsito, fluxo e velocidade em tempo real. Você aposta SIM ou NÃO junto com a comunidade e com a UrbanMind AI. Quase todo o prêmio (90%) vai para quem acertar.",
    ctaEnter: "Começar agora",
    ctaMarkets: "Ver mercados",
    howEyebrow: "Como funciona",
    howTitle: "Da rua para a aposta, em poucos passos.",
    step1: "1. Escolha um mercado",
    step1Desc: "Perguntas sobre trânsito, velocidade e congestionamento em São Paulo.",
    step2: "2. Todo mundo aposta junto",
    step2Desc: "Traders entram em SIM ou NÃO. As chances mudam conforme as apostas chegam.",
    step3: "3. Acompanhe ao vivo",
    step3Desc: "Mapa, feed e palpite da IA para decidir com mais contexto.",
    step4: "4. Prêmio para quem acertar",
    step4Desc: "90% do total apostado é dividido entre os vencedores do lado certo.",
    marketsTitle: "Mercados reais da cidade, não casa de apostas.",
    marketsBody:
      "O dinheiro vai para um prêmio único. Não há odds fixas contra a plataforma — você compete com outros participantes.",
    kpiVolume: "Total apostado",
    kpiTraders: "Participantes",
    kpiAiPrecision: "Precisão da IA (30d)",
    kpiHumanPrecision: "Precisão da comunidade",
    chartTitle: "Precisão da IA vs pessoas · 30 dias",
    mapTitle: "A cidade respira. Os mercados também.",
    prizeTotal: "Prêmio total",
    leaderboardAccuracy: "Precisão",
    leaderboardReturn: "Retorno",
    mobileTitle: "Tudo no celular.",
    mobileBody: "Aposte, acompanhe e receba alertas onde estiver.",
    ctaTerminal: "Abrir app",
    footerTerminal: "Painel",
    mockLive: "Ao vivo · ViaX",
  },

  onboarding: {
    step1Title: "O que é uma previsão?",
    step1Body:
      "No ViaX você prevê o trânsito de São Paulo: escolhe SIM ou NÃO em perguntas sobre fluxo, velocidade e congestionamento.",
    step2Title: "Como apostar",
    step2Body:
      "Escolha um mercado, toque em SIM ou NÃO e defina o valor. Quanto antes você acertar, maior pode ser o que você ganha. Todo mundo aposta no mesmo prêmio.",
    step3Title: "Ganhe com precisão",
    step3Body:
      "Cada acerto melhora sua posição no ranking e desbloqueia conquistas. Use o mapa ao vivo e a UrbanMind (nossa IA) para embasar seus palpites.",
    skip: "Pular",
    next: "Próximo",
    finish: "Ver mercado em alta",
  },

  bet: {
    operateMarket: "Fazer aposta",
    prizeTotal: "Prêmio total agora",
    yourShare: "Sua parte das apostas",
    potentialWin: "Se ganhar, você recebe até",
    estimatedReturn: "Retorno estimado",
    poolNote: "90% do total vai para quem acertar · Resultado pela UrbanMind AI",
    operateCta: (side: Side, amount: string) =>
      `Apostar ${side === "YES" ? "SIM" : "NÃO"} · ${amount}`,
    processing: "Processando...",
    resolvedTitle: "Mercado encerrado",
    resolvedResult: "Resultado oficial:",
    closedTitle: "Entradas encerradas",
    closedDesc: "Aguardando coleta UrbanMind para liquidação.",
    resolvingTitle: "Resolvendo mercado",
    resolvingDesc: "Oráculo coletando dados urbanos em tempo real.",
    disputeTitle: "Mercado em disputa",
    disputeDesc: "Validação manual em andamento. Apostas congeladas.",
    voidTitle: "Mercado cancelado",
    voidDesc: "Reembolso integral creditado na carteira.",
    imbalanceWarn: "Liquidez desequilibrada — risco de cancelamento com reembolso.",
    viewWallet: "Ver carteira",
    viewHistory: "Histórico de apostas",
    sideYes: "SIM",
    sideNo: "NÃO",
    draftTitle: "Mercado em rascunho",
    draftDesc: "Aguardando abertura oficial pelo admin.",
    confirmTitle: "Confirmar aposta",
    confirmSide: "Seu palpite",
    confirmStake: "Valor da aposta",
    confirmCancel: "Voltar",
    confirmSubmit: (side: Side, amount: string) =>
      `Confirmar ${side === "YES" ? "SIM" : "NÃO"} · ${amount}`,
    confirmFeeNote: (housePct: number, prizePct: number) =>
      `A plataforma retém ${housePct.toFixed(0)}% do prêmio; ${prizePct.toFixed(0)}% é dividido entre quem acertar.`,
    confirmReturn: "Retorno estimado se ganhar",
  },

  ia: {
    badgeTooltip: "Compara o palpite da UrbanMind com o que as pessoas já apostaram neste mercado.",
    filterLabel: "Com dica da IA",
    neutral: (side: Side) => `IA em dúvida · ${side === "YES" ? "SIM" : "NÃO"}`,
    favors: (side: Side) => `A IA indica ${side === "YES" ? "SIM" : "NÃO"}`,
    edgeLabel: "Dica da IA",
    closingWithIa: "Encerrando · dica da IA",
  },

  dashboard: {
    metaTitle: "Início · ViaX",
    metaDescription: "Seu painel com mercados ao vivo, saldo e palpite da UrbanMind AI.",
    welcomeToast: "Bem-vindo ao ViaX",
    welcomeToastDesc: "Explore mercados ao vivo ou use ⌘K para buscar.",
    greeting: (name: string) => `Olá, ${name}.`,
    balance: "Saldo",
    profit24h: "Lucro 24h",
    precision: "Precisão",
    precisionSub: "Últimos 30 mercados",
    gainsChart: "Seus ganhos",
    performance: "Seus ganhos",
    gainsChartHint: "Faça sua primeira aposta para ver o gráfico de ganhos.",
    actionNow: "Ação agora",
    positionLine: "Sua aposta",
    positionEst: (amount: string) => `ganho estimado ${amount}`,
    operateMarket: "Apostar neste mercado",
    viewPanel: "Ver no painel",
    marketsHot: "Mercados em alta",
    openPositions: "Apostas abertas",
  },

  profile: {
    precision: "Precisão",
    totalReturn: "Retorno total",
    profit24h: "Lucro 24h",
    gains60d: "Ganhos · 60 dias",
    tabOverview: "Visão geral",
    tabPositions: "Minhas apostas",
    tabWallet: "Carteira",
    tabFavorites: "Favoritos",
    tabBadges: "Conquistas",
    tabActivity: "Atividade",
    tabSettings: "Configurações",
    badgeRoi: "Retorno acima de 100% em um mercado",
  },

  wallet: {
    totalReturn: "Retorno total",
    lowBalance: "Saldo baixo para apostar.",
    entry: "Aposta feita",
    payout: "Ganho de mercado",
    deposit: "Depósito",
    withdraw: "Saque",
    refund: "Reembolso",
    winsPayouts: "Vitórias e ganhos",
  },

  positions: {
    title: "Minhas apostas",
    subtitle: "Apostas em andamento com ganho estimado · histórico dos mercados já encerrados.",
    openCount: "Apostas abertas",
    totalOpen: "Total em jogo",
    estimatedGain: "Ganho estimado",
    estWin: "Se ganhar, recebe",
    estGain: "Ganho estimado",
    emptyOpen: "Nenhuma aposta aberta.",
    explore: "Explorar mercados",
    payout: "Ganho:",
  },

  settings: {
    winsGains: "Vitórias e ganhos",
    platformName: "ViaX — previsões urbanas",
    intro:
      "O ViaX é um app de previsões sobre a cidade. Quase todo o dinheiro apostado (90%) vai para quem acertar; a plataforma retém 10% para manter o serviço.",
    houseRetention: "Taxa da plataforma",
    houseRetentionValue: "10% do total apostado",
    adminTitle: "Resolução admin",
    adminDesc: "Mercados em disputa aguardam decisão manual antes da liquidação.",
    adminNoDisputes: "Nenhum mercado em disputa no momento.",
    adminResolved: "Mercado liquidado.",
    adminResolveError: "Não foi possível liquidar. Verifique permissões admin.",
    adminFreezeTitle: "Congelar mercados abertos",
    adminFreezeBtn: "Congelar",
    adminFrozen: "Mercado congelado.",
    adminUnfrozen: "Mercado descongelado.",
    adminDraftTitle: "Rascunhos",
    adminOpenBtn: "Abrir mercado",
    adminOpened: "Mercado aberto para apostas.",
    adminFrozenList: "Congelados",
    adminUnfreezeBtn: "Descongelar",
    adminCreateTitle: "Novo mercado (rascunho)",
    adminCreateQuestion: "Pergunta",
    adminCreateQuestionPh: "Ex.: O fluxo na região ultrapassará a meta?",
    adminCreateDefaultQuestion: (region: string) =>
      `A métrica urbana em ${region} ultrapassará a meta no prazo?`,
    adminCreateNeedRegion: "Selecione uma região.",
    adminCreateSuccess: "Mercado criado em rascunho.",
    adminCreateBtn: "Criar rascunho",
    adminOpsCron: "Motor pg_cron",
    adminOpsLastTick: "Último tick",
    adminOpsHealthy: "Ativo",
    adminOpsStale: "Atrasado ou com erro",
    adminOpsDisputes: "Mercados em disputa",
    adminOpsLedger: "Receita da casa (ledger)",
    adminOpsLedgerEntries: "lançamentos",
    adminClaimTitle: "Painel operador",
    adminClaimDesc:
      "Use o código de convite da equipe (uso único) ou sincronize após vincular e-mail na allowlist.",
    adminClaimPlaceholder: "Ex.: VIAX-OPS-2026",
    adminClaimBtn: "Ativar admin",
    adminClaimSyncEmail: "Sincronizar e-mail",
    adminClaimSuccess: "Acesso de operador ativado.",
    adminClaimError: "Não foi possível ativar. Verifique o código.",
    adminClaimNeedCode: "Informe o código de convite.",
    adminClaimNoAllowlist: "E-mail ainda não está na lista de operadores.",
    themeTitle: "Aparência",
    themeDark: "Tema escuro",
    themeLight: "Tema claro",
    themeDarkDesc: "Interface otimizada para ambientes com pouca luz.",
    themeLightDesc: "Alto contraste para uso diurno e telas externas.",
  },

  markets: {
    metaDescription: "Mercados ao vivo sobre trânsito e cidade na ViaX.",
    detailMeta:
      "Veja chances ao vivo, apostas da comunidade e o palpite da UrbanMind AI neste mercado.",
    sortEdge: "Com dica da IA",
    sortTrend: "Em alta",
    sortClosing: "Encerrando",
    poolTotal: "Total apostado",
    prizeTotal: "Prêmio total",
    tabBook: "Apostas",
    bookPressure: "Força das apostas",
    candlesNote: "Histórico (baseado nas chances)",
    participants: "participantes",
    tabAudit: "Auditoria",
    auditLoading: "Carregando trilha de resolução…",
    auditEmpty: "Nenhum registro de resolução ainda.",
    auditResolutions: "Resoluções",
    auditSnapshots: "Leituras do oráculo",
    auditNoSnapshots: "Sem snapshots na janela.",
    auditLedger: "Taxa da plataforma (ledger)",
    auditRaw: "Valor medido",
  },

  marketCard: {
    prizeTotal: "Prêmio total",
    traders: "participantes",
  },

  ranking: {
    followingSort: "Quem você segue, ordenado pelo retorno da última semana.",
    defaultSort: "Os melhores palpiteiros da comunidade.",
    precision: "Precisão",
    return: "Retorno",
  },

  urbanmind: {
    iaPrecisionChart: "Precisão da IA e da comunidade · 30 dias",
    betWithIa: "Apostar seguindo a IA",
    edgeVsPool: "Diferença IA × apostas",
  },

  feed: {
    metaDescription: "Análises, alertas e previsões de quem aposta no trânsito da cidade.",
    betYes: "Apostar SIM",
    betNo: "Apostar NÃO",
    prize: "Prêmio",
  },

  root: {
    backToApp: "Voltar ao app",
    errorTitle: "Algo deu errado",
    errorDesc: "Não foi possível carregar esta página. Tente de novo.",
    metaDescription:
      "Previsões sobre trânsito e cidade em tempo real. Ranking da comunidade e palpite da UrbanMind AI.",
  },

  sidebar: {
    brand: "ViaX",
  },

  errors: {
    generic: "Algo deu errado",
    genericDesc: "Tente de novo ou volte ao início.",
    marketStuck: "Não foi possível carregar este mercado",
    backToApp: "Voltar ao app",
  },

  command: {
    placeholder: "Buscar mercados, páginas, traders… (⌘K)",
    empty: "Nenhum resultado.",
    routes: "Páginas",
    markets: "Mercados",
  },

  notifications: {
    metaDescription: "Alertas de mercados, ganhos e novidades na ViaX.",
    resolveDesc: "Confira os ganhos na carteira.",
  },

  empty: {
    noFavorites: "Nenhum favorito ainda.",
    markets: {
      title: "Nenhum mercado encontrado",
      description: "Ajuste os filtros ou explore todos os mercados abertos.",
      cta: "Ver todos os mercados",
    },
    favorites: {
      title: "Nenhum favorito ainda",
      description: "Toque na ★ em qualquer card de mercado para salvar aqui.",
      cta: "Explorar mercados",
    },
    notifications: {
      title: "Nenhuma notificação",
      description: "Quando um mercado fechar ou você ganhar, o alerta aparece aqui.",
      cta: "Ver mercados",
    },
    feed: {
      title: "Feed vazio",
      description: "Seja o primeiro a publicar ou acompanhe os mercados em alta.",
      cta: "Ver mercados",
    },
    ranking: {
      title: "Ranking ainda sem dados",
      description: "Participe de mercados para aparecer no placar da comunidade.",
      cta: "Fazer uma aposta",
    },
    live: {
      regions: {
        title: "Sem regiões no mapa",
        description: "Aguarde a sincronização ou abra o painel de operações.",
        cta: "Ver mercados",
      },
      markets: {
        title: "Nenhum mercado ativo",
        description: "Novos mercados urbanos aparecem aqui quando abrirem.",
        cta: "Lista de mercados",
      },
    },
    positions: {
      title: "Nenhuma aposta aberta",
      description: "Escolha SIM ou NÃO em um mercado ao vivo para começar.",
      cta: "Explorar mercados",
    },
    wallet: {
      title: "Sem movimentações",
      description: "Depósitos simulados e ganhos de mercados resolvidos aparecem aqui.",
      cta: "Ver mercados",
    },
    dashboardFeed: {
      title: "Nenhum post no feed",
      description: "A comunidade ainda não publicou — confira os mercados ao vivo.",
      cta: "Abrir feed",
    },
    profileFavorites: {
      title: "Sem favoritos",
      description: "Marque mercados com ★ para acompanhar de perto.",
      cta: "Ir aos mercados",
    },
    traders: {
      title: "Sem histórico público",
      description: "Este trader ainda não tem resultados resolvidos visíveis.",
      cta: "Ver ranking",
    },
  },

  retention: {
    dailyPulseTitle: "Pulso diário da cidade",
    dailyPulseCta: "30 segundos para ver como está São Paulo hoje — e manter sua sequência.",
    dailyPulseDone: "Check-in feito. O mapa e os mercados te esperam.",
    checkInBtn: "Fazer check-in",
    checkingIn: "Registrando…",
    checkInSuccess: (xp: number) => `+${xp} XP · sequência atualizada`,
    alreadyCheckedIn: "Você já fez o check-in hoje.",
    openLiveMap: "Ver mapa ao vivo",
    streakDays: (n: number) => (n === 1 ? "1 dia de sequência" : `${n} dias de sequência`),
    streakAtRisk: (n: number) => `Sua sequência de ${n} dias pode zerar hoje — faça o check-in.`,
    useFreeze: "Congelar 1 dia",
    freezeUsed: "Sequência protegida por hoje.",
    freezeUnavailable: "Sem congelamentos disponíveis.",
    urbanmindDigestTitle: "UrbanMind · seu treinador urbano",
    vsAiRate: (w: number, t: number) => `Você vs IA: ${w} acertos em ${t} palpites contra a máquina`,
    openUrbanmind: "Abrir UrbanMind",
    weeklyChallengeTitle: "Desafio da semana",
    precisionReportTitle: "Seu relatório de precisão",
    allTimeAccuracy: "Precisão geral",
    weekAccuracy: "Últimos 7 dias",
    precisionReportHint: "Foco em melhorar 2 pontos percentuais — sem pressão de ranking.",
    achievementUnlocked: (name: string) => `Conquista: ${name}`,
    dailyMission: "Missão do dia",
    dailyMissionDesc: "Mercado sugerido na sua região",
    emailBonusToast: "+500 XP por proteger sua conta com e-mail.",
    pushDigestLabel: "Resumo matinal (navegador)",
    pushDigestDesc: "Lembrete opcional para check-in e pulso urbano — sem spam.",
  },

  casino: {
    wheelTitle: "Roleta diária",
    wheelDesc: "1 giro grátis por dia. Depósito de R$ 100+ libera giro bônus em 24h.",
    spinFree: "Girar grátis",
    alreadySpunToday: "Você já girou hoje",
    spinWin: (label: string) => `Resultado: ${label}`,
    nearMissJackpot: "Quase no jackpot! Deposite R$ 100 e ganhe +1 giro.",
    depositBonusCta: "Depositar e ganhar giro",
    bonusSpinGranted: "Giro bônus liberado!",
    nearMissTitle: "Quase!",
    nearMissBody: (gap: number) =>
      `Você ficou a cerca de ${gap}% do equilíbrio do prêmio — na próxima pode virar.`,
    nearMissStake: (stake: string) => `Aposta: ${stake}`,
    tryAnotherMarket: "Tentar outro mercado",
    reloadAndContinue: (amt: string) => `Recarregar ${amt} e continuar`,
    lowBalanceBanner: (bal: string) => `Saldo baixo (${bal}) — recarregue em 1 toque`,
    oneTapReload: (amt: string) => `Recarregar ${amt}`,
    depositSuccess: (bal: string) => `Saldo atualizado: ${bal}`,
    maxQuick: (amt: number) => `Máx. rápido · R$ ${amt}`,
    impulseDepositTitle: "Recarga rápida",
    impulseDepositHint: "Valores pré-definidos — máx. 3 recargas por hora.",
    hotZoneLabel: "Zona quente",
  },

  responsiblePlay: {
    disclaimerShort:
      "Saldo simulado. Giros e recargas rápidas são para entretenimento — defina limites e use com moderação.",
    understood: "Entendi",
    settingsTitle: "Modo intenso (roleta e recargas)",
    settingsDesc:
      "Desligue para ocultar roleta, near-miss e banners de recarga. Check-in e hábitos saudáveis continuam ativos.",
    intenseOn: "Modo intenso ativo",
    intenseOff: "Modo tranquilo (sem cassino)",
    optOutSaved: "Preferência salva.",
  },

  admin: {
    title: "Control Center",
    subtitle: "Trading & Urban Intelligence",
    backToApp: "Voltar ao app",
    accessDenied: "Acesso restrito a operadores.",
    nav: {
      overview: "Overview",
      markets: "Mercados",
      settlement: "Liquidação",
      intelligence: "IA & Dados",
      sources: "Fontes",
      finance: "Financeiro",
      users: "Usuários",
      risk: "Risco",
      system: "Sistema",
      simulator: "Simulador",
    },
    metrics: {
      volumeToday: "Volume hoje",
      revenueToday: "Receita (10%)",
      activeMarkets: "Mercados ativos",
      dau: "Usuários ativos (24h)",
      openPools: "Pools abertos",
      disputes: "Em disputa",
      cronStatus: "Motor cron",
      liveFeed: "Feed ao vivo",
    },
    markets: {
      title: "Prediction Engine",
      create: "Criar mercado",
      forceClose: "Forçar fechamento",
      tableStatus: "Status",
      tableVolume: "Volume",
    },
    settlement: {
      title: "Settlement Engine",
      poolTotal: "Pool total",
      houseFee: "Taxa plataforma",
      prize: "Prêmio líquido",
      reprocess: "Reprocessar oráculo",
      execute: "Liquidar",
    },
    simulator: {
      title: "Simulador urbano",
      rush: "Horário de pico",
      rain: "Chuva forte",
      preview: "Preview regiões",
      applyNote: "Cenários afetam apenas simulação local até integração completa.",
    },
    sources: {
      title: "Fontes de dados",
      synthetic: "Regiões (simulador)",
      cameras: "Câmeras",
      addCamera: "Adicionar câmera",
    },
    intelligence: {
      yoloDemo: "Rodar inferência demo (YOLO)",
      yoloDemoDone: "Demo: 42 veículos · 18 pedestres (simulado)",
      yoloNote: "Modelo real exige worker GPU; este botão só valida o fluxo ops.",
    },
    users: {
      freeze: "Congelar",
      unfreeze: "Descongelar",
      betLimit: "Limite aposta",
    },
    risk: {
      title: "Risco & fraude",
      empty: "Nenhum alerta no momento.",
    },
    system: {
      title: "DNA do produto",
      save: "Salvar",
      casinoEnabled: "Mecânicas estilo cassino",
      casinoEnabledHint: "Roleta, near-miss e depósito impulsivo no app.",
      impulseMaxHour: "Máx. recargas rápidas / hora",
    },
  },
} as const;

export function betSideLabel(side: Side): "SIM" | "NÃO" {
  return side === "YES" ? "SIM" : "NÃO";
}

export function toastBetSuccess(side: Side, stake: string, payout: string) {
  return {
    title: `Aposta ${betSideLabel(side)} · ${stake}`,
    description: `${copy.bet.potentialWin}: ${payout}`,
  };
}

export function iaEdgeLabel(side: Side, edgePp: number): string {
  if (Math.abs(edgePp) < 1) return copy.ia.neutral(side);
  return copy.ia.favors(side);
}
