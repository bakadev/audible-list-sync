'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export default function ListsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="container max-w-6xl py-8 md:py-12">
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Something went wrong</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              We couldn&apos;t load your lists. Please try again.
            </p>
          </div>
          <Button onClick={reset}>Try Again</Button>
        </div>
      </Card>
    </div>
  )
}
