import { AuthPage } from "@/components/auth-page";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthPage
      mode="login"
      nextPath={params.next ?? "/dashboard"}
      error={params.error}
    />
  );
}
