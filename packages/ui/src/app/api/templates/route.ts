import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// Import templates to ensure they are registered
import '@/lib/image-generator/templates/grid-3x3'
import '@/lib/image-generator/templates/hero'
import '@/lib/image-generator/templates/minimal-banner'
import '@/lib/image-generator/templates/hero-plus'
import '@/lib/image-generator/templates/tier-list'

import { getTemplateList, type ListType } from '@/lib/image-generator/templates/registry'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const listType = request.nextUrl.searchParams.get('listType') as ListType | null
  const templates = getTemplateList(listType ?? undefined)

  return NextResponse.json({ templates })
}
