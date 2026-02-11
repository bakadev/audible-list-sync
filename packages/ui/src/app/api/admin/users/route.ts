/**
 * Admin Users List API
 *
 * GET /api/admin/users - List all users with pagination, search, and sorting
 * - Requires admin authentication
 * - Supports pagination (page, limit)
 * - Supports search by email or name
 * - Supports sorting by multiple fields
 * - Aggregates library counts and last import date
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/admin-auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    // T066: Authentication and admin role check
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    requireAdmin(user)

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams

    // T067: Pagination (default 50 per page)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // T068: Search filtering by email or name (case-insensitive)
    const search = searchParams.get('search') || ''
    const searchFilter = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    // T069: Sorting by email, name, or createdAt
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    // Valid sort fields
    const validSortFields = ['email', 'name', 'createdAt']
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt'

    // Fetch users with pagination and filters
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: searchFilter,
        skip,
        take: limit,
        orderBy: { [orderByField]: sortOrder },
        include: {
          _count: {
            select: {
              libraryEntries: true,
            },
          },
          syncHistory: {
            take: 1,
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              createdAt: true,
            },
          },
        },
      }),
      prisma.user.count({
        where: searchFilter,
      }),
    ])

    // T070: Aggregate library counts
    // T071: Get lastImportAt from most recent SyncHistory
    const usersWithAggregates = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      image: u.image,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt,
      libraryCount: u._count.libraryEntries,
      lastImportAt: u.syncHistory[0]?.createdAt || null,
    }))

    // T072: Return UserListResponse with pagination metadata
    return NextResponse.json({
      users: usersWithAggregates,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error('Admin users list error:', error)

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
