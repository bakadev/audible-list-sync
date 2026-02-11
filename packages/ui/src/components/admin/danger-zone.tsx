'use client'

/**
 * Danger Zone Component
 *
 * T103: Create DangerZone component with "Drop User Library" button
 * T104: Add confirmation dialog before dropping library
 * T105: Call DELETE /api/admin/users/[userId]/library?confirm=true
 * T106: Display success message and refresh page
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DangerZoneProps {
  userId: string
  userEmail: string
}

export default function DangerZone({ userId, userEmail }: DangerZoneProps) {
  const router = useRouter()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // T105: Call DELETE endpoint
  const handleDropLibrary = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(
        `/api/admin/users/${userId}/library?confirm=true`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to drop library')
      }

      const data = await response.json()

      // T106: Display success message and refresh
      setSuccess(data.message)
      setShowConfirmDialog(false)

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
          Irreversible and destructive actions
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

        {/* Drop Library Button */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">
              Drop User Library
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Delete all library entries for this user. This action cannot be
              undone.
            </p>
          </div>
          <button
            onClick={() => setShowConfirmDialog(true)}
            disabled={loading}
            className="ml-4 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Drop Library
          </button>
        </div>
      </div>

      {/* T104: Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirm Library Deletion
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete all library entries for{' '}
                <span className="font-semibold">{userEmail}</span>?
              </p>
              <p className="text-sm text-red-600 font-medium mb-4">
                This action cannot be undone!
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDropLibrary}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Deleting...' : 'Yes, Delete Library'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
