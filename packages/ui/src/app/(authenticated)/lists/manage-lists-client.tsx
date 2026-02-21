'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ListCard } from '@/components/lists/list-card'
import { toast } from 'sonner'

interface ManageListsClientProps {
  lists: {
    id: string
    name: string
    description: string | null
    type: 'RECOMMENDATION' | 'TIER'
    itemCount: number
    updatedAt: string
  }[]
  username: string | null
}

export function ManageListsClient({ lists: initialLists, username }: ManageListsClientProps) {
  const router = useRouter()
  const [lists, setLists] = useState(initialLists)

  const handleDelete = async (listId: string) => {
    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        toast.error('Failed to delete list')
        return
      }

      setLists(lists.filter((l) => l.id !== listId))
      toast.success('List deleted')
    } catch {
      toast.error('Something went wrong')
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {lists.map((list) => (
        <ListCard key={list.id} list={list} username={username} onDelete={handleDelete} />
      ))}
    </div>
  )
}
