/**
 * Admin Layout
 *
 * Protected layout for admin-only pages
 * - Validates user authentication and admin role
 * - Redirects non-admin users to /library
 * - Provides admin navigation sidebar
 */

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin-auth'
import Link from 'next/link'
import prisma from '@/lib/prisma'

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
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">{user.email}</p>
        </div>

        <nav className="mt-6">
          <Link
            href="/admin"
            className="block px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
          >
            <span className="flex items-center">
              <span className="mr-3">📊</span>
              Dashboard
            </span>
          </Link>

          <Link
            href="/admin/users"
            className="block px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
          >
            <span className="flex items-center">
              <span className="mr-3">👥</span>
              Users
            </span>
          </Link>

          <Link
            href="/admin/titles"
            className="block px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
          >
            <span className="flex items-center">
              <span className="mr-3">📚</span>
              Titles
            </span>
          </Link>

          <div className="border-t border-gray-200 my-4"></div>

          <Link
            href="/library"
            className="block px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
          >
            <span className="flex items-center">
              <span className="mr-3">←</span>
              Back to Library
            </span>
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  )
}
