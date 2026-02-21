import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function PublicProfileNotFound() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <h2 className="text-2xl font-bold">User Not Found</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            The user you&apos;re looking for doesn&apos;t exist or hasn&apos;t created a public profile yet.
          </p>
          <Link href="/">
            <Button variant="outline">Go Home</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
