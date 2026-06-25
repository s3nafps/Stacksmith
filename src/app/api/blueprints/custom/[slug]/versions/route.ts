import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { errorJson } from '@/lib/api-response';
import {
  createCustomBlueprintVersion,
  type CustomBlueprintInput,
} from '@/features/blueprints/custom-blueprint-service';

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
    const body = (await request.json()) as { version: string; blueprintInput: CustomBlueprintInput };
    if (!body.version || !body.blueprintInput) {
      return NextResponse.json({ error: 'version and blueprintInput are required' }, { status: 400 });
    }
    const blueprint = await createCustomBlueprintVersion(
      slug,
      body.version,
      body.blueprintInput,
      session.user.id
    );
    return NextResponse.json(blueprint, { status: 201 });
  } catch (error: unknown) {
    return errorJson(error, 'Failed to add custom blueprint version');
  }
}
