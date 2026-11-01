import Alert from '@/components/Alert';
import SubmitButton from '@/components/SubmitButton';
import { requireUser } from '@/lib/supabase/server';
import { saveSetup } from './actions';

const goals = [
  { value: 'get', label: 'Get testers for my app', sub: 'And test others in return' },
  { value: 'test', label: 'Just test apps', sub: 'Help devs, earn credits' },
];
const versions = ['Android 16', 'Android 15', 'Android 14', 'Android 13 or older'];
const loads = [
  { value: '5', label: '5' },
  { value: '10', label: '10' },
  { value: '15', label: '15+' },
];

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { profile } = await requireUser();
  const goal = profile.goal ?? 'get';
  const load = String(profile.apps_per_day >= 15 ? 15 : profile.apps_per_day <= 5 ? 5 : 10);

  return (
    <main className="page">
      <div className="topbar">
        <span className="small" style={{ fontWeight: 700 }}>
          Quick setup · 1 of 2
        </span>
      </div>
      <div className="progress-steps" aria-hidden="true">
        <span className="on" />
        <span />
      </div>

      <h1>3 quick taps and you&apos;re in</h1>
      <Alert error={error} />

      <form action={saveSetup} className="stack-lg" style={{ flex: 1 }}>
        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>What brings you here?</legend>
          {goals.map((g) => (
            <label key={g.value} className="choice">
              <input type="radio" name="goal" value={g.value} defaultChecked={goal === g.value} />
              <span className="face">
                <span>
                  <b style={{ fontSize: 15 }}>{g.label}</b>
                  <br />
                  <span className="small">{g.sub}</span>
                </span>
                <span className="dot" />
              </span>
            </label>
          ))}
        </fieldset>

        <label className="field">
          Your Android version
          <select name="android_version" className="input" defaultValue={profile.android_version ?? 'Android 15'}>
            {versions.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>

        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Apps you can test per day</legend>
          <div className="chips">
            {loads.map((l) => (
              <label key={l.value} className="choice">
                <input type="radio" name="apps_per_day" value={l.value} defaultChecked={load === l.value} />
                <span className="face">{l.label}</span>
              </label>
            ))}
          </div>
          <p className="small">More tests = your app climbs the queue faster.</p>
        </fieldset>

        <div className="push-bottom">
          <SubmitButton>Next</SubmitButton>
        </div>
      </form>
    </main>
  );
}
