'use client'

/**
 * Admin Titles Table Component
 *
 * T138-T142: Titles table with search, sorting, pagination, and navigation
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* T139: Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search by title, author, or narrator..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* T138: Titles Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cover
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center">
                  Title
                  {sortBy === 'title' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ASIN
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Authors
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Narrators
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('rating')}
              >
                <div className="flex items-center">
                  Rating
                  {sortBy === 'rating' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Users
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('releaseDate')}
              >
                <div className="flex items-center">
                  Released
                  {sortBy === 'releaseDate' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                </td>
              </tr>
            ) : titles.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  No titles found
                </td>
              </tr>
            ) : (
              titles.map((title) => (
                <tr
                  key={title.asin}
                  onClick={() => handleTitleClick(title.asin)}
                  className="hover:bg-gray-50 cursor-pointer transition"
                >
                  <td className="px-6 py-4">
                    {title.image && (
                      <img
                        src={title.image}
                        alt={title.title}
                        className="h-16 w-12 object-cover rounded"
                      />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {title.title}
                    </div>
                    {title.subtitle && (
                      <div className="text-xs text-gray-500">{title.subtitle}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">
                    {title.asin}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {title.authors.join(', ') || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {title.narrators.join(', ') || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {title.rating || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {title.userCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {title.releaseDate
                      ? new Date(title.releaseDate).toLocaleDateString()
                      : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* T141: Pagination */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing page {page} of {totalPages} ({totalCount} total titles)
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handlePrevPage}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={handleNextPage}
            disabled={page >= totalPages}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
