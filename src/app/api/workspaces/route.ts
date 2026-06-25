import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { errorJson } from '@/lib/api-response';
import { AppError } from '@/lib/errors';
import { nanoid } from 'nanoid';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: session.user.id },
      include: {
        workspace: {
          include: {
            _count: {
              select: { deployments: true }
            }
          }
        }
      }
    });

    const workspaces = memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      billingPlan: m.workspace.billingPlan,
      subscriptionStatus: m.workspace.subscriptionStatus,
      role: m.role,
      deploymentsCount: m.workspace._count.deployments,
    }));

    return NextResponse.json(workspaces);
  } catch (error) {
    return errorJson(error, 'Failed to fetch workspaces');
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name } = await request.json();
    if (!name || typeof name !== 'string') {
      throw new AppError('Name is required', 400);
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!slug) {
      throw new AppError('Invalid workspace name', 400);
    }

    // Check limits: Free tier users can only own 1 workspace
    const ownedWorkspaces = await prisma.workspaceMember.findMany({
      where: {
        userId,
        role: 'OWNER',
      },
      include: {
        workspace: true,
      },
    });

    // If they already own any workspaces, check if any of them are 'free'
    const hasFreeWorkspace = ownedWorkspaces.some(w => w.workspace.billingPlan === 'free');

    if (hasFreeWorkspace) {
      throw new AppError('Free tier limit reached: Upgrade your existing workspace to Pro to create more workspaces.', 402, 'LIMIT_EXCEEDED');
    }

    const workspace = await prisma.$transaction(async (tx) => {
      const existing = await tx.workspace.findUnique({
        where: { slug },
      });
      const finalSlug = existing ? `${slug}-${nanoid(4).toLowerCase()}` : slug;

      const ws = await tx.workspace.create({
        data: {
          name,
          slug: finalSlug,
          billingPlan: 'free',
          subscriptionStatus: 'active',
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: ws.id,
          userId,
          role: 'OWNER',
        },
      });

      return ws;
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    return errorJson(error, 'Failed to create workspace');
  }
}
