/**
 * Admin Drop User Library API
 *
 * DELETE /api/admin/users/[userId]/library - Delete all library entries for a user
 * - Requires admin authentication
 * - Requires confirmation query param for safety
 * - Returns count of deleted entries
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/admin-auth'
import prisma from '@/lib/prisma'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // T083: Authentication and admin role check
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    requireAdmin(adminUser)

    const { userId } = await params

    // T084: Validate confirmation query param
    // T087: Return 400 Bad Request if confirmation missing
    const searchParams = req.nextUrl.searchParams
    const confirmation = searchParams.get('confirm')

    if (confirmation !== 'true') {
      return NextResponse.json(
        {
          error:
            'Confirmation required. Add "?confirm=true" query parameter to proceed.',
        },
        { status: 400 }
      )
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // T085: Delete all LibraryEntry records for userId
    const result = await prisma.libraryEntry.deleteMany({
      where: { userId },
    })

    // T086: Return DropLibraryResponse with deletedCount
    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.count} library entries for user ${user.email}`,
      deletedCount: result.count,
    })
  } catch (error) {
    console.error('Admin drop user library error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
