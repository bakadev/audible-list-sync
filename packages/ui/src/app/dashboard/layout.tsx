import Link from "next/link";
import { auth } from "@/lib/auth";
import { UserNav } from "@/components/dashboard/user-nav";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    return null; // Middleware will redirect
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-bold">
              Audible Lists
            </Link>
            <nav className="hidden items-center gap-6 md:flex">
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Link href="/library">
                <Button variant="ghost">Library</Button>
              </Link>
            </nav>
          </div>
          <UserNav user={session.user} />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
