import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { errorJson } from '@/lib/api-response';
import { syncCustomBlueprintToGitHub } from '@/features/blueprints/custom-blueprint-service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const body = await request.json() as { repositoryId?: string };
    if (!body.repositoryId) {
      return NextResponse.json({ error: 'repositoryId is required' }, { status: 400 });
    }
    const pr = await syncCustomBlueprintToGitHub(slug, body.repositoryId, session.user.id);
    return NextResponse.json(pr);
  } catch (error: unknown) {
    return errorJson(error, 'Failed to sync custom blueprint');
  }
}
