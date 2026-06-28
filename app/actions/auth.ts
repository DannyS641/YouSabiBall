'use server';

import { createClient } from '@/supabase/server';
import { revalidatePath } from 'next/cache';

export interface AuthResult {
  ok:    boolean;
  error: string | null;
  name:  string | null;
}

export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<AuthResult> {
  const supabase = await createClient();
  const name     = displayName.trim() || email.split('@')[0];

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) return { ok: false, error: error?.message ?? 'Sign-up failed', name: null };

  // Profile is created by the DB trigger; update display_name if provided
  if (displayName.trim()) {
    await supabase
      .from('profiles')
      .update({ display_name: name })
      .eq('id', data.user.id);
  }

  revalidatePath('/');
  return { ok: true, error: null, name };
}

export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { ok: false, error: error?.message ?? 'Sign-in failed', name: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', data.user.id)
    .single();

  revalidatePath('/');
  return { ok: true, error: null, name: profile?.display_name ?? email.split('@')[0] };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/');
}

export async function getSessionUser(): Promise<{ id: string; email: string; name: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  return {
    id:    user.id,
    email: user.email ?? '',
    name:  profile?.display_name ?? user.email?.split('@')[0] ?? 'GM',
  };
}
