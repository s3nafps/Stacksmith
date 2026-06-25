import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generate } from '@/features/generator/generator-service';
import { decrypt } from '@/lib/vault';
import { exec } from 'child_process';
import { checkDeploymentPermission } from '@/lib/rbac';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'plan'; // 'plan' or 'apply' or 'validate'

  // Fetch deployment and decrypt inputs
  const deployment = await prisma.deployment.findUnique({
    where: { id },
    include: { blueprint: true, blueprintVersion: true, inputs: true },
  });

  if (!deployment) {
    return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
  }

  try {
    await checkDeploymentPermission(session.user.id, id, 'OPERATOR');
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Forbidden' }, { status: 403 });
  }


  // Set up Server-Sent Events headers
  const responseHeaders = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  };

  const isMockMode = process.env.MOCK_GITHUB === 'true';

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: string) => {
        controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
      };

      try {
        if (isMockMode) {
          // --- MOCK SIMULATOR RUNS ---
          sendEvent(`\x1b[36m[InfraPack Runner - Sandbox Mode]\x1b[0m Starting ${action} for deployment: ${id}`);
          await sleep(500);

          sendEvent(`\x1b[32m[Command]\x1b[0m terraform init -no-color`);
          await sleep(500);
          sendEvent(`Initializing the backend...`);
          sendEvent(`Initializing provider plugins...`);
          sendEvent(`- Finding hashicorp/aws versions matching ">= 5.0"...`);
          sendEvent(`- Installing hashicorp/aws v5.24.0...`);
          sendEvent(`- Installed hashicorp/aws v5.24.0 (signed by HashiCorp)`);
          await sleep(800);
          sendEvent(`\x1b[32mTerraform has been successfully initialized!\x1b[0m`);
          sendEvent(``);
          await sleep(600);

          if (action === 'validate') {
            sendEvent(`\x1b[32m[Command]\x1b[0m terraform validate -no-color`);
            await sleep(400);
            sendEvent(`\x1b[32mSuccess!\x1b[0m The configuration is valid.`);
          } else if (action === 'plan') {
            sendEvent(`\x1b[32m[Command]\x1b[0m terraform plan -no-color`);
            await sleep(600);
            sendEvent(`Terraform used the selected providers to generate the following execution plan:`);
            sendEvent(`Resource actions are indicated with the following symbols:`);
            sendEvent(`  \x1b[32m+\x1b[0m create`);
            sendEvent(``);
            sendEvent(`Terraform will perform the following actions:`);
            sendEvent(``);
            sendEvent(`  \x1b[32m+ aws_s3_bucket.example\x1b[0m`);
            sendEvent(`      id:                         (known after apply)`);
            sendEvent(`      bucket:                     "${deployment.id}-bucket"`);
            sendEvent(`      force_destroy:              false`);
            sendEvent(``);
            sendEvent(`\x1b[32mPlan:\x1b[0m 1 to add, 0 to change, 0 to destroy.`);
          } else if (action === 'apply') {
            sendEvent(`\x1b[32m[Command]\x1b[0m terraform apply -auto-approve -no-color`);
            await sleep(600);
            sendEvent(`aws_s3_bucket.example: Creating...`);
            await sleep(1000);
            sendEvent(`aws_s3_bucket.example: Still creating... (10s elapsed)`);
            await sleep(800);
            sendEvent(`aws_s3_bucket.example: Creation complete after 15s [id=${deployment.id}-bucket]`);
            sendEvent(``);
            sendEvent(`\x1b[32mApply complete!\x1b[0m Resources: 1 added, 0 changed, 0 destroyed.`);
            
            // Save mock activity
            await prisma.activityEvent.create({
              data: {
                deploymentId: deployment.id,
                type: 'PR_MERGED',
                title: 'Infrastructure applied (Sandbox)',
                description: `Successfully applied Terraform plan for ${deployment.blueprint.slug}`,
              },
            });
          }

          sendEvent(`\x1b[36m[InfraPack Runner]\x1b[0m Execution finished successfully.`);
          sendEvent(`[FINISHED]`);
          controller.close();
        } else {
          // --- REAL execution ---
          sendEvent(`\x1b[36m[InfraPack Runner]\x1b[0m Generating Terraform workspace...`);
          
          // Generate actual files in a temp folder
          const tmpDir = await fs.mkdtemp(
            path.join(os.tmpdir(), `infrapack-run-${id}-`)
          );

          try {
            const inputsMap: Record<string, { value: string | number | boolean; sensitive: boolean }> = {};
            for (const inp of deployment.inputs) {
              inputsMap[inp.key] = {
                value: inp.isSensitive ? decrypt(inp.value) : inp.value,
                sensitive: inp.isSensitive,
              };
            }

            const genResult = await generate({
              blueprintSlug: deployment.blueprint.slug,
              blueprintVersion: deployment.blueprintVersion.version,
              deploymentId: id,
              targetDir: deployment.targetDir,
              environmentName: deployment.environmentName,
              inputs: inputsMap,
              workspaceId: deployment.workspaceId,
            });

            // Write files to temp path
            for (const file of genResult.files) {
              const filePath = path.join(tmpDir, file.path);
              await fs.mkdir(path.dirname(filePath), { recursive: true });
              await fs.writeFile(filePath, file.content, 'utf-8');
            }

            // Locate tf files
            const hasTfFiles = genResult.files.some((f) => f.path.endsWith('.tf'));
            if (!hasTfFiles) {
              sendEvent(`\x1b[31mError:\x1b[0m No .tf files found in output manifest.`);
              controller.close();
              return;
            }

            // Command configuration
            let command = '';
            if (action === 'validate') {
              command = 'terraform init -backend=false -no-color && terraform validate -no-color';
            } else if (action === 'plan') {
              command = 'terraform init -backend=false -no-color && terraform plan -no-color';
            } else if (action === 'apply') {
              command = 'terraform init -backend=false -no-color && terraform apply -auto-approve -no-color';
            }

            sendEvent(`\x1b[32m[Command]\x1b[0m ${command}`);

            const child = exec(command, { cwd: tmpDir });
            
            child.stdout?.on('data', (data) => {
              const lines = String(data).split('\n');
              for (const line of lines) {
                if (line.trim()) sendEvent(line);
              }
            });

            child.stderr?.on('data', (data) => {
              const lines = String(data).split('\n');
              for (const line of lines) {
                if (line.trim()) sendEvent(`\x1b[31m${line}\x1b[0m`);
              }
            });

            child.on('close', (code) => {
              if (code === 0) {
                sendEvent(`\x1b[32m[Success]\x1b[0m Run command completed with exit code 0.`);
              } else {
                sendEvent(`\x1b[31m[Failure]\x1b[0m Run command failed with exit code ${code}.`);
              }
              sendEvent(`[FINISHED]`);
              controller.close();
            });

          } catch (err: any) {
            sendEvent(`\x1b[31mError:\x1b[0m ${err.message || 'Execution error'}`);
            controller.close();
          } finally {
            // Cleanup in background
            setTimeout(async () => {
              await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
            }, 5000);
          }
        }
      } catch (err: any) {
        sendEvent(`\x1b[31mError in SSE Stream:\x1b[0m ${err.message}`);
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: responseHeaders });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
