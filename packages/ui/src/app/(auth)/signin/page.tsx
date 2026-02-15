import { Metadata } from "next";
import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to access your Audible library",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <Card className="p-8">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Welcome to audioshlf</h1>
          <p className="text-muted-foreground">Sign in with Google to organize your audiobook library</p>
        </div>

        {params.error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-medium">Authentication Error</p>
            <p>
              {params.error === "OAuthSignin"
                ? "Error starting the sign-in process. Please try again."
                : params.error === "OAuthCallback"
                  ? "Error during sign-in callback. Please try again."
                  : params.error === "OAuthAccountNotLinked"
                    ? "This email is already associated with another account."
                    : "An error occurred during sign-in. Please try again."}
            </p>
          </div>
        )}

        <form
          action={async () => {
            "use server";
            await signIn("google", {
              redirectTo: params.callbackUrl || "/dashboard",
            });
          }}
        >
          <Button type="submit" className="w-full" size="lg">
            <svg
              className="mr-2 h-5 w-5"
              aria-hidden="true"
              focusable="false"
              data-prefix="fab"
              data-icon="google"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 488 512"
            >
              <path
                fill="currentColor"
                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
              ></path>
            </svg>
            Sign in with Google
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          By signing in, you agree to our terms of service and privacy policy.
        </p>
      </div>
    </Card>
  );
}
