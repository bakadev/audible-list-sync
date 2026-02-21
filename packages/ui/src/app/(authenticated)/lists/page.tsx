import { Metadata } from 'next'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { ManageListsClient } from './manage-lists-client'

export const metadata: Metadata = {
  title: 'My Lists',
  description: 'Manage your audiobook recommendation lists and tier rankings',
}

export default async function ListsPage() {
  const session = await auth()
  if (!session?.user) return null

  const [lists, user] = await Promise.all([
    prisma.list.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true },
    }),
  ])

  const serializedLists = lists.map((list) => ({
    id: list.id,
    name: list.name,
    description: list.description,
    type: list.type as 'RECOMMENDATION' | 'TIER',
    itemCount: list._count.items,
    updatedAt: list.updatedAt.toISOString(),
  }))

  return (
    <div className="container max-w-6xl py-8 md:py-12">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold leading-tight md:text-4xl">
              My Lists
            </h1>
            <p className="text-sm text-muted-foreground">
              Create and manage recommendation lists and tier rankings.
            </p>
          </div>
          <Link href="/lists/new">
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" />
              Create List
            </Button>
          </Link>
        </div>

        {serializedLists.length === 0 ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-16 w-16 text-muted-foreground"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
                />
              </svg>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">No Lists Yet</h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  Create your first recommendation list or tier ranking from your audiobook library.
                </p>
              </div>
              <Link href="/lists/new">
                <Button className="mt-2 gap-1.5">
                  <Plus className="h-4 w-4" />
                  Create Your First List
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <ManageListsClient lists={serializedLists} username={user?.username || null} />
        )}
      </div>
    </div>
  )
}
