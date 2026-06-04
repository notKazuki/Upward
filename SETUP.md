# Upward — Supabase Auth Setup

Auth is fully coded (email + password, with email confirmation). To make it live,
create a free Supabase project and connect it. ~10 minutes.

## 1. Create a Supabase project

1. Go to <https://supabase.com> → **Sign in** (GitHub login is easiest).
2. **New project** → pick a name (e.g. `upward`), set a strong database password
   (save it somewhere), choose the region closest to you, plan: **Free**.
3. Wait ~2 minutes for it to provision.

## 2. Get your API keys

1. In the project, open **Project Settings** (gear icon) → **API**.
2. Copy two values into `.env.local` (this file is git-ignored — never commit
   real keys):
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key (the long one labelled `anon` / `public`) →
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. ⚠️ Do **not** copy the `service_role` key. It bypasses all security and must
   never be exposed to the browser.

## 3. Add the keys locally

Open `.env.local` (already created in the project root) and paste:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Then **restart** the dev server (`npm run dev`) — env vars load at startup.

## 4. Configure auth URLs

In the dashboard → **Authentication** → **URL Configuration**:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** add `http://localhost:3000/**`

(When you deploy, add your production URL here too, e.g.
`https://upward.vercel.app` and `https://upward.vercel.app/**`.)

## 5. Point the confirmation email at our route

The app verifies email via `/auth/confirm` (this sets the session cookie on our
own domain). Update the template so the link goes there:

Dashboard → **Authentication** → **Emails** → **Confirm signup** → edit the
body and change the link to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/app">
  Confirm your email
</a>
```

## 6. Test it

1. `npm run dev`, open <http://localhost:3000>.
2. **Sign up** with a real email → you should see the “Check your inbox” screen.
3. Open the email, click **Confirm** → you land on `/app` ("Welcome, …").
4. **Sign out**, then **Sign in** with the same credentials.
5. Visiting `/app` while signed out should bounce you to `/signin`.

---

## How it fits together (for future reference)

| File | Role |
|------|------|
| `.env.local` | Your Supabase URL + anon key (git-ignored) |
| `src/lib/supabase/client.ts` | Browser client (Client Components) |
| `src/lib/supabase/server.ts` | Server client (Server Components / Route Handlers) |
| `src/lib/supabase/proxy-session.ts` | Refreshes the session cookie each request |
| `src/proxy.ts` | Next.js 16 "Proxy" (renamed Middleware) entry point |
| `src/app/auth/confirm/route.ts` | Verifies the email confirmation link |
| `src/app/app/page.tsx` | Protected page — requires a logged-in user |
| `src/components/auth-form.tsx` | Sign in / sign up form, calls Supabase |
| `src/app/auth/callback/route.ts` | OAuth (Google/Discord) code exchange |
| `src/app/auth/reset/page.tsx` | Set a new password (after reset link) |
| `src/app/onboarding/` | Post-signup intro wizard + save action |
| `src/components/dashboard/topbar.tsx` | Top bar + profile menu (incl. sign out) |

Until the keys are present, the app runs normally and the forms show a friendly
"add your Supabase keys" message instead of erroring.

---

# Round 3 setup — OAuth, password reset, onboarding

Three things to do in the dashboard/SQL editor before these features work.

## A. Create the `profiles` table (required for onboarding)

Supabase dashboard → **SQL Editor** → New query → paste the contents of
[`supabase/profiles.sql`](supabase/profiles.sql) → **Run**. This creates the
table, row-level security, and a trigger that makes a profile row on every
signup.

> Existing accounts (made before this table) simply get sent through onboarding
> on their next visit, which creates their row.

## B. Enable Google sign-in

1. **Google Cloud Console** → create a project → **APIs & Services → Credentials
   → Create OAuth client ID → Web application**.
2. Under **Authorized redirect URIs**, add the callback shown in Supabase
   (next step) — it looks like
   `https://YOUR-PROJECT.supabase.co/auth/v1/callback`.
3. Copy the **Client ID** and **Client secret**.
4. Supabase dashboard → **Authentication → Providers → Google** → enable, paste
   the ID + secret, save.

## C. Enable Discord sign-in

1. **Discord Developer Portal** (<https://discord.com/developers/applications>)
   → **New Application** → **OAuth2**.
2. Add the same Supabase callback URL
   (`https://YOUR-PROJECT.supabase.co/auth/v1/callback`) under **Redirects**.
3. Copy the **Client ID** and **Client secret**.
4. Supabase dashboard → **Authentication → Providers → Discord** → enable, paste
   the ID + secret, save.

> Until a provider is enabled, its button shows a friendly "that sign-in method
> isn't enabled yet" message.

## D. Password reset email template

Dashboard → **Authentication → Emails → Reset Password** → set the link to point
at our confirm route (mirrors the signup template):

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/reset">
  Reset your password
</a>
```

## Test it

1. **OAuth**: click Continue with Google / Discord → authorize → you land in the
   app and (first time) the onboarding wizard.
2. **Onboarding**: DOB (under-13 is blocked), gender, optional height/weight
   (metric ⇄ imperial), and what you want to track → Finish → dashboard.
3. **Password reset**: Sign in → "Forgot password?" → enter email → open the
   email → set a new password → you're signed in.

## E. Workout tracker table

The first real tracker. Supabase dashboard → **SQL Editor** → run
[`supabase/workouts.sql`](supabase/workouts.sql), then
[`supabase/workout-splits.sql`](supabase/workout-splits.sql) (adds training-split
fields to your profile and allows custom day labels). Then visit **Workout** in
the sidebar: on first open you'll pick a training split (Full Body, Upper/Lower,
PPL, Arnold, Bro, or build your own), then log sessions against your split's days
(plus Cardio/Mobility/Rest). Stats update live; change your split anytime.

For the **full program builder + set-by-set logging**, also run
[`supabase/workout-goal-custom.sql`](supabase/workout-goal-custom.sql) (training
goal + per-day custom exercises) and
[`supabase/workout-sets.sql`](supabase/workout-sets.sql) (logs each exercise's
sets — weight × reps — and powers personal records). Then each split day is fully
editable (add from a library or your own, edit sets/reps, seed from the suggested
routine), and logging captures every set with PRs.

## F. Gaming tracker

Run [`supabase/gaming.sql`](supabase/gaming.sql) in Supabase → **SQL Editor**.
Then open **Gaming**: add a game (Valorant, etc., or custom) and optionally paste
your tracker.gg profile link, set daily/weekly goals (matches, wins, hours), and
log sessions (matches/wins/losses/hours/rank/notes). Win rate, totals, and a
trend chart update live.

**Dota 2 auto-sync** works with **no API key**: run
[`supabase/game-sync.sql`](supabase/game-sync.sql), then on the Dota 2 game
page open **Auto-sync**, paste your account ID (or OpenDota/Dotabuff link), and
**Sync now** — recent matches import as sessions (win/loss, KDA, duration), and
re-syncing never duplicates. Your Dota match history must be public (in Dota:
Settings → Options → *Expose Public Match Data*).

**Valorant auto-sync** uses the HenrikDev API (Riot has no usable public
Valorant match API). It needs a free key, added as a **server-only** env var:

1. Get a key at [docs.henrikdev.xyz](https://docs.henrikdev.xyz) → their Discord
   → the key bot/portal → generate a **Basic** key.
2. Add it wherever the app runs:
   - **Vercel** → Project → **Settings → Environment Variables** → add
     `HENRIKDEV_API_KEY` = the key (Production + Preview). Redeploy.
   - **Local** → add `HENRIKDEV_API_KEY=...` to `.env.local`, then restart
     `npm run dev`.

When you **add Valorant**, enter your Riot ID (`GameName#TAG`) right in the
add-game form — it validates and connects on the spot (or leave it blank and
connect later from the game's **Auto-sync** card). Region is detected
automatically. **Sync now** imports recent **Competitive** matches as sessions
(win/loss, agent · map · KDA, duration); re-syncing never duplicates. You can
**Change Riot ID** anytime from the Auto-sync card — and if you rename in-game,
sync keeps working (it keys on your durable PUUID and auto-updates the handle).

Two efficiency notes: a **10-minute per-account cooldown** means rapid re-syncs
return instantly from the DB (0 API calls), keeping usage well under HenrikDev's
~30 req/min. And every ranked match is also written to a shared
`valorant_matches` archive — run [`supabase/valorant-matches.sql`](supabase/valorant-matches.sql)
(writes use the service-role key, the same one as account deletion) — so future
cross-user features read from our own database instead of the API.

> ⚠️ HenrikDev is unofficial; never prefix the key with `NEXT_PUBLIC_` (it's read
> only server-side in `src/lib/valorant.ts`). Other games stay manual for now —
> tracker.gg may only serve Apex / The Division 2, so durable auto-sync means
> per-game APIs. The provider columns added by `game-sync.sql` generalise across
> all of them.

## G. Account / profile

Run [`supabase/profile.sql`](supabase/profile.sql) in Supabase → **SQL Editor**
(adds `username` + `avatar_url` to profiles, a case-insensitive unique index for
the username exclusivity system, and a public `avatars` storage bucket with
per-user write policies).

Then open the avatar menu (top-right) → **Account** to set a unique username
(≤17 chars), upload a profile photo, and turn on **two-factor authentication**
(authenticator app / TOTP — scan the QR, enter the 6-digit code).

For the **display name** (freely editable, shown around the app) and the
**30-day username change cooldown**, also run
[`supabase/display-name.sql`](supabase/display-name.sql) (adds `display_name`
and `username_changed_at` to profiles).

## H. Meal tracker

Run [`supabase/meals.sql`](supabase/meals.sql) in Supabase → **SQL Editor**
(adds the `meals` table + RLS and a `nutrition_targets` column on profiles).
Then open **Meal**: build a meal from **multiple items** (search the built-in
food estimator or add custom items), see a running total, set daily targets
(auto-suggested from your onboarding age/sex/height/weight, editable), and log.
Nutrition also feeds the dashboard summary + a "Calories today" stat.

The food search returns instant matches from the bundled library (incl. a
curated **fast-food** set — Big Mac, Whopper, Chipotle, etc.) and also searches
the live **USDA FoodData Central** database (~2M foods) as you type. USDA works
out of the box on the shared `DEMO_KEY`, but it's heavily rate-limited — for
real use grab a free key at
[fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup.html)
and add it as a **server-only** env var `FDC_API_KEY` (Vercel → Environment
Variables, and `.env.local` for local dev). It's read only server-side in
`src/lib/usda.ts`.

For **favorites** (save a meal/item and re-add it later), also run
[`supabase/meal-favorites.sql`](supabase/meal-favorites.sql).

For the **weight goal** (lose / maintain / gain, which adjusts your calorie &
protein suggestion), run
[`supabase/nutrition-goal.sql`](supabase/nutrition-goal.sql). Until it's run the
goal selector falls back to "maintain" and the page still works.

## J. Calendar

Run [`supabase/calendar.sql`](supabase/calendar.sql) in Supabase → **SQL
Editor**. Then open **Calendar**: a month view where you add typed, checkable
plans (workout/meal/gaming/goal/other) per day, with your tracked workouts,
meals, and gaming overlaid so it's one view of done + planned.

## K. Goals

Run [`supabase/goals.sql`](supabase/goals.sql) in Supabase → **SQL Editor**
(creates the `goals` + `goal_logs` tables and RLS). Then open **Goals**: create
goals that are **measurable** (count toward a target, e.g. run 100 miles),
**streak** (consecutive days), or **done/not-done**. Each goal carries a "why",
an optional deadline (with overdue / due-soon flags), and a status you can move
between active / paused / completed / abandoned — so a rough week means pausing
or adjusting, not deleting. Progress check-ins build a history you can look back
on, and hitting a target auto-completes the goal with a small celebration.

## L. Supplement

Run [`supabase/supplements.sql`](supabase/supplements.sql) in Supabase → **SQL
Editor** (creates `supplements` + `supplement_logs` with RLS). Then open
**Supplement**: add what you take (name, dose, and when — morning / pre-workout
/ evening / anytime), then tick each one off as you take it. Today's "X of Y
taken" updates live and each item shows its last 7 days at a glance.

## M. Account deletion (service-role key)

**Data export** needs no setup — Account → *Data & account* → **Download
(.json)** works immediately (it uses your own session, scoped by RLS).

**Account deletion** needs the Supabase **service_role** key, because the anon
key can't delete an auth user. Add it as a **server-only** env var:

1. Supabase → **Project Settings → API** → copy the **`service_role`** key
   (the secret one — *not* the anon key).
2. Add it wherever the app runs:
   - **Vercel** → Project → **Settings → Environment Variables** → add
     `SUPABASE_SERVICE_ROLE_KEY` = the key (Production + Preview). Redeploy.
   - **Local** → add `SUPABASE_SERVICE_ROLE_KEY=...` to `.env.local`.

⚠️ **Never** prefix it with `NEXT_PUBLIC_` and never commit it — it has full
database access. The app only reads it server-side (`src/lib/supabase/admin.ts`).
Until it's set, the Delete-account control shows "not enabled" and export still
works.

## N. Journal

Run [`supabase/journal.sql`](supabase/journal.sql) in Supabase → **SQL Editor**
(creates the `journal_entries` table with RLS and a **private** `journal`
storage bucket for photos). Then open **Journal**: write a dated entry with a
mood, free-text, and up to 6 photos. Photos live in a private bucket and are
shown to you via short-lived signed URLs — no one else can see them.

## O. Friends & profile sharing

Run [`supabase/social.sql`](supabase/social.sql) in Supabase → **SQL Editor**
(adds `bio` + a per-section `privacy` map to profiles, and creates the
`friendships` + `blocks` tables with RLS). Then open **Friends**: search members
by username, send/accept requests, and visit `/app/u/<username>` profiles.

Control sharing under **Settings → Profile sharing**: each area (activity, level,
achievements, workouts, nutrition, gaming, goals) is independently **Only me /
Friends / Anyone**, and **everything starts private**. Your **journal is never
shareable**. Set a **username** (Account) to be discoverable.

> Viewing another member's shared stats requires the **`SUPABASE_SERVICE_ROLE_KEY`**
> (same key as account deletion): cross-user reads are gated in server code by
> the relationship + privacy, then read with the service-role client because the
> trackers' own RLS is owner-only.

## I. Update log → Discord (optional)

The in-app **What's new** log (spark icon by your avatar) reads
`src/data/changelog.json`. To also post new entries to a Discord channel:

1. In Discord: **Server Settings → Integrations → Webhooks → New Webhook**,
   pick a channel, **Copy Webhook URL**.
2. In GitHub: repo **Settings → Secrets and variables → Actions → New
   repository secret**, name it `DISCORD_WEBHOOK_URL`, paste the URL.

After that, any push to `main` that changes `src/data/changelog.json` runs the
`Changelog to Discord` workflow and posts the newest entry. (Without the secret
the workflow simply skips.)

## Not done yet (later steps)

- **Remaining trackers** — all sidebar trackers are now live (Workout, Gaming,
  Meal, Calendar, Goals, Supplement).
- **Dashboard live data** — the `/app` dashboard widgets still use sample data;
  next they'll read from real tables (starting with workouts).
- **Account / Settings screens** — menu items are stubbed.
- **Deploy the alpha** — planned after core functionality (Vercel).
