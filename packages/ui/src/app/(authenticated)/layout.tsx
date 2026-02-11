import { auth } from "@/lib/auth";
import { AppHeader } from "@/components/shared/app-header";

export default async function AuthenticatedLayout({
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
      <AppHeader user={session.user} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
