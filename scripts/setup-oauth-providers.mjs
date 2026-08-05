/**
 * Configures Spotify (built-in) and Pinterest (custom OAuth) on your Supabase project.
 *
 * Usage:
 *   node --env-file=.env.local scripts/setup-oauth-providers.mjs
 *
 * Requires SPOTIFY_* and/or PINTEREST_* credentials in .env.local.
 * Spotify uses the Supabase Management API if SUPABASE_ACCESS_TOKEN is set;
 * otherwise print dashboard steps. Pinterest is created via Auth Admin API.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const PINTEREST_CLIENT_ID = process.env.PINTEREST_CLIENT_ID;
const PINTEREST_CLIENT_SECRET = process.env.PINTEREST_CLIENT_SECRET;

const CALLBACK = `${SUPABASE_URL}/auth/v1/callback`;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

function projectRefFromUrl(url) {
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    return null;
  }
}

async function setupSpotify() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.log("\n• Spotify: skipped (SPOTIFY_CLIENT_ID / SECRET not set)");
    return;
  }

  console.log("\n• Spotify");
  console.log(`  Add this Redirect URI in the Spotify Developer Dashboard:`);
  console.log(`  ${CALLBACK}`);

  if (!ACCESS_TOKEN) {
    console.log(`
  Enable Spotify in Supabase Dashboard → Authentication → Providers → Spotify
  Client ID:     ${SPOTIFY_CLIENT_ID}
  Client Secret: (from your .env.local)
  Also allow redirect URL in Authentication → URL Configuration:
  ${SITE_URL}/auth/callback
`);
    return;
  }

  const ref = projectRefFromUrl(SUPABASE_URL);
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/config/auth`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_spotify_enabled: true,
        external_spotify_client_id: SPOTIFY_CLIENT_ID,
        external_spotify_secret: SPOTIFY_CLIENT_SECRET,
        uri_allow_list: `${SITE_URL}/auth/callback`,
        site_url: SITE_URL,
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error(`  Failed to enable Spotify via Management API (${res.status}): ${body}`);
    console.log("  Fall back to enabling Spotify in the Supabase Dashboard.");
    return;
  }

  console.log("  Enabled Spotify via Management API.");
}

async function setupPinterest() {
  if (!PINTEREST_CLIENT_ID || !PINTEREST_CLIENT_SECRET) {
    console.log("\n• Pinterest: skipped (PINTEREST_CLIENT_ID / SECRET not set)");
    return;
  }

  if (!SECRET_KEY) {
    console.error("\n• Pinterest: SUPABASE_SECRET_KEY is required");
    return;
  }

  console.log("\n• Pinterest (custom:pinterest)");
  console.log(`  Add this Redirect URI in the Pinterest Developer App:`);
  console.log(`  ${CALLBACK}`);

  const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const providersApi = supabase.auth.admin.customProviders;

  if (!providersApi) {
    console.error(
      "  customProviders API unavailable — upgrade @supabase/supabase-js or create the provider in the Dashboard.",
    );
    printPinterestDashboardSteps();
    return;
  }

  const payload = {
    provider_type: "oauth2",
    identifier: "custom:pinterest",
    name: "Pinterest",
    client_id: PINTEREST_CLIENT_ID,
    client_secret: PINTEREST_CLIENT_SECRET,
    authorization_url: "https://www.pinterest.com/oauth/",
    token_url: "https://api.pinterest.com/v5/oauth/token",
    userinfo_url: "https://api.pinterest.com/v5/user_account",
    scopes: ["user_accounts:read"],
    email_optional: true,
    pkce_enabled: false,
    enabled: true,
  };

  let result = await providersApi.createProvider(payload);

  if (result.error) {
    const message = result.error.message || "";
    if (/already exists|conflict/i.test(message)) {
      result = await providersApi.updateProvider("custom:pinterest", {
        name: payload.name,
        client_id: payload.client_id,
        client_secret: payload.client_secret,
        authorization_url: payload.authorization_url,
        token_url: payload.token_url,
        userinfo_url: payload.userinfo_url,
        scopes: payload.scopes,
        email_optional: true,
        pkce_enabled: false,
        enabled: true,
      });
    }
  }

  if (result.error) {
    console.error(`  API error: ${result.error.message}`);
    printPinterestDashboardSteps();
    return;
  }

  console.log("  custom:pinterest provider is ready.");
}

function printPinterestDashboardSteps() {
  console.log(`
  Create manually in Supabase Dashboard → Authentication → Providers → New Provider:
    Identifier:        custom:pinterest
    Client ID/Secret:  from .env.local
    Authorization URL: https://www.pinterest.com/oauth/
    Token URL:         https://api.pinterest.com/v5/oauth/token
    UserInfo URL:      https://api.pinterest.com/v5/user_account
    Scopes:            user_accounts:read
    Email optional:    ON
`);
}

async function main() {
  if (!SUPABASE_URL) {
    console.error("Missing SUPABASE_URL");
    process.exit(1);
  }

  console.log("Wisp OAuth setup");
  console.log(`Project: ${SUPABASE_URL}`);
  console.log(`App callback (allow in Supabase URL config): ${SITE_URL}/auth/callback`);

  await setupSpotify();
  await setupPinterest();

  console.log("\nDone. Fill any empty credentials in .env.local, then re-run this script.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
