# Auth & onboarding setup

Wisp uses **Supabase Auth** with Google (primary onboarding), plus Spotify and Are.na.

New users go through `/onboarding`:
1. Create account with **Google**
2. Pick interest tags (multi-select)
3. Land on `/dashboard`

## 1. Apply database migrations

In the [Supabase SQL Editor](https://supabase.com/dashboard/project/hsjyskyggqgjevnlryui/sql), run in order:

1. `supabase/migrations/001_profiles.sql`
2. `supabase/migrations/002_onboarding.sql`

## 2. Enable Google

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Authorized redirect URI: `https://hsjyskyggqgjevnlryui.supabase.co/auth/v1/callback`
3. Supabase Dashboard → Authentication → Providers → **Google** → enable + paste Client ID / Secret
4. URL Configuration → allow `http://localhost:3001/auth/callback` (match `NEXT_PUBLIC_SITE_URL`)

Optional: store `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env.local` for reference.

## 3. Are.na (custom OAuth)

1. Register an app at [Are.na OAuth Applications](https://www.are.na/developers/oauth/applications)
2. Redirect URI: `https://hsjyskyggqgjevnlryui.supabase.co/auth/v1/callback`
3. Put Client ID / Secret in `.env.local` as `ARENA_CLIENT_ID` / `ARENA_CLIENT_SECRET`
4. Run:

```bash
npm run setup:oauth
```

Or create manually in Supabase → Authentication → Providers → New Provider:

| Field | Value |
| --- | --- |
| Identifier | `custom:arena` |
| Authorization URL | `https://www.are.na/oauth/authorize` |
| Token URL | `https://api.are.na/v3/oauth/token` |
| UserInfo URL | `https://api.are.na/v3/me` |
| Scopes | `read` |
| Email optional | ON |
| PKCE | ON |

## 4. Spotify (optional)

Enable in Supabase Dashboard → Providers → Spotify with your Spotify app credentials. Redirect URI must be the Supabase callback above.

## 5. Run

```bash
npm run dev
```

## Interest data (recommendation pipeline)

Onboarding selections are stored for ML, not only as a string array:

| Table / view | Role |
| --- | --- |
| `interest_tags` | Canonical taxonomy (`slug`, `label`, `domain`) — content-side join key |
| `user_interest_preferences` | Current user→interest edges with `weight`, `signal_type`, `source` — serving |
| `user_interest_events` | Append-only `select` / `deselect` log — offline training |
| `profiles` | User row + denormalized `interests` / `onboarding_completed` |
| `recsys_*` views | Flat exports for training jobs |

### Fix: `relation "public.profiles" does not exist`

Interest tables exist on your project, but `public.profiles` does not. In the [SQL Editor](https://supabase.com/dashboard/project/hsjyskyggqgjevnlryui/sql/new), run:

`supabase/migrations/004_create_profiles.sql`

Until that runs, the app still saves selected interests to `user_interest_preferences` + `user_interest_events` and marks completion on the auth user metadata.

