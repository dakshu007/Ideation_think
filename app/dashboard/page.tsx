import Link from 'next/link';
import Alert from '@/components/Alert';
import BottomNav from '@/components/BottomNav';
import { Arrow } from '@/components/icons';
import { computeProgress, REQUIRED_DAYS, REQUIRED_TESTERS, utcDay, type TesterRow } from '@/lib/progress';
import { requireOnboardedUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type AppRow = {
  id: string;
  app_name: string;
  package_name: string;
  status: 'active' | 'done';
  boosted_until: string | null;
  assignments: TesterRow[];
};

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ added?: string }> }) {
  const { added } = await searchParams;
  const { supabase, user, profile } = await requireOnboardedUser();
  const today = utcDay(new Date());

  const [{ data: apps }, { data: mine }] = await Promise.all([
    supabase
      .from('apps')
      .select('id, app_name, package_name, status, boosted_until, assignments(joined_at, status, last_checkin_on)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .returns<AppRow[]>(),
    supabase.from('assignments').select('id, last_checkin_on').eq('tester_id', user.id).eq('status', 'active'),
  ]);

  const activeTests = mine ?? [];
  const leftToday = activeTests.filter((a) => a.last_checkin_on !== today).length;
  const firstName = profile.full_name?.split(' ')[0];

  return (
    <>
      <main className="page with-nav">
        <div className="topbar">
          <span style={{ fontSize: 22, fontWeight: 800 }}>Hi{firstName ? `, ${firstName}` : ' there'}</span>
          <span className="pill" title="Credits put your app higher in other testers' queues">
            {profile.credits} credits
          </span>
        </div>

        <Alert success={added ? 'App added. Testers can now find it in their queue.' : undefined} />

        {(apps ?? []).map((app) => {
          const p = computeProgress(app.assignments, new Date());
          const need = Math.max(0, REQUIRED_TESTERS - p.testers);
          const boosted = app.boosted_until && Date.parse(app.boosted_until) > Date.now();
          return (
            <section key={app.id} className="card lg stack-lg" aria-label={app.app_name}>
              <div className="row">
                <span className="app-icon">{app.app_name.slice(0, 1)}</span>
                <div className="grow">
                  <b>{app.app_name}</b>
                  <p className="tiny">{app.package_name}</p>
                </div>
                {app.status === 'done' ? (
                  <span className="pill dark">Done</span>
                ) : p.ready ? (
                  <span className="pill">Ready to apply</span>
                ) : need > 0 ? (
                  <span className="pill warn">Needs {need}</span>
                ) : (
                  <span className="pill">{boosted ? 'Boosted' : 'Clock running'}</span>
                )}
              </div>

              <div className="stack" style={{ gap: 6 }}>
                <div className="spread" style={{ fontSize: 14 }}>
                  <b>Testers opted in</b>
                  <span>
                    <b>{p.testers}</b> / {REQUIRED_TESTERS}
                  </span>
                </div>
                <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={REQUIRED_TESTERS} aria-valuenow={p.testers}>
                  <div
                    className={p.testers >= REQUIRED_TESTERS ? '' : 'warn'}
                    style={{ width: `${Math.min(100, (p.testers / REQUIRED_TESTERS) * 100)}%` }}
                  />
                </div>
                {p.atRisk > 0 && (
                  <p className="tiny" style={{ color: 'var(--warn)' }}>
                    {p.atRisk} tester{p.atRisk > 1 ? 's' : ''} quiet for 2+ days — they may drop out.
                  </p>
                )}
              </div>

              <div className="stack" style={{ gap: 6 }}>
                <div className="spread" style={{ fontSize: 14 }}>
                  <b>14-day clock</b>
                  <span>
                    Day <b>{p.day}</b> of {REQUIRED_DAYS}
                  </span>
                </div>
                <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={REQUIRED_DAYS} aria-valuenow={p.day}>
                  <div style={{ width: `${(p.day / REQUIRED_DAYS) * 100}%` }} />
                </div>
                <p className="tiny">
                  {p.ready
                    ? 'Check Play Console, then apply for production. Use your testers’ feedback in the form.'
                    : 'Starts once 12 testers are in. Play Console is the final word.'}
                </p>
              </div>
            </section>
          );
        })}

        {(apps ?? []).length === 0 && (
          <Link href="/onboarding/app" className="card row" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="grow">
              <b>Add your app</b>
              <p className="small">Paste your closed test link to start collecting testers.</p>
            </div>
            <Arrow />
          </Link>
        )}

        <Link href="/test" className="cta-card green">
          <span>
            <b>{leftToday > 0 ? `Today: open ${leftToday} app${leftToday > 1 ? 's' : ''}` : 'Find apps to test'}</b>
            <br />
            <span className="sub">
              {leftToday > 0 ? `${activeTests.length - leftToday} done · keeps your streak + credits` : 'Each daily check-in = 1 credit'}
            </span>
          </span>
          <Arrow />
        </Link>

        <div className="stats">
          <div className="stat">
            <span className="tiny">Streak</span>
            <b>
              {profile.streak} day{profile.streak === 1 ? '' : 's'}
            </b>
          </div>
          <div className="stat">
            <span className="tiny">Apps you&apos;re testing</span>
            <b>{activeTests.length}</b>
          </div>
        </div>

        {(apps ?? []).length > 0 && (apps ?? []).filter((a) => a.status === 'active').length < 3 && (
          <Link href="/onboarding/app" className="link-btn">
            + Add another app
          </Link>
        )}

        <form action="/auth/signout" method="post" className="center">
          <button type="submit" className="link-btn" style={{ color: 'var(--muted)' }}>
            Sign out ({profile.email})
          </button>
        </form>
      </main>
      <BottomNav active="/dashboard" />
    </>
  );
}
