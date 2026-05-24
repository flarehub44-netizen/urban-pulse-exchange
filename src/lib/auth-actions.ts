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

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const trimmedEmail = email.trim();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const isAnonymous = session?.user?.is_anonymous;

  if (isAnonymous && session?.user) {
    const { data, error } = await supabase.auth.updateUser({
      email: trimmedEmail,
      password,
      data: { display_name: displayName.trim() },
    });
    if (error) throw new Error(authErrorMessage(error));
    if (displayName.trim().length >= 2) {
      await supabase
        .from("profiles")
        .update({ name: displayName.trim() })
        .eq("id", session.user.id);
    }
    return { data, needsEmailConfirmation: !data.user?.email_confirmed_at };
  }

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: { display_name: displayName.trim() },
      emailRedirectTo: `${window.location.origin}/auth/verify`,
    },
  });
  if (error) throw new Error(authErrorMessage(error));
  if (displayName.trim().length >= 2 && data.user?.id) {
    await supabase.from("profiles").update({ name: displayName.trim() }).eq("id", data.user.id);
  }
  return {
    data,
    needsEmailConfirmation: !data.session && !!data.user && !data.user.email_confirmed_at,
  };
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/auth/login`,
  });
  if (error) throw new Error(authErrorMessage(error));
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(authErrorMessage(error));
}
