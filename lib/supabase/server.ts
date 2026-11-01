import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './config';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there. The middleware refreshes them.
        }
      },
    },
  });
}

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  goal: 'get' | 'test' | null;
  android_version: string | null;
  apps_per_day: number;
  credits: number;
  streak: number;
  last_checkin_on: string | null;
  reliability: number;
  onboarded: boolean;
};

/** Signed-in user + profile, or redirect to /login. */
export async function requireUser() {
  if (!isSupabaseConfigured) redirect('/login');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  if (!profile) redirect('/login?error=' + encodeURIComponent('Your profile is still being created. Please sign in again.'));

  return { supabase, user, profile };
}

/** Same as requireUser, but sends people who haven't finished setup to /onboarding. */
export async function requireOnboardedUser() {
  const ctx = await requireUser();
  if (!ctx.profile.onboarded) redirect('/onboarding');
  return ctx;
}
