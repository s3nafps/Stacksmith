import { prisma } from '@/lib/prisma';
import { WorkspaceRole } from '@prisma/client';
import { AppError } from '@/lib/errors';

const ROLE_LEVELS: Record<WorkspaceRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  OPERATOR: 2,
  VIEWER: 1,
};

export async function checkWorkspacePermission(
  userId: string,
  workspaceId: string,
  minRole: WorkspaceRole
): Promise<WorkspaceRole> {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });

  if (!member) {
    throw new AppError('Forbidden: You are not a member of this workspace', 403, 'FORBIDDEN');
  }

  if (ROLE_LEVELS[member.role] < ROLE_LEVELS[minRole]) {
    throw new AppError(
      `Forbidden: Required role ${minRole}, but you have ${member.role}`,
      403,
      'FORBIDDEN'
    );
  }

  return member.role;
}

export async function checkDeploymentPermission(
  userId: string,
  deploymentId: string,
  minRole: WorkspaceRole
): Promise<WorkspaceRole> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    select: { workspaceId: true },
  });

  if (!deployment) {
    throw new AppError('Deployment not found', 404, 'NOT_FOUND');
  }

  return checkWorkspacePermission(userId, deployment.workspaceId, minRole);
}
