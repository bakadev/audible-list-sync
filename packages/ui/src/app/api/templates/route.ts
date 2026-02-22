import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// Import templates to ensure they are registered
import '@/lib/image-generator/templates/grid-3x3'
import '@/lib/image-generator/templates/hero'
import '@/lib/image-generator/templates/minimal-banner'
import '@/lib/image-generator/templates/hero-plus'

import { getTemplateList } from '@/lib/image-generator/templates/registry'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const templates = getTemplateList()

  return NextResponse.json({ templates })
}
