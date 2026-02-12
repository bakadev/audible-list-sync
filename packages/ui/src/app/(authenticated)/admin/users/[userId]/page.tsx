/**
 * Admin User Detail Page
 *
 * T095: User detail page component
 * T096: Fetch user details from GET /api/admin/users/[userId]
 * T097: Display user info at top
 * T098: Display library summary stats
 */

import { Suspense } from 'react'
import { cookies } from 'next/headers'
import UserLibraryTable from '@/components/admin/user-library-table'
import DangerZone from '@/components/admin/danger-zone'

async function getUserDetails(userId: string) {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()

  const response = await fetch(
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/users/${userId}`,
    {
      cache: 'no-store',
      headers: {
        Cookie: cookieHeader,
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch user details: ${response.status} - ${errorText}`)
  }

  return response.json()
}

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: { userId: string }
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const data = await getUserDetails(params.userId)
  const { user, summary } = data

  return (
    <div className="space-y-6">
      {/* T097: User Info Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.email}</h1>
            {user.name && (
              <p className="text-lg text-gray-600 mt-1">{user.name}</p>
            )}
            <div className="flex items-center gap-4 mt-3">
              {user.isAdmin && (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                  Admin
                </span>
              )}
              <span className="text-sm text-gray-500">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </span>
              {user.lastImportAt && (
                <span className="text-sm text-gray-500">
                  Last import: {new Date(user.lastImportAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">User ID</div>
            <div className="text-xs font-mono text-gray-700">{user.id}</div>
          </div>
        </div>
      </div>

      {/* T098: Library Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Total Titles</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {summary.total}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Library</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {summary.bySource.LIBRARY}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Wishlist</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {summary.bySource.WISHLIST}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Extension</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">
            {summary.bySource.EXTENSION}
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">By Status</h3>
        <div className="flex gap-6">
          <div>
            <div className="text-xs text-gray-500">Finished</div>
            <div className="text-lg font-semibold text-gray-900">
              {summary.byStatus.Finished}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">In Progress</div>
            <div className="text-lg font-semibold text-gray-900">
              {summary.byStatus['In Progress']}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Not Started</div>
            <div className="text-lg font-semibold text-gray-900">
              {summary.byStatus['Not Started']}
            </div>
          </div>
        </div>
      </div>

      {/* Library Table */}
      <Suspense
        fallback={
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        }
      >
        <UserLibraryTable userId={params.userId} searchParams={searchParams} />
      </Suspense>

      {/* Danger Zone */}
      <DangerZone userId={params.userId} userEmail={user.email} />
    </div>
  )
}
