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
    return new AppError("INSUFFICIENT_BALANCE", "Saldo insuficiente para esta aposta.", 400);
  }
  if (text.includes("closed") || text.includes("encerr")) {
    return new AppError("MARKET_CLOSED", "Este mercado não aceita mais apostas.", 400);
  }
  return new AppError("UNKNOWN", errorMessage, 400);
}
