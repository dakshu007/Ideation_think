import BottomNav from '@/components/BottomNav';
import { requireOnboardedUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Row = {
  id: number;
  day: string;
  day_number: number;
  feedback: string;
  assignments: { apps: { app_name: string; owner_id: string } };
};

export default async function FeedbackPage() {
  const { supabase, user } = await requireOnboardedUser();

  const { data } = await supabase
    .from('checkins')
    .select('id, day, day_number, feedback, assignments!inner(apps!inner(app_name, owner_id))')
    .eq('assignments.apps.owner_id', user.id)
    .not('feedback', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)
    .returns<Row[]>();

  const rows = data ?? [];

  return (
    <>
      <main className="page with-nav">
        <h1 style={{ fontSize: 24 }}>Feedback on your apps</h1>
        <p className="small" style={{ color: 'var(--ink-2)' }}>
          Testers leave a line on day 1, 7 and 14. Use these when Google asks what you learned from your closed
          test and what you changed.
        </p>

        {rows.length === 0 ? (
          <p className="empty card">No feedback yet. It arrives as testers reach day 1, 7 and 14.</p>
        ) : (
          <div className="stack">
            {rows.map((r) => (
              <article key={r.id} className="card stack" style={{ gap: 6 }}>
                <div className="spread">
                  <b style={{ fontSize: 14 }}>{r.assignments.apps.app_name}</b>
                  <span className="pill">Day {r.day_number}</span>
                </div>
                <p style={{ fontSize: 15 }}>{r.feedback}</p>
                <p className="tiny">{r.day}</p>
              </article>
            ))}
          </div>
        )}
      </main>
      <BottomNav active="/feedback" />
    </>
  );
}
