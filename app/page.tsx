import { withAuth, getSignInUrl, getSignUpUrl } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { SignInPage } from "@/components/auth/sign-in-page";

export default async function Page() {
  const { user } = await withAuth();

  // If already authenticated, go straight to dashboard
  if (user) {
    redirect("/dashboard");
  }

  const signInUrl = await getSignInUrl();
  const signUpUrl = await getSignUpUrl();

  return <SignInPage signInUrl={signInUrl} signUpUrl={signUpUrl} />;
}
