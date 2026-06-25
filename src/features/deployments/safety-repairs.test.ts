import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  createDraft,
  generateDeployment,
  validateDeployment,
  createPullRequest,
  previewDeploymentFiles,
} from '@/features/deployments/deployment-service';
import { listBlueprints, getBlueprint, getBlueprintVersion } from '@/features/blueprints/blueprint-service';
import { generate } from '@/features/generator/generator-service';
import { TerraformValidator } from '@/features/validation/validator';
import { AppError, ValidationError, NotFoundError } from '@/lib/errors';

describe('Safety Repairs Tests', () => {
  let userId: string;
  let workspaceIdA: string;
  let workspaceIdB: string;
  let publicBlueprintId: string;
  let privateBlueprintAId: string;
  let customBlueprintId: string;
  let publicBlueprintVersionId: string;
  let privateBlueprintAVersionId: string;
  let customBlueprintVersionId: string;

  beforeAll(async () => {
    // 1. Create clean test user and workspaces
    userId = `test-user-${Date.now()}`;
    workspaceIdA = `ws-a-${Date.now()}`;
    workspaceIdB = `ws-b-${Date.now()}`;

    await prisma.user.create({
      data: { id: userId, email: `${userId}@example.com`, name: 'Test User' },
    });

    await prisma.workspace.createMany({
      data: [
        { id: workspaceIdA, name: 'Workspace A', slug: workspaceIdA, billingPlan: 'pro' },
        { id: workspaceIdB, name: 'Workspace B', slug: workspaceIdB, billingPlan: 'pro' },
      ],
    });

    await prisma.workspaceMember.createMany({
      data: [
        { id: `m-a-${Date.now()}`, userId, workspaceId: workspaceIdA, role: 'ADMIN' },
        { id: `m-b-${Date.now()}`, userId, workspaceId: workspaceIdB, role: 'ADMIN' },
      ],
    });

    // 2. Create blueprints
    // Public blueprint
    const publicBpSlug = `public-bp-${Date.now()}`;
    const publicBp = await prisma.blueprint.create({
      data: {
        slug: publicBpSlug,
        name: 'Public S3 Site',
        description: 'Test public blueprint',
        category: 'storage',
        tags: 'aws,s3',
        ownerId: null,
        workspaceId: null,
      },
    });
    publicBlueprintId = publicBp.id;

    const publicVersion = await prisma.blueprintVersion.create({
      data: {
        blueprintId: publicBlueprintId,
        version: '1.0.0',
        sourceDir: 'db',
        inputs: [
          { name: 'bucket_name', type: 'text', required: true, label: 'Bucket Name' },
          { name: 'api_token', type: 'sensitive', required: true, label: 'API Token' },
        ],
        outputs: [],
        files: {
          'main.tf': 'resource "aws_s3_bucket" "bucket" { bucket = var.bucket_name }',
        },
        isLatest: true,
      },
    });
    publicBlueprintVersionId = publicVersion.id;

    // Private blueprint in Workspace A
    const privateBpSlug = `private-bp-a-${Date.now()}`;
    const privateBp = await prisma.blueprint.create({
      data: {
        slug: privateBpSlug,
        name: 'Private Database',
        description: 'Test private blueprint',
        category: 'database',
        tags: 'db',
        ownerId: userId,
        workspaceId: workspaceIdA,
      },
    });
    privateBlueprintAId = privateBp.id;

    const privateVersion = await prisma.blueprintVersion.create({
      data: {
        blueprintId: privateBlueprintAId,
        version: '1.0.0',
        sourceDir: 'db',
        inputs: [
          { name: 'db_password', type: 'text', required: true, label: 'Password' },
        ],
        outputs: [],
        files: {
          'main.tf': 'resource "aws_db_instance" "db" { password = var.db_password }',
        },
        isLatest: true,
      },
    });
    privateBlueprintAVersionId = privateVersion.id;

    // Custom blueprint
    const customBpSlug = `custom-bp-${Date.now()}`;
    const customBp = await prisma.blueprint.create({
      data: {
        slug: customBpSlug,
        name: 'Custom Blueprint',
        description: 'User-created custom blueprint',
        category: 'compute',
        tags: 'custom',
        ownerId: userId,
        workspaceId: workspaceIdA,
      },
    });
    customBlueprintId = customBp.id;

    const customVersion = await prisma.blueprintVersion.create({
      data: {
        blueprintId: customBlueprintId,
        version: '1.0.0',
        sourceDir: 'db',
        inputs: [
          { name: 'app_secret', type: 'sensitive', required: true, label: 'App Secret' },
        ],
        outputs: [],
        files: {
          'main.tf': 'resource "random_password" "pass" { length = 16 }',
        },
        isLatest: true,
      },
    });
    customBlueprintVersionId = customVersion.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.deploymentInput.deleteMany({
      where: {
        deployment: {
          userId,
        },
      },
    });
    await prisma.validationRun.deleteMany({
      where: {
        deployment: {
          userId,
        },
      },
    });
    await prisma.deployment.deleteMany({ where: { userId } });

    const ids = [publicBlueprintId, privateBlueprintAId, customBlueprintId].filter(Boolean);
    if (ids.length > 0) {
      await prisma.blueprintVersion.deleteMany({
        where: {
          blueprintId: { in: ids },
        },
      });
      await prisma.blueprint.deleteMany({
        where: { id: { in: ids } },
      });
    }

    await prisma.workspaceMember.deleteMany({ where: { userId } });
    await prisma.workspace.deleteMany({ where: { id: { in: [workspaceIdA, workspaceIdB] } } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  describe('1. State Machine & Status Updates', () => {
    it('runs the standard workflow DRAFT -> GENERATED -> VALIDATED -> CREATING_PULL_REQUEST', async () => {
      // Create draft
      const publicBp = await prisma.blueprint.findUnique({ where: { id: publicBlueprintId } });
      const deploymentId = await createDraft(userId, {
        blueprintSlug: publicBp!.slug,
        blueprintVersion: '1.0.0',
        workspaceId: workspaceIdA,
        targetDir: 'infra',
        environmentName: 'dev',
        inputs: {
          bucket_name: 'test-bucket',
          api_token: 'super-secret-token',
        },
      });

      let dep = await prisma.deployment.findUnique({ where: { id: deploymentId } });
      expect(dep!.status).toBe('DRAFT');

      // Generate files -> status: GENERATED
      await generateDeployment(deploymentId);
      dep = await prisma.deployment.findUnique({ where: { id: deploymentId } });
      expect(dep!.status).toBe('GENERATED');

      // Assert that trying to create a PR from GENERATED throws an error (needs validation first!)
      await expect(createPullRequest(deploymentId)).rejects.toThrowError(
        /Deployment must be in VALIDATED state/
      );

      // Mock TerraformValidator to pass validation
      const validateSpy = vi
        .spyOn(TerraformValidator.prototype, 'validate')
        .mockResolvedValue({
          status: 'passed',
          commands: [],
          warnings: [],
          errors: [],
          securityFindings: [],
          durationMs: 120,
        });

      // Run validation -> status: VALIDATED
      await validateDeployment(deploymentId);
      dep = await prisma.deployment.findUnique({ where: { id: deploymentId } });
      expect(dep!.status).toBe('VALIDATED');
      validateSpy.mockRestore();

      // Assert that calling createPullRequest now proceeds past the status check
      // (It will throw due to no repository config, which proves it passed the state check)
      await expect(createPullRequest(deploymentId)).rejects.toThrowError(
        /No repository linked to this deployment/
      );
    });

    it('transitions to FAILED_VALIDATION if validation fails', async () => {
      const publicBp = await prisma.blueprint.findUnique({ where: { id: publicBlueprintId } });
      const deploymentId = await createDraft(userId, {
        blueprintSlug: publicBp!.slug,
        blueprintVersion: '1.0.0',
        workspaceId: workspaceIdA,
        targetDir: 'infra-fail',
        environmentName: 'dev',
        inputs: {
          bucket_name: 'fail-bucket',
          api_token: 'secret-val',
        },
      });

      await generateDeployment(deploymentId);

      // Mock validation to fail
      const validateSpy = vi
        .spyOn(TerraformValidator.prototype, 'validate')
        .mockResolvedValue({
          status: 'failed',
          commands: [],
          warnings: [],
          errors: ['Syntax error'],
          securityFindings: [],
          durationMs: 50,
        });

      await validateDeployment(deploymentId);
      const dep = await prisma.deployment.findUnique({ where: { id: deploymentId } });
      expect(dep!.status).toBe('FAILED_VALIDATION');
      validateSpy.mockRestore();
    });

    it('transitions to FAILED_VALIDATION if validation is skipped (skipped validation is not passed)', async () => {
      const publicBp = await prisma.blueprint.findUnique({ where: { id: publicBlueprintId } });
      const deploymentId = await createDraft(userId, {
        blueprintSlug: publicBp!.slug,
        blueprintVersion: '1.0.0',
        workspaceId: workspaceIdA,
        targetDir: 'infra-skip',
        environmentName: 'dev',
        inputs: {
          bucket_name: 'skip-bucket',
          api_token: 'secret-val',
        },
      });

      await generateDeployment(deploymentId);

      // Mock validation to skip
      const validateSpy = vi
        .spyOn(TerraformValidator.prototype, 'validate')
        .mockResolvedValue({
          status: 'skipped',
          commands: [],
          warnings: ['No terraform tool installed'],
          errors: [],
          securityFindings: [],
          durationMs: 10,
        });

      await validateDeployment(deploymentId);
      const dep = await prisma.deployment.findUnique({ where: { id: deploymentId } });
      expect(dep!.status).toBe('FAILED_VALIDATION');
      validateSpy.mockRestore();
    });
  });

  describe('2. Custom Blueprint Validation Restriction', () => {
    it('throws CUSTOM_VALIDATION_DISABLED 503 error for deployments using custom blueprints', async () => {
      const customBp = await prisma.blueprint.findUnique({ where: { id: customBlueprintId } });
      const deploymentId = await createDraft(userId, {
        blueprintSlug: customBp!.slug,
        blueprintVersion: '1.0.0',
        workspaceId: workspaceIdA,
        targetDir: 'infra-custom',
        environmentName: 'dev',
        inputs: {
          app_secret: 'user-secret-value',
        },
      });

      // Generation should succeed
      await generateDeployment(deploymentId);

      // Validation should fail with 503 CUSTOM_VALIDATION_DISABLED
      await expect(validateDeployment(deploymentId)).rejects.toThrowError(
        /Custom blueprint validation is temporarily unavailable/
      );
    });
  });

  describe('3. Secret Handling', () => {
    it('excludes sensitive variables from tfvars, redacts in readme, rejects in templates, and redacts in previews', async () => {
      const publicBp = await prisma.blueprint.findUnique({ where: { id: publicBlueprintId } });

      // Test general generation: sensitive inputs excluded from tfvars
      const genResult = await generate({
        blueprintSlug: publicBp!.slug,
        blueprintVersion: '1.0.0',
        deploymentId: 'test-dep-secrets',
        targetDir: 'infra',
        environmentName: 'prod',
        inputs: {
          bucket_name: { value: 'my-production-bucket', sensitive: false },
          api_token: { value: 'real-api-key-12345', sensitive: true },
        },
        workspaceId: workspaceIdA,
      });

      const tfvars = genResult.files.find((f) => f.path === 'infra/terraform.tfvars');
      expect(tfvars).toBeDefined();
      expect(tfvars!.content).toContain('bucket_name = "my-production-bucket"');
      expect(tfvars!.content).not.toContain('api_token');
      expect(tfvars!.content).not.toContain('real-api-key-12345');

      const readme = genResult.files.find((f) => f.path === 'infra/README.md');
      expect(readme).toBeDefined();
      expect(readme!.content).toContain('my-production-bucket');
      expect(readme!.content).toContain('********');
      expect(readme!.content).not.toContain('real-api-key-12345');

      // Test reject sensitive placeholders in templates
      // Mock a version with a template placeholder for the sensitive field
      const badVersion = {
        blueprintId: publicBlueprintId,
        version: '1.1.0',
        sourceDir: 'custom',
        inputs: JSON.stringify([
          { name: 'bucket_name', type: 'text', required: true, label: 'Bucket Name' },
          { name: 'api_token', type: 'sensitive', required: true, label: 'API Token' },
        ]),
        outputs: JSON.stringify([]),
        files: JSON.stringify({
          'main.tf': 'provider "aws" { token = "{{api_token}}" }', // bad template!
        }),
      };
      await prisma.blueprintVersion.create({ data: badVersion });

      await expect(
        generate({
          blueprintSlug: publicBp!.slug,
          blueprintVersion: '1.1.0',
          deploymentId: 'test-dep-bad-template',
          targetDir: 'infra',
          environmentName: 'prod',
          inputs: {
            bucket_name: { value: 'my-bucket', sensitive: false },
            api_token: { value: 'real-api-key-12345', sensitive: true },
          },
          workspaceId: workspaceIdA,
        })
      ).rejects.toThrowError(ValidationError);

      // Test file previews redact sensitive fields completely
      const previewDeploymentId = await createDraft(userId, {
        blueprintSlug: publicBp!.slug,
        blueprintVersion: '1.0.0',
        workspaceId: workspaceIdA,
        targetDir: 'infra-preview',
        environmentName: 'dev',
        inputs: {
          bucket_name: 'preview-bucket',
          api_token: 'secret-api-preview-key',
        },
      });

      const previewFiles = await previewDeploymentFiles(previewDeploymentId);
      const previewReadme = previewFiles.find((f) => f.path === 'infra-preview/README.md');
      expect(previewReadme!.content).toContain('********');
      expect(previewReadme!.content).not.toContain('secret-api-preview-key');
    });
  });

  describe('4. Private Blueprint Workspace Scoping', () => {
    it('scopes private blueprints to the active workspace', async () => {
      const privateBp = await prisma.blueprint.findUnique({ where: { id: privateBlueprintAId } });

      // Listing from workspace A should return it
      const listA = await listBlueprints({ workspaceId: workspaceIdA });
      expect(listA.map((bp) => bp.slug)).toContain(privateBp!.slug);

      // Listing from workspace B should NOT return it
      const listB = await listBlueprints({ workspaceId: workspaceIdB });
      expect(listB.map((bp) => bp.slug)).not.toContain(privateBp!.slug);

      // getBlueprint & getBlueprintVersion from workspace A should succeed
      const bpDetails = await getBlueprint(privateBp!.slug, workspaceIdA);
      expect(bpDetails.slug).toBe(privateBp!.slug);
      const bpVersion = await getBlueprintVersion(privateBp!.slug, '1.0.0', workspaceIdA);
      expect(bpVersion.version).toBe('1.0.0');

      // getBlueprint & getBlueprintVersion from workspace B should throw NotFoundError
      await expect(getBlueprint(privateBp!.slug, workspaceIdB)).rejects.toThrowError(NotFoundError);
      await expect(getBlueprintVersion(privateBp!.slug, '1.0.0', workspaceIdB)).rejects.toThrowError(NotFoundError);

      // createDraft in workspace B using workspace A's private blueprint slug should fail with NotFoundError
      await expect(
        createDraft(userId, {
          blueprintSlug: privateBp!.slug,
          blueprintVersion: '1.0.0',
          workspaceId: workspaceIdB,
          targetDir: 'infra',
          environmentName: 'dev',
          inputs: {
            db_password: 'pass',
          },
        })
      ).rejects.toThrowError(NotFoundError);
    });
  });
});
