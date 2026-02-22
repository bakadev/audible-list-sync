import { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { fetchTitleMetadataBatch } from '@/lib/audnex'
import { EditListClient } from './edit-list-client'

export const metadata: Metadata = {
  title: 'Edit List',
  description: 'Edit your list',
}

export default async function EditListPage({
  params,
}: {
  params: Promise<{ listId: string }>
}) {
  const session = await auth()
  if (!session?.user) return null

  const { listId } = await params

  const list = await prisma.list.findUnique({
    where: { id: listId },
    include: {
      items: {
        orderBy: [{ tier: 'asc' }, { position: 'asc' }],
      },
    },
  })

  if (!list) {
    notFound()
  }

  if (list.userId !== session.user.id) {
    redirect('/lists')
  }

  // Fetch metadata for all items from Audnexus
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

  // Enrich items with metadata
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

  // Get username for share link
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  })

  return (
    <div className="container max-w-4xl py-8 md:py-12">
      <EditListClient
        list={{
          id: list.id,
          name: list.name,
          description: list.description,
          type: list.type,
          tiers: (list.tiers as string[]) || ['S', 'A', 'B', 'C', 'D'],
          items: enrichedItems,
          imageTemplateId: list.imageTemplateId,
          imageStatus: list.imageStatus,
          imageOgUrl: list.imageStatus === 'READY' && list.imageOgKey
            ? `/api/lists/${list.id}/og-image`
            : null,
          imageError: list.imageError,
        }}
        username={user?.username || null}
      />
    </div>
  )
}
