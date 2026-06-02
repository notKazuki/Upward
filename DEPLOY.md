# Deploying Upward + easy updates

Host on **Vercel** (free Hobby tier) with **auto-deploy from GitHub**. Your
existing Supabase project stays as the backend.

After this is set up, shipping an update = `git push`. That's the whole loop.

---

## 1. Push to GitHub

The code is already committed locally on the `main` branch. Create an **empty**
repo at <https://github.com/new> (no README, no .gitignore, no license — keep it
empty so the push isn't rejected). Public or private both fine (keys are scrubbed
from the repo).

Then paste me the repo URL and I'll run:

```bash
git remote add origin https://github.com/<you>/upward.git
git push -u origin main
```

(Or run it yourself if you prefer.)

## 2. Create the Vercel project

1. <https://vercel.com> → sign up / log in **with GitHub**.
2. **Add New → Project** → import the `upward` repo.
3. Framework preset **Next.js** is auto-detected; root directory `./`; leave
   build/output settings default.
4. **Environment Variables** — add both (scope: Production, Preview, Development):
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
   (Copy these from your local `.env.local`.)
5. **Deploy** → you get `https://<project>.vercel.app`.

## 3. Point Supabase at the production URL

Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL**: `https://<project>.vercel.app`
- **Redirect URLs**: add `https://<project>.vercel.app/**`
  (keep `http://localhost:3000/**` too, for local dev)

This makes email confirmation, password reset, and Google/Discord OAuth redirect
correctly in production (they rely on Site URL + the redirect allowlist).

> The Google/Discord OAuth apps themselves need **no change** — their callback is
> the Supabase callback (`https://<project>.supabase.co/auth/v1/callback`), which
> is the same in dev and prod. Supabase brokers the OAuth handshake.

## 4. Easy updates (the workflow)

Vercel's GitHub integration is automatic once connected:

- Push to **`main`** → a **production** deploy (your live alpha updates in ~1 min).
- Push any **branch / open a PR** → a unique **Preview URL** to test before merging.

Day-to-day:

```bash
git add -A
git commit -m "Describe the change"
git push
```

- **Rollback**: Vercel → Deployments → open a previous one → **Promote to Production**.
- **Logs**: Vercel → your project → Logs (runtime) / the deployment's Build Logs.

---

## 5. tracker.gg API key (for gaming auto-sync)

Real auto-sync needs an approved key (see the gaming notes). To apply:

1. <https://tracker.gg/developers> → sign in → request API access / create an app.
2. Provide: app name (**Upward**), a short description ("a personal habit & goal
   tracker that displays a user's own Valorant stats with their consent"), and
   your site URL (your `vercel.app` domain helps approval).
3. Accept the terms; expect a review wait. Note their rate limits.
4. When approved you'll get a key used as the `TRN-Api-Key` request header.

**When the key arrives**, add it as a **server-only** env var (NOT `NEXT_PUBLIC_`):

- `TRACKER_API_KEY` in Vercel (Production/Preview) **and** your local `.env.local`.

Then tell me — I'll build the sync: a server action/route that reads the saved
tracker link, calls the TRN API with the key, and updates the game's stats. The
key never touches the browser.

> Heads-up: Valorant data flows through Riot's API under the hood, so approval can
> be slow and is rate-limited. We'll wire whatever access you're granted.
