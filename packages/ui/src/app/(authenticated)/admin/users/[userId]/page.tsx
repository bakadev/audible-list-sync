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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
  params: Promise<{ userId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { userId } = await params
  const resolvedSearchParams = await searchParams
  const data = await getUserDetails(userId)
  const { user, summary } = data

  return (
    <div className="space-y-6">
      {/* T097: User Info Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{user.email}</h1>
              {user.name && (
                <p className="text-lg text-muted-foreground mt-1">{user.name}</p>
              )}
              <div className="flex items-center gap-4 mt-3">
                {user.isAdmin && (
                  <Badge variant="secondary">Admin</Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  Member since {new Date(user.createdAt).toLocaleDateString()}
                </span>
                {user.lastImportAt && (
                  <span className="text-sm text-muted-foreground">
                    Last import: {new Date(user.lastImportAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">User ID</div>
              <div className="text-xs font-mono">{user.id}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* T098: Library Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">Total Titles</div>
            <div className="text-2xl font-bold mt-1">
              {summary.total}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">Library</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {summary.bySource.LIBRARY}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">Wishlist</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {summary.bySource.WISHLIST}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">By Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <div>
              <div className="text-xs text-muted-foreground">Finished</div>
              <div className="text-lg font-semibold">
                {summary.byStatus.Finished}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">In Progress</div>
              <div className="text-lg font-semibold">
                {summary.byStatus['In Progress']}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Not Started</div>
              <div className="text-lg font-semibold">
                {summary.byStatus['Not Started']}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Library Table */}
      <Suspense
        fallback={
          <Card>
            <CardContent className="py-6">
              <div className="animate-pulse space-y-3">
                <div className="h-12 bg-muted rounded"></div>
                <div className="h-12 bg-muted rounded"></div>
                <div className="h-12 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        }
      >
        <UserLibraryTable userId={userId} searchParams={resolvedSearchParams} />
      </Suspense>

      {/* Danger Zone */}
      <DangerZone userId={userId} userEmail={user.email} />
    </div>
  )
}
