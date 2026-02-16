"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserNav } from "@/components/dashboard/user-nav";
import { GuestNav } from "@/components/dashboard/guest-nav";
import { Button } from "@/components/ui/button";
import { Menu, Home, Library } from "lucide-react";

interface FloatingNavProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  isAdmin?: boolean;
}

export function FloatingNav({ user, isAdmin = false }: FloatingNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Only show navigation items when user is authenticated
  const navItems = user
    ? [
        { href: "/dashboard", label: "Dashboard", icon: Home },
        { href: "/library", label: "Library", icon: Library },
      ]
    : [];

  return (
    <>
      {/* Desktop Floating Pill Nav */}
      <nav className="mx-auto hidden w-full max-w-6xl lg:my-4 lg:block">
        <div className="flex items-center justify-between rounded-full border bg-background px-4 py-2 shadow-sm">
          <div className="flex items-center gap-4">
            <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-foreground"
              >
                <path
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-lg font-semibold">audioshlf</span>
            </Link>

            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-9 gap-2 rounded-md px-4 text-sm font-medium ${
                        isActive ? "bg-muted" : "hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      <Icon width="12" height="12" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? <UserNav user={user} isAdmin={isAdmin} /> : <GuestNav />}
          </div>
        </div>
      </nav>

      {/* Mobile Nav */}
      <nav className="border-b bg-background lg:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-foreground"
            >
              <path
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-lg font-semibold">audioshlf</span>
          </Link>

          <div className="flex items-center gap-2">
            {user ? (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu className="h-4 w-4" />
              </Button>
            ) : (
              <GuestNav />
            )}
          </div>
        </div>

        {mobileMenuOpen && user && (
          <div className="border-t px-4 py-4">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-start gap-2 ${isActive ? "bg-muted" : ""}`}
                    >
                      <Icon width="12" height="12" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
              <div className="mt-2 border-t pt-4">
                <UserNav user={user} isAdmin={isAdmin} />
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
