import type { Session, User } from "@supabase/supabase-js";

export type AuthSessionState = {
  userId: string | null;
  user: User | null;
  session: Session | null;
  isGuest: boolean;
  isRegistered: boolean;
  email: string | null;
};

export function parseAuthSession(session: Session | null): AuthSessionState {
  const user = session?.user ?? null;
  const userId = user?.id ?? null;
  const email = user?.email?.trim() || null;
  const isRegistered = Boolean(email && user?.email_confirmed_at);
  const isGuest = !userId;

  return {
    userId,
    user,
    session,
    isGuest,
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
  return error.message;
}
