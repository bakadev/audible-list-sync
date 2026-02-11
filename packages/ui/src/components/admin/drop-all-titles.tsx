'use client'

/**
 * Drop All Titles Component
 *
 * T164-T168: Drop all titles with strict confirmation
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DropAllTitles() {
  const router = useRouter()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // T166: Call DELETE endpoint with confirmation
  const handleDropAllTitles = async () => {
    if (confirmText !== 'DELETE_ALL_TITLES') {
      setError('Confirmation text does not match')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(
        '/api/admin/titles?confirm=DELETE_ALL_TITLES',
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to drop all titles')
      }

      const data = await response.json()

      // T167: Display deletedCount and success message
      setSuccess(data.message)
      setShowConfirmDialog(false)
      setConfirmText('')

      // Refresh the page after 2 seconds
      setTimeout(() => {
        router.refresh()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow border-2 border-red-200">
      <div className="px-6 py-4 border-b border-red-200 bg-red-50">
        <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
        <p className="text-sm text-red-700 mt-1">
          Extremely destructive database operations
        </p>
      </div>

      <div className="p-6">
        {/* Success Message */}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{success}</p>
            <p className="text-sm text-green-600 mt-1">
              Page will refresh automatically...
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {/* T164: Drop All Titles Button */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">
              Drop All Titles
            </h3>
            {/* T168: Warning text */}
            <p className="text-sm text-gray-600 mt-1">
              Delete <strong>ALL</strong> title records, including all authors,
              narrators, genres, series, and user library associations. This
              action is <strong>IRREVERSIBLE</strong> and will affect all users.
            </p>
            <p className="text-sm text-red-600 font-medium mt-2">
              ⚠️ This will delete the entire title catalog from the database!
            </p>
          </div>
          <button
            onClick={() => setShowConfirmDialog(true)}
            disabled={loading}
            className="ml-4 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Drop All Titles
          </button>
        </div>
      </div>

      {/* T165: Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirm Complete Title Deletion
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                You are about to delete <strong>ALL TITLES</strong> from the
                database. This will permanently remove:
              </p>
              <ul className="text-sm text-gray-600 mb-4 list-disc list-inside space-y-1">
                <li>All title records and metadata</li>
                <li>All author, narrator, genre, and series associations</li>
                <li>All user library entries and progress</li>
                <li>All import history and sync records</li>
              </ul>
              <p className="text-sm text-red-600 font-bold mb-4">
                THIS ACTION CANNOT BE UNDONE!
              </p>

              {/* T165: Type confirmation text */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    DELETE_ALL_TITLES
                  </code> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE_ALL_TITLES"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
                  disabled={loading}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowConfirmDialog(false)
                    setConfirmText('')
                    setError(null)
                  }}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDropAllTitles}
                  disabled={loading || confirmText !== 'DELETE_ALL_TITLES'}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Deleting...' : 'Yes, Delete Everything'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
