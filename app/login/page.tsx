import Link from 'next/link';
import { redirect } from 'next/navigation';
import Alert from '@/components/Alert';
import SubmitButton from '@/components/SubmitButton';
import { Back, Google, Info, Logo } from '@/components/icons';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { signInWithGoogle } from './actions';

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect('/dashboard');
  }

  return (
    <main className="page">
      <Link href="/" className="back" aria-label="Back">
        <Back />
      </Link>

      <div className="stack" style={{ paddingTop: 32 }}>
        <Logo size={48} />
        <h1 style={{ marginTop: 8 }}>One tap to start</h1>
        <p className="lead">No passwords. No long forms.</p>
      </div>

      <Alert error={error} />

      {isSupabaseConfigured ? (
        <form action={signInWithGoogle}>
          <SubmitButton className="btn secondary" pendingText="Opening Google…">
            <Google /> Continue with Google
          </SubmitButton>
        </form>
      ) : (
        <p className="alert error">
          Sign-in isn&apos;t set up yet. Add the Supabase keys from <code>.env.example</code> (see README).
        </p>
      )}

      <div className="card note row" style={{ alignItems: 'flex-start' }}>
        <Info color="#8A4E05" />
        <p style={{ fontSize: 14 }}>
          <b>Use the Gmail that&apos;s signed in to Play Store on your phone.</b> Testers are added by Gmail — a
          different account won&apos;t count.
        </p>
      </div>

      <p className="tiny center push-bottom">We only read your name, email and photo from Google.</p>
    </main>
  );
}
