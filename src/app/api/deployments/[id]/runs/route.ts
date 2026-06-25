import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { checkDeploymentPermission } from '@/lib/rbac';

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
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Forbidden' }, { status: 403 });
  }

  if (process.env.ENABLE_RUNNER_SIMULATOR !== 'true') {
    return NextResponse.json(
      { error: 'Hosted Terraform execution is disabled' },
      { status: 403 }
    );
  }


  // Set up Server-Sent Events headers
  const responseHeaders = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  };

  const isMockMode = process.env.ENABLE_RUNNER_SIMULATOR === 'true';

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
            sendEvent(`\x1b[32m[Command]\x1b[0m Simulate Apply`);
            await sleep(600);
            sendEvent(`aws_s3_bucket.example: Creating... (Simulation)`);
            await sleep(1000);
            sendEvent(`aws_s3_bucket.example: Still creating... (Simulation)`);
            await sleep(800);
            sendEvent(`aws_s3_bucket.example: Creation complete after 15s [id=${deployment.id}-bucket] (Simulation)`);
            sendEvent(``);
            sendEvent(`\x1b[32mApply simulation complete!\x1b[0m Resources: 1 added, 0 changed, 0 destroyed.`);
            
            // Save mock activity
            await prisma.activityEvent.create({
              data: {
                deploymentId: deployment.id,
                type: 'SANDBOX_APPLY_SIMULATED',
                title: 'Apply Simulated (Sandbox)',
                description: `Simulated application of Terraform changes for ${deployment.blueprint.slug}`,
              },
            });
          }

          sendEvent(`\x1b[36m[InfraPack Runner]\x1b[0m Execution finished successfully.`);
          sendEvent(`[FINISHED]`);
          controller.close();
        } else {
          sendEvent(`\x1b[31mError:\x1b[0m Hosted execution is disabled in production.`);
          sendEvent(`[FINISHED]`);
          controller.close();
        }
      } catch (err: unknown) {
        const errorVal = err as Error;
        sendEvent(`\x1b[31mError in SSE Stream:\x1b[0m ${errorVal.message}`);
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: responseHeaders });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
