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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogOverlay,
  DialogPortal,
} from '@/components/ui/dialog'

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
    <>
      <Card className="border-destructive/50">
        <CardHeader className="bg-destructive/10 border-b border-destructive/20">
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription className="text-destructive/80">
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Success Message */}
          {success && (
            <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-green-700 dark:text-green-400">{success}</p>
              <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                Page will refresh automatically...
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-destructive">Error: {error}</p>
            </div>
          )}

          {/* Drop Library Button */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium">Drop User Library</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Delete all library entries for this user. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowConfirmDialog(true)}
              disabled={loading}
              className="ml-4"
            >
              Drop Library
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* T104: Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent className="max-w-md">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Confirm Library Deletion
                </h3>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete all library entries for{' '}
                  <span className="font-semibold text-foreground">{userEmail}</span>?
                </p>
              </div>
              <p className="text-sm text-destructive font-medium">
                This action cannot be undone!
              </p>

              <div className="flex justify-end gap-3 pt-4">
                <DialogClose asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDropLibrary}
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Yes, Delete Library'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  )
}
