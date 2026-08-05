export const PINTEREST_PROVIDER = "custom:pinterest" as const;

export type AuthProviderId = "spotify" | typeof PINTEREST_PROVIDER;

export const AUTH_PROVIDERS: {
  id: AuthProviderId;
  label: string;
  brand: string;
}[] = [
  { id: "spotify", label: "Continue with Spotify", brand: "spotify" },
  {
    id: PINTEREST_PROVIDER,
    label: "Continue with Pinterest",
    brand: "pinterest",
  },
];
