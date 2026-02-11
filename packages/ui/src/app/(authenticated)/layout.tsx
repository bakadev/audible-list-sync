import { auth } from "@/lib/auth";
import { FloatingNav } from "@/components/shared/floating-nav";
import { Footer } from "@/components/shared/footer";

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
      <FloatingNav user={session.user} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
