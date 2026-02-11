/**
 * Admin Title Detail Page
 *
 * T143-T147, T155-T156: Title detail with metadata display, usage stats, and refresh
 */

'use client'

import { useState, useEffect } from 'react'
import TitleEditForm from '@/components/admin/title-edit-form'

interface TitleDetails {
  title: {
    asin: string
    title: string
    subtitle: string | null
    description: string | null
    summary: string | null
    image: string | null
    runtimeLengthMin: number | null
    rating: string | null
    releaseDate: string | null
    publisherName: string | null
    isbn: string | null
    language: string | null
    region: string | null
    authors: Array<{ name: string; position: number }>
    narrators: Array<{ name: string; position: number }>
    genres: Array<{ asin: string; name: string; type: string }>
    series: { asin: string; name: string } | null
    seriesPosition: string | null
  }
  usageStats: {
    totalUsers: number
    libraryCount: number
    wishlistCount: number
    finishedCount: number
    averageRating: number
  }
}

export default function TitleDetailPage({
  params,
}: {
  params: { asin: string }
}) {
  const [titleData, setTitleData] = useState<TitleDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshResult, setRefreshResult] = useState<{
    success: boolean
    message: string
    updatedFields?: string[]
  } | null>(null)

  useEffect(() => {
    fetchTitleDetails()
  }, [params.asin])

  const fetchTitleDetails = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/titles/${params.asin}`)

      if (!response.ok) {
        throw new Error('Failed to fetch title details')
      }

      const data = await response.json()
      setTitleData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // T155: Refresh from Audnex button
  const handleRefresh = async () => {
    setRefreshing(true)
    setRefreshResult(null)

    try {
      const response = await fetch(`/api/admin/titles/${params.asin}/refresh`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh from Audnex')
      }

      // T156: Display updated fields
      setRefreshResult({
        success: true,
        message: data.message,
        updatedFields: data.updatedFields,
      })

      // Refresh title details
      await fetchTitleDetails()
    } catch (err) {
      setRefreshResult({
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error || !titleData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error || 'Title not found'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* T145: Title Metadata Display */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-6">
          {titleData.title.image && (
            <img
              src={titleData.title.image}
              alt={titleData.title.title}
              className="h-48 w-32 object-cover rounded shadow-lg"
            />
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              {titleData.title.title}
            </h1>
            {titleData.title.subtitle && (
              <p className="text-xl text-gray-600 mt-2">
                {titleData.title.subtitle}
              </p>
            )}
            <div className="mt-4 space-y-2">
              <div className="text-sm">
                <span className="font-medium text-gray-700">ASIN:</span>
                <span className="ml-2 font-mono text-gray-900">
                  {titleData.title.asin}
                </span>
              </div>
              {titleData.title.rating && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Rating:</span>
                  <span className="ml-2 text-gray-900">
                    {titleData.title.rating}
                  </span>
                </div>
              )}
              {titleData.title.runtimeLengthMin && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Runtime:</span>
                  <span className="ml-2 text-gray-900">
                    {Math.floor(titleData.title.runtimeLengthMin / 60)}h{' '}
                    {titleData.title.runtimeLengthMin % 60}m
                  </span>
                </div>
              )}
              {titleData.title.releaseDate && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Released:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(titleData.title.releaseDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {titleData.title.description && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Description
            </h3>
            <p className="text-gray-900 text-sm leading-relaxed">
              {titleData.title.description}
            </p>
          </div>
        )}
      </div>

      {/* T146: Authors, Narrators, Genres, Series */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Authors</h3>
          {titleData.title.authors.length > 0 ? (
            <ul className="space-y-1">
              {titleData.title.authors.map((author, idx) => (
                <li key={idx} className="text-gray-900">
                  {author.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No authors</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Narrators</h3>
          {titleData.title.narrators.length > 0 ? (
            <ul className="space-y-1">
              {titleData.title.narrators.map((narrator, idx) => (
                <li key={idx} className="text-gray-900">
                  {narrator.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No narrators</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Genres</h3>
          {titleData.title.genres.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {titleData.title.genres.map((genre) => (
                <span
                  key={genre.asin}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {genre.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No genres</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Series</h3>
          {titleData.title.series ? (
            <div>
              <p className="text-gray-900">{titleData.title.series.name}</p>
              {titleData.title.seriesPosition && (
                <p className="text-sm text-gray-600">
                  Book {titleData.title.seriesPosition}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Not part of a series</p>
          )}
        </div>
      </div>

      {/* T147: Usage Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Usage Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <div className="text-sm text-gray-500">Total Users</div>
            <div className="text-2xl font-bold text-gray-900">
              {titleData.usageStats.totalUsers}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">In Library</div>
            <div className="text-2xl font-bold text-blue-600">
              {titleData.usageStats.libraryCount}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">In Wishlist</div>
            <div className="text-2xl font-bold text-green-600">
              {titleData.usageStats.wishlistCount}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Finished</div>
            <div className="text-2xl font-bold text-purple-600">
              {titleData.usageStats.finishedCount}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Avg Rating</div>
            <div className="text-2xl font-bold text-yellow-600">
              {titleData.usageStats.averageRating > 0
                ? titleData.usageStats.averageRating.toFixed(1)
                : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Refresh from Audnex Button */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Refresh from Audnex API
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Fetch latest metadata from Audnex and update this title
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshing ? 'Refreshing...' : 'Refresh from Audnex'}
          </button>
        </div>

        {/* T156: Display refresh result */}
        {refreshResult && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              refreshResult.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <p
              className={
                refreshResult.success ? 'text-green-800' : 'text-red-800'
              }
            >
              {refreshResult.message}
            </p>
            {refreshResult.updatedFields &&
              refreshResult.updatedFields.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-green-700 font-medium">
                    Updated fields:
                  </p>
                  <ul className="mt-1 text-sm text-green-700 list-disc list-inside">
                    {refreshResult.updatedFields.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Edit Form */}
      <TitleEditForm title={titleData.title} onUpdate={fetchTitleDetails} />
    </div>
  )
}
