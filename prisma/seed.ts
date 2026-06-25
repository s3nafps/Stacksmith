import 'dotenv/config';
import type { Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { encryptToken } from '../src/lib/encryption';
import { loadAll } from '../src/features/blueprints/blueprint-loader';

async function main() {
  console.log('Seeding database...');

  // 1. Clean existing records
  await prisma.activityEvent.deleteMany();
  await prisma.validationRun.deleteMany();
  await prisma.pullRequest.deleteMany();
  await prisma.deploymentInput.deleteMany();
  await prisma.deployment.deleteMany();
  await prisma.repository.deleteMany();
  await prisma.gitHubInstallation.deleteMany();
  await prisma.gitHubConnection.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.blueprintVersion.deleteMany();
  await prisma.blueprint.deleteMany();

  // 2. Load and seed blueprints from filesystem
  const blueprintsOnDisk = await loadAll();
  console.log(`Found ${blueprintsOnDisk.length} blueprints on disk.`);

  for (const bp of blueprintsOnDisk) {
    const blueprint = await prisma.blueprint.create({
      data: {
        slug: bp.slug,
        name: bp.name,
        description: bp.description,
        provider: bp.provider,
        category: bp.category,
        difficulty: bp.difficulty,
        tags: bp.tags.join(','),
        iconUrl: null,
        isActive: true,
      },
    });

    for (let i = 0; i < bp.versions.length; i++) {
      const ver = bp.versions[i];
      const isLatest = i === bp.versions.length - 1;

      await prisma.blueprintVersion.create({
        data: {
          blueprintId: blueprint.id,
          version: ver.version,
          changelog: ver.changelog ?? '',
          architectureSummary: bp.architectureSummary ?? '',
          securityNotes: bp.securityNotes ?? '',
          estimatedDeployTime: bp.estimatedDeployTime ?? '',
          sourceDir: ver.sourceDir,
          inputs: ver.inputs as Prisma.InputJsonValue,
          outputs: ver.outputs as Prisma.InputJsonValue,
          isLatest,
        },
      });
    }
  }

  // 3. Create mock workspace
  const workspace = await prisma.workspace.create({
    data: {
      id: 'mock-workspace-id',
      name: 'Default Workspace',
      slug: 'default-workspace',
      billingPlan: 'free',
      subscriptionStatus: 'active',
    },
  });

  // Create mock user
  const user = await prisma.user.create({
    data: {
      id: 'mock-user-id',
      name: 'Demo Architect',
      email: 'demo@stacksmith.local',
      image: 'https://avatars.githubusercontent.com/u/9919?v=4', // GitHub Octocat
    },
  });

  // Create workspace membership
  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      role: 'OWNER',
    },
  });

  // 4. Create mock connection with encrypted mock token
  const encryptedToken = encryptToken('mock-github-access-token');
  const connection = await prisma.gitHubConnection.create({
    data: {
      id: 'mock-connection-id',
      userId: user.id,
      workspaceId: workspace.id,
      githubUserId: 9919,
      githubUsername: 'mock-github-user',
      accessToken: encryptedToken!,
      scopes: 'repo,read:org',
    },
  });

  // 5. Create mock GitHub installation
  const installation = await prisma.gitHubInstallation.create({
    data: {
      id: 'mock-installation-id',
      connectionId: connection.id,
      installationId: 888888,
      targetType: 'User',
      targetLogin: 'mock-github-user',
      permissions: {
        metadata: 'read',
        contents: 'write',
        pull_requests: 'write',
      },
    },
  });

  // 6. Create mock repositories matching our github-mock.ts
  const repositories = [
    {
      githubRepoId: 1001,
      fullName: 'mock-org/demo-app',
      isPrivate: false,
      description: 'Demo application repository',
      language: 'TypeScript',
      htmlUrl: 'https://github.com/mock-org/demo-app',
    },
    {
      githubRepoId: 1002,
      fullName: 'mock-org/infrastructure',
      isPrivate: true,
      description: 'Infrastructure-as-code repository',
      language: 'HCL',
      htmlUrl: 'https://github.com/mock-org/infrastructure',
    },
    {
      githubRepoId: 1003,
      fullName: 'mock-org/platform-services',
      isPrivate: true,
      description: 'Platform services and shared tooling',
      language: 'Go',
      htmlUrl: 'https://github.com/mock-org/platform-services',
    },
  ];

  for (const repo of repositories) {
    await prisma.repository.create({
      data: {
        installationId: installation.id,
        githubRepoId: repo.githubRepoId,
        fullName: repo.fullName,
        isPrivate: repo.isPrivate,
        description: repo.description,
        language: repo.language,
        htmlUrl: repo.htmlUrl,
        defaultBranch: 'main',
        workspaceId: workspace.id,
      },
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
