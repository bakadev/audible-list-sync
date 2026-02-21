import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { validateUsername } from '@/lib/username-validation';

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { username } = body as { username?: string };

  if (!username || typeof username !== 'string') {
    return NextResponse.json(
      { error: 'Username is required' },
      { status: 400 }
    );
  }

  const validation = validateUsername(username);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Check uniqueness (exclude current user)
  const existingUser = await prisma.user.findFirst({
    where: {
      username,
      NOT: { id: session.user.id },
    },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: 'This username is already taken' },
      { status: 409 }
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: { username },
  });

  return NextResponse.json({ username: updatedUser.username });
}
