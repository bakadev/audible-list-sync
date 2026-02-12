'use client'

/**
 * Admin Titles Table Component
 *
 * T138-T142: Titles table with search, sorting, pagination, and navigation
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Title {
  asin: string
  title: string
  subtitle: string | null
  image: string | null
  runtimeLengthMin: number | null
  rating: string | null
  releaseDate: string | null
  authors: string[]
  narrators: string[]
  userCount: number
  createdAt: string
}

interface TitlesTableProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default function TitlesTable({ searchParams }: TitlesTableProps) {
  const router = useRouter()
  const [titles, setTitles] = useState<Title[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState((searchParams.search as string) || '')
  const [sortBy, setSortBy] = useState(
    (searchParams.sortBy as string) || 'createdAt'
  )
  const [sortOrder, setSortOrder] = useState(
    (searchParams.sortOrder as string) || 'desc'
  )
  const [page, setPage] = useState(parseInt((searchParams.page as string) || '1'))
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    fetchTitles()
  }, [search, sortBy, sortOrder, page])

  const fetchTitles = async () => {
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

      const response = await fetch(`/api/admin/titles?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch titles')
      }

      const data = await response.json()
      setTitles(data.titles)
      setTotalPages(data.pagination.totalPages)
      setTotalCount(data.pagination.totalCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // T142: Navigate to title detail page
  const handleTitleClick = (asin: string) => {
    router.push(`/admin/titles/${asin}`)
  }

  // T140: Handle sorting
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setPage(1)
  }

  // T139: Handle search
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  // T141: Handle pagination
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
      {/* T139: Search Bar */}
      <CardHeader>
        <Input
          type="text"
          placeholder="Search by title, author, or narrator..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </CardHeader>

      {/* T138: Titles Table */}
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cover</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center gap-1">
                  Title
                  {sortBy === 'title' && (
                    <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </TableHead>
              <TableHead>ASIN</TableHead>
              <TableHead>Authors</TableHead>
              <TableHead>Narrators</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('rating')}
              >
                <div className="flex items-center gap-1">
                  Rating
                  {sortBy === 'rating' && (
                    <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </TableHead>
              <TableHead>Users</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('releaseDate')}
              >
                <div className="flex items-center gap-1">
                  Released
                  {sortBy === 'releaseDate' && (
                    <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : titles.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  No titles found
                </TableCell>
              </TableRow>
            ) : (
              titles.map((title) => (
                <TableRow
                  key={title.asin}
                  onClick={() => handleTitleClick(title.asin)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    {title.image && (
                      <img
                        src={title.image}
                        alt={title.title}
                        className="h-16 w-12 object-cover rounded"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{title.title}</div>
                    {title.subtitle && (
                      <div className="text-xs text-muted-foreground">{title.subtitle}</div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {title.asin}
                  </TableCell>
                  <TableCell className="text-sm">
                    {title.authors.join(', ') || '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {title.narrators.join(', ') || '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {title.rating || '-'}
                  </TableCell>
                  <TableCell className="text-sm">{title.userCount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {title.releaseDate
                      ? new Date(title.releaseDate).toLocaleDateString()
                      : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* T141: Pagination */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <div className="text-sm text-muted-foreground">
            Showing page {page} of {totalPages} ({totalCount} total titles)
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
