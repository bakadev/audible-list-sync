/**
 * Admin Titles List Page
 *
 * T136-T137: Titles list page with search and pagination
 * T169: Drop All Titles button
 */

import { Suspense } from 'react'
import TitlesTable from '@/components/admin/titles-table'
import DropAllTitles from '@/components/admin/drop-all-titles'
import ManualImport from '@/components/admin/manual-import'
import { Card, CardContent } from '@/components/ui/card'

export default async function AdminTitlesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold leading-tight md:text-3xl">Title Management</h2>
        <p className="text-sm text-muted-foreground">
          View and manage audiobook title metadata
        </p>
      </div>

      {/* Manual ASIN Import */}
      <ManualImport />

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
        <TitlesTable searchParams={searchParams} />
      </Suspense>

      {/* T169: Drop All Titles Danger Zone */}
      <DropAllTitles />
    </div>
  )
}
