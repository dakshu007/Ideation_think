// Progress of one closed test, computed from the testers we track.
// Google Play Console is the source of truth; this is our best estimate.

export const REQUIRED_TESTERS = 12;
export const REQUIRED_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export type TesterRow = {
  joined_at: string;
  status: 'active' | 'left' | 'completed';
  last_checkin_on: string | null;
};

export type Progress = {
  testers: number;
  atRisk: number;
  clockStartedAt: Date | null;
  day: number;
  ready: boolean;
};

/** YYYY-MM-DD in UTC, the same calendar the database uses for current_date. */
export function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computeProgress(rows: TesterRow[], now: Date = new Date()): Progress {
  const opted = rows
    .filter((r) => r.status === 'active' || r.status === 'completed')
    .sort((a, b) => Date.parse(a.joined_at) - Date.parse(b.joined_at));

  // A tester is "at risk" if they haven't checked in for 2+ days (likely to drop out).
  const twoDaysAgo = utcDay(new Date(now.getTime() - 2 * DAY_MS));
  const atRisk = opted.filter((r) => {
    if (r.status === 'completed') return false;
    const last = r.last_checkin_on ?? utcDay(new Date(r.joined_at));
    return last < twoDaysAgo;
  }).length;

  // Google's 14-day clock effectively starts once the 12th tester is in.
  const twelfth = opted[REQUIRED_TESTERS - 1];
  const clockStartedAt = twelfth ? new Date(twelfth.joined_at) : null;
  const day = clockStartedAt
    ? Math.min(REQUIRED_DAYS, Math.max(0, Math.floor((now.getTime() - clockStartedAt.getTime()) / DAY_MS)))
    : 0;

  return {
    testers: opted.length,
    atRisk,
    clockStartedAt,
    day,
    ready: opted.length >= REQUIRED_TESTERS && day >= REQUIRED_DAYS,
  };
}

/** Check-ins on these days must include one line of feedback (mirrors the database rule). */
export function feedbackRequired(nextCheckin: number): boolean {
  return nextCheckin === 1 || nextCheckin === 7 || nextCheckin === 14;
}
