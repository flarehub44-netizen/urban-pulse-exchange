export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function mapSupabaseBusinessError(errorMessage: string): AppError {
  const text = errorMessage.toLowerCase();

  if (text.includes("insufficient") || text.includes("saldo")) {
    return new AppError("INSUFFICIENT_BALANCE", "Saldo insuficiente para esta operação.", 400);
  }
  if (text.includes("closed") || text.includes("encerr")) {
    return new AppError("MARKET_CLOSED", "Este mercado não aceita mais apostas.", 400);
  }
  if (text.includes("market_already_resolved") || text.includes("already resolved")) {
    return new AppError("MARKET_RESOLVED", "Este mercado já foi encerrado.", 409);
  }
  if (
    text.includes("duplicate_bet") ||
    text.includes("already bet") ||
    text.includes("already_bet")
  ) {
    return new AppError("DUPLICATE_BET", "Você já tem uma previsão neste mercado.", 409);
  }
  if (text.includes("kyc_required") || text.includes("kyc required")) {
    return new AppError("KYC_REQUIRED", "Verificação de identidade necessária para sacar.", 403);
  }
  if (text.includes("event_expired") || text.includes("expired")) {
    return new AppError("EVENT_EXPIRED", "Este evento já expirou.", 410);
  }
  if (text.includes("league_full") || text.includes("league full")) {
    return new AppError("LEAGUE_FULL", "Esta liga atingiu o limite de membros.", 400);
  }
  if (text.includes("invalid_invite") || text.includes("invite_code")) {
    return new AppError("INVALID_INVITE", "Código de convite inválido ou expirado.", 400);
  }
  if (text.includes("registration_required")) {
    return new AppError("REGISTRATION_REQUIRED", "Conclua o cadastro para continuar.", 403);
  }

  return new AppError("UNKNOWN", errorMessage, 400);
}
