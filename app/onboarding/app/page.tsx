import Link from 'next/link';
import Alert from '@/components/Alert';
import CopyButton from '@/components/CopyButton';
import SubmitButton from '@/components/SubmitButton';
import { Back } from '@/components/icons';
import { testerGroupEmail } from '@/lib/supabase/config';
import { requireUser } from '@/lib/supabase/server';
import { addApp, skipAddApp } from '../actions';

export default async function AddAppPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { profile } = await requireUser();

  return (
    <main className="page">
      <div className="topbar">
        <Link href={profile.onboarded ? '/dashboard' : '/onboarding'} className="back" aria-label="Back">
          <Back />
        </Link>
        <span className="small" style={{ fontWeight: 700 }}>
          {profile.onboarded ? 'Add an app' : 'Quick setup · 2 of 2'}
        </span>
        <span style={{ width: 44 }} />
      </div>
      {!profile.onboarded && (
        <div className="progress-steps" aria-hidden="true">
          <span className="on" />
          <span className="on" />
        </div>
      )}

      <h1>Paste your closed test link</h1>
      <Alert error={error} />

      <form action={addApp} className="stack-lg" style={{ flex: 1 }}>
        <label className="field">
          Test link (from Play Console)
          <input
            name="link"
            type="url"
            inputMode="url"
            required
            className="input"
            placeholder="https://play.google.com/apps/testing/com.yourname.app"
          />
          <span className="tiny" style={{ fontWeight: 400 }}>
            Play Console → Testing → Closed testing → Testers → &quot;Join on the web&quot; link.
          </span>
        </label>

        <label className="field">
          App name
          <input name="app_name" required maxLength={60} className="input" placeholder="Habit Tracker" />
        </label>

        <div className="card stack">
          <b style={{ fontSize: 15 }}>One-time step in Play Console</b>
          <p className="small" style={{ color: 'var(--ink-2)', fontSize: 14 }}>
            Closed testing → Testers → add this Google Group. Every TestLoop tester is in it.
          </p>
          <div className="copybox">
            <code>{testerGroupEmail}</code>
            <CopyButton text={testerGroupEmail} />
          </div>
          <label className="check">
            <input type="checkbox" name="group_added" required /> I&apos;ve added the group
          </label>
        </div>

        <div className="push-bottom stack">
          <SubmitButton pendingText="Adding…">Start the exchange</SubmitButton>
        </div>
      </form>

      {!profile.onboarded && (
        <form action={skipAddApp} className="center">
          <button type="submit" className="link-btn">
            I&apos;ll add my app later
          </button>
        </form>
      )}
    </main>
  );
}
