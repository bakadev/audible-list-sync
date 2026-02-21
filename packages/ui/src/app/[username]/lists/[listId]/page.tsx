import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { fetchTitleMetadataBatch } from '@/lib/audnex'
import { PublicListView } from '@/components/lists/public-list-view'
import { PublicTierView } from '@/components/lists/public-tier-view'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ListOrdered, Layers } from 'lucide-react'
import Link from 'next/link'

interface PublicListPageProps {
  params: Promise<{ username: string; listId: string }>
}

export async function generateMetadata({ params }: PublicListPageProps): Promise<Metadata> {
  const { username, listId } = await params

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, name: true, username: true },
  })

  if (!user) {
    return { title: 'Not Found' }
  }

  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: { name: true, description: true, userId: true },
  })

  if (!list || list.userId !== user.id) {
    return { title: 'Not Found' }
  }

  return {
    title: `${list.name} by ${user.name || user.username} - audioshlf`,
    description: list.description || `A list by ${user.name || user.username}`,
  }
}

export default async function PublicListPage({ params }: PublicListPageProps) {
  const { username, listId } = await params

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

  const list = await prisma.list.findUnique({
    where: { id: listId },
    include: {
      items: {
        orderBy: [{ tier: 'asc' }, { position: 'asc' }],
      },
    },
  })

  if (!list || list.userId !== user.id) {
    notFound()
  }

  // Fetch metadata from Audnexus
  const asins = list.items.map((item) => item.titleAsin)
  let metadataMap: Record<string, any> = {}
  if (asins.length > 0) {
    try {
      const metadataResults = await fetchTitleMetadataBatch(asins)
      metadataMap = Object.fromEntries(
        metadataResults
          .filter((m): m is NonNullable<typeof m> => m !== null)
          .map((m) => [m.asin, m])
      )
    } catch (e) {
      console.error('Failed to fetch metadata from Audnexus:', e)
    }
  }

  const enrichedItems = list.items.map((item) => {
    const meta = metadataMap[item.titleAsin]
    return {
      id: item.id,
      titleAsin: item.titleAsin,
      position: item.position,
      tier: item.tier,
      title: {
        asin: item.titleAsin,
        title: meta?.title || item.titleAsin,
        authors: meta?.authors?.map((a: any) => a.name) || [],
        narrators: meta?.narrators?.map((n: any) => n.name) || [],
        image: meta?.image || null,
        runtimeLengthMin: meta?.runtimeLengthMin || null,
      },
    }
  })

  const listTiers = (list.tiers as string[]) || ['S', 'A', 'B', 'C', 'D']

  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U'

  const formattedDate = new Date(list.updatedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
      <div className="space-y-6">
        {/* Author */}
        <Link href={`/${username}`} className="inline-flex items-center gap-2 hover:opacity-80">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || undefined} alt={user.name || username} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            {user.name || username}
          </span>
        </Link>

        {/* List Header */}
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <h1 className="text-3xl font-bold leading-tight">{list.name}</h1>
            <Badge variant="secondary" className="mt-1 shrink-0 text-xs">
              {list.type === 'RECOMMENDATION' ? (
                <><ListOrdered className="mr-1 h-3 w-3" />List</>
              ) : (
                <><Layers className="mr-1 h-3 w-3" />Tiers</>
              )}
            </Badge>
          </div>
          {list.description && (
            <p className="text-muted-foreground">{list.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {enrichedItems.length} {enrichedItems.length === 1 ? 'title' : 'titles'} &middot; Updated {formattedDate}
          </p>
        </div>

        {/* List Content */}
        {list.type === 'RECOMMENDATION' ? (
          <PublicListView
            items={enrichedItems.sort((a, b) => a.position - b.position)}
          />
        ) : (
          <PublicTierView
            items={enrichedItems}
            tiers={listTiers}
          />
        )}
      </div>
    </div>
  )
}
