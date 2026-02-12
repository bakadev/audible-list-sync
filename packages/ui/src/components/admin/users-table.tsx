'use client'

/**
 * Admin Users Table Component
 *
 * T090: Display email, name, library counts, lastImportAt
 * T091: Search input filtering by email/name
 * T092: Sorting controls
 * T093: Pagination controls
 * T094: Click handler to navigate to user detail
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface User {
  id: string
  email: string
  name: string | null
  image: string | null
  isAdmin: boolean
  createdAt: string
  libraryCount: number
  lastImportAt: string | null
}

interface UsersTableProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default function UsersTable({ searchParams }: UsersTableProps) {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(
    (searchParams.search as string) || ''
  )
  const [sortBy, setSortBy] = useState(
    (searchParams.sortBy as string) || 'createdAt'
  )
  const [sortOrder, setSortOrder] = useState(
    (searchParams.sortOrder as string) || 'desc'
  )
  const [page, setPage] = useState(
    parseInt((searchParams.page as string) || '1')
  )
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    fetchUsers()
  }, [search, sortBy, sortOrder, page])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(search && { search }),
        sortBy,
        sortOrder,
      })

      const response = await fetch(`/api/admin/users?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()
      setUsers(data.users)
      setTotalPages(data.pagination.totalPages)
      setTotalCount(data.pagination.totalCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // T094: Navigate to user detail page
  const handleUserClick = (userId: string) => {
    router.push(`/admin/users/${userId}`)
  }

  // T092: Handle sorting
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setPage(1)
  }

  // T091: Handle search
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  // T093: Handle pagination
  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1)
  }

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1)
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-6">
          <p className="text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      {/* Search Bar */}
      <CardHeader>
        <Input
          type="text"
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </CardHeader>

      {/* Users Table */}
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('email')}
              >
                <div className="flex items-center gap-1">
                  Email
                  {sortBy === 'email' && (
                    <span className="text-xs">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Name
                  {sortBy === 'name' && (
                    <span className="text-xs">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead>Library Count</TableHead>
              <TableHead>Last Import</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('createdAt')}
              >
                <div className="flex items-center gap-1">
                  Created
                  {sortBy === 'createdAt' && (
                    <span className="text-xs">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow
                  key={user.id}
                  onClick={() => handleUserClick(user.id)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.name || '-'}</TableCell>
                  <TableCell>{user.libraryCount}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.lastImportAt
                      ? new Date(user.lastImportAt).toLocaleString()
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {user.isAdmin && (
                      <Badge variant="secondary">Admin</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <div className="text-sm text-muted-foreground">
            Showing page {page} of {totalPages} ({totalCount} total users)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
