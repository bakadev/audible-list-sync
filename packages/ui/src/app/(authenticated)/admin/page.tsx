/**
 * Admin Dashboard Home Page
 *
 * Displays overview statistics and recent activity
 * - Total users count
 * - Total titles count
 * - Recent import operations (last 10)
 */

import prisma from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default async function AdminDashboardPage() {
  // T058: Display total users count
  const totalUsers = await prisma.user.count()

  // T060: Display recent import operations (last 10)
  const recentImports = await prisma.syncHistory.findMany({
    take: 10,
    orderBy: {
      syncedAt: 'desc',
    },
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  })

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl md:text-4xl">{totalUsers}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Registered users in the system
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Import Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Import Operations</CardTitle>
          <CardDescription>Last 10 extension data imports</CardDescription>
        </CardHeader>
        <CardContent>
          {recentImports.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No import operations yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Titles</TableHead>
                  <TableHead>Library / Wishlist</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentImports.map((importOp) => (
                  <TableRow key={importOp.id}>
                    <TableCell className="text-sm">
                      {new Date(importOp.syncedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {importOp.user.name || importOp.user.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          importOp.success
                            ? 'default'
                            : importOp.warnings.length > 0
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {importOp.success
                          ? 'Success'
                          : importOp.warnings.length > 0
                            ? 'Partial'
                            : 'Failed'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {importOp.titlesImported} titles
                      {importOp.newToCatalog > 0 && (
                        <span className="text-green-600 dark:text-green-400 ml-1">
                          ({importOp.newToCatalog} new)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      L: {importOp.libraryCount} | W: {importOp.wishlistCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
