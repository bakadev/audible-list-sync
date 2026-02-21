import { Metadata } from 'next'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { CreateListForm } from './create-list-form'

export const metadata: Metadata = {
  title: 'Create New List',
  description: 'Create a new recommendation or tier list',
}

export default async function NewListPage() {
  const session = await auth()
  if (!session?.user) return null

  // Check if user has a username set
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  })

  return (
    <div className="container max-w-2xl py-8 md:py-12">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight">Create New List</h1>
          <p className="text-base text-muted-foreground">
            Create a recommendation list or tier list from your library.
          </p>
        </div>

        <CreateListForm hasUsername={!!user?.username} />
      </div>
    </div>
  )
}
