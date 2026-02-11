import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    return null; // Middleware will redirect
  }

  return (
    <div className="container py-10">
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">
            Welcome back, {session.user.name?.split(" ")[0] || "there"}!
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage your Audible library and create recommendation lists.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-8 text-center">
          <div className="mx-auto max-w-md space-y-4">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-muted">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-8 w-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold">No Library Data Yet</h2>
            <p className="text-muted-foreground">
              Connect your Audible account to start syncing your library.
            </p>
            <div className="pt-4">
              <p className="text-sm text-muted-foreground">
                Sync functionality coming soon...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
