/**
 * Admin Users List Page
 *
 * Displays list of all users with search, sorting, and pagination
 * T088: Users list page component
 * T089: Fetch users from GET /api/admin/users with pagination
 */

import { Suspense } from 'react'
import UsersTable from '@/components/admin/users-table'
import { Card, CardContent } from '@/components/ui/card'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold leading-tight md:text-3xl">User Management</h2>
        <p className="text-sm text-muted-foreground">
          View and manage user accounts and their libraries
        </p>
      </div>

      <Suspense
        fallback={
          <Card>
            <CardContent className="py-6">
              <div className="animate-pulse space-y-3">
                <div className="h-10 bg-muted rounded"></div>
                <div className="h-12 bg-muted rounded"></div>
                <div className="h-12 bg-muted rounded"></div>
                <div className="h-12 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        }
      >
        <UsersTable searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
