import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account settings and preferences",
};

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    return null; // Middleware will redirect
  }

  return (
    <div className="container max-w-4xl py-8 md:py-12">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">Settings</h1>
          <p className="text-base text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Account Information</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium">Name</span>
                <span className="text-sm text-muted-foreground">{session.user.name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium">Email</span>
                <span className="text-sm text-muted-foreground">{session.user.email}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Preferences</h2>
            <p className="text-sm text-muted-foreground">
              Settings and preferences will be available here in a future update.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
