# TestLoop

Web app that helps Android developers pass Google Play's closed-testing rule
(**12 testers opted in for 14 days in a row**) by swapping tests with other real developers.

Free exchange: test other people's apps → earn credits → your app rises in their queue.
Paid "Boost" ($6 / ₹499) is designed in, payments arrive in week 3.

**No fake accounts, ever.** Every tester is a real person on a real phone.

## What's built (week 1–2)

| Page | What it does |
|---|---|
| `/` | Landing page |
| `/login` | Google sign-in (only option, no passwords) |
| `/onboarding` | Step 1 of 2: goal, Android version, apps per day — 3 taps |
| `/onboarding/app` | Step 2 of 2: paste closed-test link + app name, copy the Google Group |
| `/dashboard` | Your app: testers 9/12, 14-day clock, testers at risk of dropping out, credits, streak |
| `/test` | Today's tests: join apps, "Become a tester" + install links, daily Done, feedback on day 1/7/14 |
| `/feedback` | Feedback testers left on your apps (for Google's production-access form) |
| `/boost` | $6 Boost page (payment button disabled until Razorpay is added) |

Rules live in the database (`supabase/migrations/0001_init.sql`), so nobody can cheat from the browser:
credits, streaks, boosts, joins and check-ins can only change through checked server functions.

## Run it — one-time setup (all free)

### 1. Supabase (database + Google login)
1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste all of `supabase/migrations/0001_init.sql` → Run.
3. **Authentication → Sign In / Providers → Google** → turn on. It asks for a Google *Client ID* and *Secret*:
   - [Google Cloud Console](https://console.cloud.google.com/) → new project → **APIs & Services → OAuth consent screen** (External, app name "TestLoop").
   - **Credentials → Create credentials → OAuth client ID → Web application**.
   - *Authorized redirect URI*: the callback URL Supabase shows you (`https://YOUR-PROJECT.supabase.co/auth/v1/callback`).
   - Paste the Client ID + Secret back into Supabase.
4. **Authentication → URL Configuration**: Site URL = your site (e.g. `https://testloop.netlify.app`), and add
   `http://localhost:3000/auth/callback` and `https://YOUR-SITE/auth/callback` to *Redirect URLs*.

### 2. Google Group (the tester list)
1. [groups.google.com](https://groups.google.com) → Create group, e.g. `testloop-testers`.
2. Who can join: **Anyone can join**. Who can view members: **Group managers** (protects testers' emails).
3. Put its address in `NEXT_PUBLIC_TESTER_GROUP_EMAIL`.

Every developer adds this one group to their closed test, and every tester joins it once.
Then a tester only has to tap "Become a tester" on each app.

### 3. Run locally
```bash
cp .env.example .env.local   # fill in the 4 values
npm install
npm run dev                  # http://localhost:3000
```

### 4. Deploy free on Netlify
Import the GitHub repo in Netlify, add the same 4 environment variables
(with `NEXT_PUBLIC_SITE_URL` = your Netlify URL), deploy. Netlify detects Next.js by itself.
(Vercel's free plan does not allow commercial use, so Netlify is the default here.)

## Tests
```bash
npm test          # link parsing + progress maths
npm run typecheck
npm run test:db   # database rules, needs a local Postgres: PGHOST=… PGPORT=… PGUSER=postgres
```

## Next up
- Week 3: Razorpay (UPI + cards) for Boost, daily push-notification reminders, drop-out alerts to owners.
- Week 4: launch — r/AndroidClosedTesting, Indian dev Telegram/WhatsApp groups, Hindi YouTube walkthrough.

Notes: the 14-day clock shown is our estimate; Play Console is the source of truth.
Days roll over at 00:00 UTC (5:30 AM IST).
