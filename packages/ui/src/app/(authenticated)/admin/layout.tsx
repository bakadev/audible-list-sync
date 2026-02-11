/**
 * Admin Layout
 *
 * Protected layout for admin-only pages
 * - Validates user authentication and admin role
 * - Redirects non-admin users to /library
 * - Provides admin navigation tabs
 */

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin-auth'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import { Button } from '@/components/ui/button'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // T054: Auth guard checking isAdmin flag
  const session = await auth()

  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=/admin')
  }

  // Fetch full user data from database to check admin status
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  // T055: Redirect non-admin users to /library
  if (!isAdmin(user)) {
    redirect('/library')
  }

  // T056: Admin navigation component
  return (
    <div className="container max-w-6xl py-8 md:py-12">
      <div className="space-y-6">
        {/* Admin Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold leading-tight md:text-3xl">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Link href="/library">
            <Button variant="outline" size="sm">Back to Library</Button>
          </Link>
        </div>

        {/* Admin Navigation Tabs */}
        <nav className="flex gap-2 border-b pb-2">
          <Link href="/admin">
            <Button variant="ghost" size="sm">📊 Dashboard</Button>
          </Link>
          <Link href="/admin/users">
            <Button variant="ghost" size="sm">👥 Users</Button>
          </Link>
          <Link href="/admin/titles">
            <Button variant="ghost" size="sm">📚 Titles</Button>
          </Link>
        </nav>

        {/* Page Content */}
        {children}
      </div>
    </div>
  )
}
