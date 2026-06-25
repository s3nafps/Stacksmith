import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { errorJson } from '@/lib/api-response';
import { createCustomBlueprint, type CustomBlueprintInput } from '@/features/blueprints/custom-blueprint-service';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as CustomBlueprintInput;
    const blueprint = await createCustomBlueprint(body, session.user.id);
    return NextResponse.json(blueprint, { status: 201 });
  } catch (error: unknown) {
    return errorJson(error, 'Failed to create custom blueprint');
  }
}
