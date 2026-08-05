import { AuthPage } from "@/components/auth-page";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthPage
      mode="signup"
      nextPath={params.next ?? "/dashboard"}
      error={params.error}
    />
  );
}
