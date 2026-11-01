import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { Back, Check } from '@/components/icons';

const perks = [
  ['Top of every tester’s queue', 'for 14 days'],
  ['Target 15 testers', 'a 3-person safety buffer'],
  ['Priority for replacements', 'when someone drops out'],
  ['Feedback summary', 'ready for Google’s production form'],
];

export default function BoostPage() {
  return (
    <>
      <main className="page with-nav">
        <Link href="/dashboard" className="back" aria-label="Back to dashboard">
          <Back />
        </Link>

        <div className="stack">
          <span className="pill dark">One-time · per app</span>
          <h1>Boost your test</h1>
          <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 44, fontWeight: 800 }}>$6</span>
            <span className="small">about ₹499 in India</span>
          </div>
        </div>

        <ul className="checks card lg">
          {perks.map(([title, rest]) => (
            <li key={title}>
              <Check color="#0E7A5A" />
              <span>
                <b>{title}</b> {rest}
              </span>
            </li>
          ))}
        </ul>

        <button type="button" className="btn" disabled>
          UPI &amp; card payments — coming soon
        </button>
        <Link href="/test" className="btn secondary">
          Swap tests for free instead
        </Link>

        <p className="tiny center push-bottom">
          Every tester is a real person on a real Android phone. We never use fake or bulk-made Google accounts.
          Google decides production access — nobody can guarantee it.
        </p>
      </main>
      <BottomNav active="/boost" />
    </>
  );
}
