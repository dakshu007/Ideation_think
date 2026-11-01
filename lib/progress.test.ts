import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeProgress, feedbackRequired, type TesterRow } from './progress.ts';

const now = new Date('2026-11-20T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
const today = '2026-11-20';

function testers(n: number, joinedDaysAgo: number): TesterRow[] {
  return Array.from({ length: n }, () => ({ joined_at: daysAgo(joinedDaysAgo), status: 'active', last_checkin_on: today }));
}

test('clock does not start before 12 testers', () => {
  const p = computeProgress(testers(9, 5), now);
  assert.equal(p.testers, 9);
  assert.equal(p.day, 0);
  assert.equal(p.clockStartedAt, null);
  assert.equal(p.ready, false);
});

test('clock starts at the 12th tester and caps at 14', () => {
  const rows = [...testers(11, 20), ...testers(1, 6)];
  assert.equal(computeProgress(rows, now).day, 6);
  assert.equal(computeProgress(testers(12, 30), now).day, 14);
  assert.equal(computeProgress(testers(12, 30), now).ready, true);
});

test('people who left do not count, quiet testers are at risk', () => {
  const rows: TesterRow[] = [
    ...testers(10, 8),
    { joined_at: daysAgo(8), status: 'left', last_checkin_on: today },
    { joined_at: daysAgo(8), status: 'active', last_checkin_on: '2026-11-15' },
    { joined_at: daysAgo(8), status: 'completed', last_checkin_on: '2026-11-01' },
  ];
  const p = computeProgress(rows, now);
  assert.equal(p.testers, 12);
  assert.equal(p.atRisk, 1);
});

test('feedback days', () => {
  assert.deepEqual([1, 2, 7, 13, 14].map(feedbackRequired), [true, false, true, false, true]);
});
