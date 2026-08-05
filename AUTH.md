# Auth setup

Wisp uses **Supabase Auth** with:

- **Spotify** — built-in provider
- **Pinterest** — custom OAuth provider (`custom:pinterest`)

Users land on `/signup` or `/login`, complete OAuth, return to `/auth/callback`, then `/dashboard`. Profiles are stored in the `profiles` table.

## 1. Apply the database migration

In the [Supabase SQL Editor](https://supabase.com/dashboard/project/hsjyskyggqgjevnlryui/sql), run:

`supabase/migrations/001_profiles.sql`

## 2. Create OAuth apps

### Spotify

1. Create an app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Add Redirect URI: `https://hsjyskyggqgjevnlryui.supabase.co/auth/v1/callback`
3. Put Client ID / Secret in `.env.local` as `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`

### Pinterest

1. Create an app at [Pinterest Developers](https://developers.pinterest.com/)
2. Add Redirect URI: `https://hsjyskyggqgjevnlryui.supabase.co/auth/v1/callback`
3. Put App ID / Secret in `.env.local` as `PINTEREST_CLIENT_ID` / `PINTEREST_CLIENT_SECRET`

## 3. Enable providers on Supabase

```bash
npm run setup:oauth
```

Or configure manually:

**Spotify** — Authentication → Providers → Spotify → enable + paste credentials.

**Pinterest** — Authentication → Providers → New Provider:

| Field | Value |
| --- | --- |
| Identifier | `custom:pinterest` |
| Authorization URL | `https://www.pinterest.com/oauth/` |
| Token URL | `https://api.pinterest.com/v5/oauth/token` |
| UserInfo URL | `https://api.pinterest.com/v5/user_account` |
| Scopes | `user_accounts:read` |
| Email optional | ON |
| PKCE | OFF |

**URL Configuration** — allow `http://localhost:3000/auth/callback` (and your production URL).

## 4. Run the app

```bash
npm run dev
```
