import { NextResponse } from 'next/server';
import { listBlueprints } from '@/features/blueprints/blueprint-service';
import { auth } from '@/auth';
import { errorJson } from '@/lib/api-response';
import type { BlueprintFilter } from '@/features/blueprints/blueprint-service';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const difficulty = searchParams.get('difficulty') as BlueprintFilter['difficulty'] | null;
  const search = searchParams.get('search') || undefined;
  const tagsParam = searchParams.get('tags');
  const tags = tagsParam ? tagsParam.split(',') : undefined;

  try {
    const blueprints = await listBlueprints({
      category,
      difficulty: difficulty || undefined,
      search,
      tags,
      userId: session.user.id,
    });
    return NextResponse.json(blueprints);
  } catch (error: unknown) {
    return errorJson(error, 'Failed to list blueprints');
  }
}

