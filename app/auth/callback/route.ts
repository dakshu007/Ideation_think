import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const fail = (msg: string) => NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);

  if (!code) return fail(searchParams.get('error_description') ?? 'Sign-in was cancelled.');

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return fail(error?.message ?? 'Sign-in failed. Please try again.');

  const { data: profile } = await supabase.from('profiles').select('onboarded').eq('id', data.user.id).single();
  return NextResponse.redirect(`${origin}${profile?.onboarded ? '/dashboard' : '/onboarding'}`);
}
