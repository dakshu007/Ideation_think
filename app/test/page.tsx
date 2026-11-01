import Link from 'next/link';
import Alert from '@/components/Alert';
import BottomNav from '@/components/BottomNav';
import SubmitButton from '@/components/SubmitButton';
import { Back, Check } from '@/components/icons';
import { optInUrl, storeUrl } from '@/lib/playlink';
import { feedbackRequired, REQUIRED_DAYS, utcDay } from '@/lib/progress';
import { requireOnboardedUser } from '@/lib/supabase/server';
import { checkIn, joinApp, leaveApp } from './actions';

export const dynamic = 'force-dynamic';

type Assignment = {
  id: string;
  checkin_count: number;
  last_checkin_on: string | null;
  status: 'active' | 'completed' | 'left';
  apps: { app_name: string; package_name: string } | null;
};
type Discover = { app_id: string; app_name: string; package_name: string; tester_count: number; boosted: boolean };

export default async function TestPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; joined?: string }>;
}) {
  const { error, joined } = await searchParams;
  const { supabase, user, profile } = await requireOnboardedUser();
  const today = utcDay(new Date());

  const { data: rows } = await supabase
    .from('assignments')
    .select('id, checkin_count, last_checkin_on, status, apps(app_name, package_name)')
    .eq('tester_id', user.id)
    .in('status', ['active', 'completed'])
    .order('joined_at', { ascending: true })
    .returns<Assignment[]>();

  const all = (rows ?? []).filter((r) => r.apps);
  const active = all.filter((r) => r.status === 'active');
  const completed = all.filter((r) => r.status === 'completed');
  const done = active.filter((r) => r.last_checkin_on === today).length;

  const room = Math.max(0, profile.apps_per_day - active.length);
  const { data: discover } = room > 0 ? await supabase.rpc('discover_apps', { p_limit: Math.min(room, 10) }) : { data: [] };
  const suggestions = (discover ?? []) as Discover[];

  return (
    <>
      <main className="page with-nav">
        <div className="row" style={{ minHeight: 44 }}>
          <Link href="/dashboard" className="back" aria-label="Back to dashboard">
            <Back />
          </Link>
          <h1 style={{ fontSize: 20 }}>Today&apos;s tests</h1>
        </div>

        <Alert error={error} success={joined ? 'Joined! Now tap “1. Become a tester”, then install the app.' : undefined} />

        {active.length > 0 && (
          <div className="stack" style={{ gap: 6 }}>
            <div className="spread" style={{ fontSize: 14 }}>
              <b>
                {done} of {active.length} done
              </b>
              <span className="small">+1 credit each</span>
            </div>
            <div className="bar" style={{ height: 8 }}>
              <div style={{ width: `${active.length ? (done / active.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        <p className="small" style={{ color: 'var(--ink-2)' }}>
          Open each app, use it for a minute, then tap Done. Don&apos;t uninstall or leave the test — that resets the
          developer&apos;s 14 days.
        </p>

        <div className="stack">
          {active.map((a) => {
            const app = a.apps!;
            const checkedToday = a.last_checkin_on === today;
            const next = a.checkin_count + 1;
            const needsFeedback = feedbackRequired(next);
            const isNew = a.checkin_count === 0;
            return (
              <article key={a.id} className={`card stack ${checkedToday ? 'ok' : ''}`}>
                <div className="row">
                  <span className="app-icon sm">{app.app_name.slice(0, 1)}</span>
                  <div className="grow">
                    <b style={{ fontSize: 15 }}>{app.app_name}</b>
                    <p className="tiny">
                      Day {Math.min(a.checkin_count + (checkedToday ? 0 : 1), REQUIRED_DAYS)} of {REQUIRED_DAYS}
                      {needsFeedback && !checkedToday ? ' · feedback due' : ''}
                    </p>
                  </div>
                  {checkedToday && (
                    <span className="pill row" style={{ gap: 4 }}>
                      <Check size={14} /> Done
                    </span>
                  )}
                </div>

                {!checkedToday && (
                  <>
                    {isNew ? (
                      <div className="stack" style={{ gap: 8 }}>
                        <a className="btn secondary small" style={{ width: '100%' }} href={optInUrl(app.package_name)} target="_blank" rel="noopener noreferrer">
                          1. Become a tester
                        </a>
                        <a className="btn secondary small" style={{ width: '100%' }} href={storeUrl(app.package_name)} target="_blank" rel="noopener noreferrer">
                          2. Install from Play Store
                        </a>
                      </div>
                    ) : (
                      <a className="btn secondary small" style={{ width: '100%' }} href={storeUrl(app.package_name)} target="_blank" rel="noopener noreferrer">
                        Open in Play Store
                      </a>
                    )}
                    <form action={checkIn} className="stack" style={{ gap: 8 }}>
                      <input type="hidden" name="assignment_id" value={a.id} />
                      {needsFeedback && (
                        <label className="field" style={{ fontSize: 14 }}>
                          Day-{next} feedback (one line)
                          <input
                            name="feedback"
                            required
                            maxLength={500}
                            className="input"
                            placeholder="What worked? What broke?"
                          />
                        </label>
                      )}
                      <SubmitButton className="btn small" pendingText="Saving…">
                        {isNew ? '3. I installed & opened it — Done' : 'I opened it today — Done'}
                      </SubmitButton>
                    </form>
                  </>
                )}

                <details>
                  <summary>I uninstalled / can&apos;t continue</summary>
                  <form action={leaveApp} className="stack" style={{ gap: 8 }}>
                    <input type="hidden" name="assignment_id" value={a.id} />
                    <p className="tiny">Leaving costs 10 reliability points. Please only leave if you really have to.</p>
                    <button type="submit" className="link-btn danger">
                      Leave this test
                    </button>
                  </form>
                </details>
              </article>
            );
          })}

          {active.length === 0 && (
            <p className="empty card">You&apos;re not testing any apps yet. Pick some below — each daily check-in earns 1 credit.</p>
          )}
        </div>

        <section className="stack" aria-labelledby="find">
          <h2 id="find" className="eyebrow">
            Find apps to test
          </h2>
          {room === 0 ? (
            <p className="small">
              You&apos;re testing {active.length} apps — your daily limit. Finish some, or raise your limit in setup.
            </p>
          ) : suggestions.length === 0 ? (
            <p className="empty card">No apps waiting right now. Check back later!</p>
          ) : (
            suggestions.map((s) => (
              <form key={s.app_id} action={joinApp} className="card row">
                <input type="hidden" name="app_id" value={s.app_id} />
                <span className="app-icon sm">{s.app_name.slice(0, 1)}</span>
                <div className="grow">
                  <b style={{ fontSize: 15 }}>{s.app_name}</b>
                  <p className="tiny">
                    {s.tester_count} / 12 testers{s.boosted ? ' · boosted' : ''}
                  </p>
                </div>
                <SubmitButton className="btn small" pendingText="…">
                  Join
                </SubmitButton>
              </form>
            ))
          )}
        </section>

        {completed.length > 0 && (
          <section className="stack" aria-labelledby="finished">
            <h2 id="finished" className="eyebrow">
              Finished ({completed.length})
            </h2>
            <p className="small">
              Thank you! Please keep these apps installed and stay opted in until the developer publishes.
            </p>
            {completed.map((c) => (
              <div key={c.id} className="card row ok">
                <span className="app-icon sm">{c.apps!.app_name.slice(0, 1)}</span>
                <b className="grow" style={{ fontSize: 15 }}>
                  {c.apps!.app_name}
                </b>
                <Check color="#0E7A5A" />
              </div>
            ))}
          </section>
        )}
      </main>
      <BottomNav active="/test" />
    </>
  );
}
