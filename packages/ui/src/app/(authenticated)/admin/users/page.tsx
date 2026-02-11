/**
 * Admin Users List Page
 *
 * Displays list of all users with search, sorting, and pagination
 * T088: Users list page component
 * T089: Fetch users from GET /api/admin/users with pagination
 */

import { Suspense } from 'react'
import UsersTable from '@/components/admin/users-table'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          View and manage user accounts and their libraries
        </p>
      </div>

      <Suspense
        fallback={
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-3">
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        }
      >
        <UsersTable searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
