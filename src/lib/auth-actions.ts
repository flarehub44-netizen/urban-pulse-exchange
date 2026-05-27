import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/auth";

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw new Error(authErrorMessage(error));
  return data;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
  cpf: string,
  phone: string,
) {
  const trimmedEmail = email.trim();
  const trimmedName = displayName.trim();
  const cpfDigits = cpf.replace(/\D/g, "");
  const phoneDigits = phone.replace(/\D/g, "");

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: {
        display_name: trimmedName,
        cpf: cpfDigits,
        phone: phoneDigits,
      },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw new Error(authErrorMessage(error));
  if (trimmedName.length >= 2 && data.user?.id) {
    await supabase
      .from("profiles")
      .update({ name: trimmedName, cpf: cpfDigits, phone: phoneDigits })
      .eq("id", data.user.id);
  }
  return {
    data,
    needsEmailConfirmation: !data.session && !!data.user && !data.user.email_confirmed_at,
  };
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
  });
  if (error) throw new Error(authErrorMessage(error));
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(authErrorMessage(error));
}
