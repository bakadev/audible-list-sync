'use client'

/**
 * Manual ASIN Import Component
 *
 * Allows admins to manually import a single title by ASIN
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ManualImport() {
  const router = useRouter()
  const [asin, setAsin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!asin.trim()) {
      setError('Please enter an ASIN')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Create minimal import payload with single title
      const importPayload = {
        titleCatalog: [{ asin: asin.trim() }],
        importSource: 'MANUAL_ADMIN',
      }

      const response = await fetch('/api/admin/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(importPayload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to import title')
      }

      const data = await response.json()

      if (data.summary.failureCount > 0) {
        throw new Error(
          data.summary.errors[0]?.error || 'Failed to import title from Audnex'
        )
      }

      setSuccess(`Successfully imported title: ${asin}`)
      setAsin('')

      // Refresh the page to show the new title
      setTimeout(() => {
        router.refresh()
        setSuccess(null)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Import</CardTitle>
        <CardDescription>
          Import a single title by ASIN from Audnex API
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleImport} className="space-y-4">
          {/* Success Message */}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-green-700 dark:text-green-400 text-sm">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter ASIN (e.g., B002V5D1DG)"
              value={asin}
              onChange={(e) => setAsin(e.target.value.toUpperCase())}
              disabled={loading}
              className="font-mono"
            />
            <Button type="submit" disabled={loading || !asin.trim()}>
              {loading ? 'Importing...' : 'Import'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            The title will be fetched from Audnex API and added to the catalog
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
