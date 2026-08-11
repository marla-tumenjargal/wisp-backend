export const ARENA_PROVIDER = "custom:arena" as const;

export type AuthProviderId =
  | "google"
  | "spotify"
  | typeof ARENA_PROVIDER;

export const AUTH_PROVIDERS: {
  id: AuthProviderId;
  label: string;
  brand: string;
}[] = [
  { id: "google", label: "Continue with Google", brand: "google" },
  { id: "spotify", label: "Continue with Spotify", brand: "spotify" },
  {
    id: ARENA_PROVIDER,
    label: "Continue with Are.na",
    brand: "arena",
  },
];
