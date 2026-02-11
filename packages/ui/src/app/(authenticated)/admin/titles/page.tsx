/**
 * Admin Titles List Page
 *
 * T136-T137: Titles list page with search and pagination
 * T169: Drop All Titles button
 */

import { Suspense } from 'react'
import TitlesTable from '@/components/admin/titles-table'
import DropAllTitles from '@/components/admin/drop-all-titles'

export default async function AdminTitlesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Title Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          View and manage audiobook title metadata
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
        <TitlesTable searchParams={searchParams} />
      </Suspense>

      {/* T169: Drop All Titles Danger Zone */}
      <div className="mt-6">
        <DropAllTitles />
      </div>
    </div>
  )
}
