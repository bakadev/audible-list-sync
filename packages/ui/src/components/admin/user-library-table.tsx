'use client'

/**
 * User Library Table Component
 *
 * T099: Create UserLibraryTable showing all library entries
 * T100: Display title, ASIN, authors, narrators, userRating, status, progress
 * T101: Add filter tabs for source
 * T102: Add filter buttons for status
 */

import { useState, useEffect } from 'react'

interface LibraryEntry {
  id: string
  titleAsin: string
  userRating: number
  status: string
  progress: number
  timeLeft: string | null
  source: string
}

interface UserLibraryTableProps {
  userId: string
  searchParams: { [key: string]: string | string[] | undefined }
}

export default function UserLibraryTable({
  userId,
  searchParams,
}: UserLibraryTableProps) {
  const [library, setLibrary] = useState<LibraryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // T101: Source filter
  const [sourceFilter, setSourceFilter] = useState<string | null>(
    (searchParams.source as string) || null
  )

  // T102: Status filter
  const [statusFilter, setStatusFilter] = useState<string | null>(
    (searchParams.status as string) || null
  )

  useEffect(() => {
    fetchLibrary()
  }, [sourceFilter, statusFilter])

  const fetchLibrary = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (sourceFilter) params.append('source', sourceFilter)
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(
        `/api/admin/users/${userId}?${params.toString()}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch library')
      }

      const data = await response.json()
      setLibrary(data.library)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
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
      {/* T101: Source Filter Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-4 px-6 py-3">
          <button
            onClick={() => setSourceFilter(null)}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              sourceFilter === null
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Sources
          </button>
          <button
            onClick={() => setSourceFilter('LIBRARY')}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              sourceFilter === 'LIBRARY'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Library
          </button>
          <button
            onClick={() => setSourceFilter('WISHLIST')}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              sourceFilter === 'WISHLIST'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Wishlist
          </button>
          <button
            onClick={() => setSourceFilter('EXTENSION')}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              sourceFilter === 'EXTENSION'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Extension
          </button>
        </div>
      </div>

      {/* T102: Status Filter Buttons */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-4 px-6 py-3">
          <button
            onClick={() => setStatusFilter(null)}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              statusFilter === null
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Status
          </button>
          <button
            onClick={() => setStatusFilter('Finished')}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              statusFilter === 'Finished'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Finished
          </button>
          <button
            onClick={() => setStatusFilter('In Progress')}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              statusFilter === 'In Progress'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setStatusFilter('Not Started')}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              statusFilter === 'Not Started'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Not Started
          </button>
        </div>
      </div>

      {/* T100: Library Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ASIN
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rating
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                </td>
              </tr>
            ) : library.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  No library entries found
                </td>
              </tr>
            ) : (
              library.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">
                    {entry.titleAsin}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.userRating > 0 ? `${entry.userRating}/5` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        entry.status === 'Finished'
                          ? 'bg-green-100 text-green-800'
                          : entry.status === 'In Progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.progress > 0 ? `${entry.progress}%` : '-'}
                    {entry.timeLeft && (
                      <div className="text-xs text-gray-500">
                        {entry.timeLeft}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                    {entry.source}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
