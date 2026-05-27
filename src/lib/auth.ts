import type { Session, User } from "@supabase/supabase-js";

export type AuthSessionState = {
  userId: string | null;
  user: User | null;
  session: Session | null;
  isRegistered: boolean;
  email: string | null;
};

export function isFormalSessionUser(user: User | null): boolean {
  if (!user) return false;
  if (user.is_anonymous === true) return false;
  const email = user.email?.trim();
  return Boolean(email && user.email_confirmed_at);
}

export function parseAuthSession(session: Session | null): AuthSessionState {
  const user = session?.user ?? null;
  const userId = user?.id ?? null;
  const email = user?.email?.trim() || null;
  const isRegistered = isFormalSessionUser(user);

  return {
    userId,
    user,
    session,
    isRegistered,
    email,
  };
}

export function authErrorMessage(error: { message: string } | null): string {
  if (!error) return "Erro desconhecido";
  const m = error.message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("user already registered")) return "Este e-mail já está cadastrado.";
  if (m.includes("password")) return "Senha inválida (mínimo 6 caracteres).";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("signup_disabled") || m.includes("signups not allowed")) {
    return "Cadastro desativado no Supabase. Habilite signups em Authentication → Providers → Email.";
  }
  return error.message;
}
