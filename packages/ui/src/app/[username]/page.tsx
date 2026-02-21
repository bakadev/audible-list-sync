import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ListOrdered, Layers } from 'lucide-react'

interface PublicProfilePageProps {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params
  const user = await prisma.user.findUnique({
    where: { username },
    select: { name: true, username: true },
  })

  if (!user) {
    return { title: 'User Not Found' }
  }

  return {
    title: `${user.name || user.username} - audioshlf`,
    description: `View ${user.name || user.username}'s audiobook lists on audioshlf`,
  }
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
    },
  })

  if (!user) {
    notFound()
  }

  const lists = await prisma.list.findMany({
    where: { userId: user.id },
    include: {
      _count: {
        select: { items: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U'

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
      <div className="space-y-8">
        {/* Profile Header */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.image || undefined} alt={user.name || user.username || ''} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{user.name || user.username}</h1>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
          </div>
        </div>

        {/* Lists */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Lists ({lists.length})
          </h2>

          {lists.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No lists yet.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {lists.map((list) => {
                const formattedDate = new Date(list.updatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })

                return (
                  <Link key={list.id} href={`/${username}/lists/${list.id}`}>
                    <Card className="p-5 transition-colors hover:bg-muted/50">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold leading-tight line-clamp-2">
                            {list.name}
                          </h3>
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            {list.type === 'RECOMMENDATION' ? (
                              <><ListOrdered className="mr-1 h-3 w-3" />List</>
                            ) : (
                              <><Layers className="mr-1 h-3 w-3" />Tiers</>
                            )}
                          </Badge>
                        </div>

                        {list.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {list.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{list._count.items} {list._count.items === 1 ? 'title' : 'titles'}</span>
                          <span>&middot;</span>
                          <span>Updated {formattedDate}</span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
