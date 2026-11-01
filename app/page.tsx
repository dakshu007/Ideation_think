import Link from 'next/link';
import { Arrow, Logo } from '@/components/icons';

const steps = [
  { title: 'Paste your closed test link', text: 'Takes 20 seconds.' },
  { title: "Test other devs' apps", text: 'A few minutes a day. You earn credits.' },
  { title: 'Hit 12 × 14, apply with real feedback', text: 'Every tester leaves notes you can use in Google’s form.' },
];

export default function Landing() {
  return (
    <main className="page">
      <div className="topbar">
        <span className="brand">
          <Logo /> TestLoop
        </span>
        <Link href="/login" className="link-btn">
          Sign in
        </Link>
      </div>

      <div className="stack" style={{ paddingTop: 6 }}>
        <span className="pill">For Google Play&apos;s 12 testers · 14 days rule</span>
        <h1 className="big">Get your 12 testers. Ship to production.</h1>
        <p className="lead">
          Swap tests with real Android developers. We track every tester, every day, so your 14-day clock
          doesn&apos;t reset.
        </p>
      </div>

      <Link href="/login" className="btn">
        Start free with Google
      </Link>

      <section className="stack" aria-labelledby="how">
        <h2 id="how" className="eyebrow">
          How it works
        </h2>
        {steps.map((s, i) => (
          <div key={s.title} className="card step">
            <span className="step-num">{i + 1}</span>
            <div>
              <b style={{ fontSize: 15 }}>{s.title}</b>
              <p className="small">{s.text}</p>
            </div>
          </div>
        ))}
      </section>

      <Link href="/boost" className="cta-card dark">
        <span>
          <b>In a hurry? Boost for $6</b>
          <br />
          <span className="sub">Top of the queue + a 15-tester buffer</span>
        </span>
        <Arrow />
      </Link>

      <p className="tiny center push-bottom">
        Real people on real phones only. No fake accounts — those get developer accounts banned.
      </p>
    </main>
  );
}
