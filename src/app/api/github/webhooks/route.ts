import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

interface GitHubPullRequestWebhook {
  action?: string;
  number?: number;
  pull_request?: {
    merged?: boolean;
  };
  repository?: {
    id?: number;
  };
}

// Verify signature if webhook secret is configured
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  if (digest.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function POST(request: Request) {
  const payloadText = await request.text();
  const signature = request.headers.get('x-hub-signature-256') || '';
  const event = request.headers.get('x-github-event') || '';

  // Verify signature if GITHUB_WEBHOOK_SECRET is set
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (secret) {
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }
    if (!verifySignature(payloadText, signature, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let body: GitHubPullRequestWebhook;
  try {
    body = JSON.parse(payloadText);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Handle pull_request event
  if (event === 'pull_request') {
    const action = body.action;
    const prNumber = body.number;
    const isMerged = body.pull_request?.merged || false;
    const repoId = body.repository?.id;

    if (!prNumber || !repoId) {
      return NextResponse.json({ error: 'Missing pull request parameters' }, { status: 400 });
    }

    // Find the corresponding pull request in our DB
    const dbPr = await prisma.pullRequest.findFirst({
      where: {
        prNumber: prNumber,
        deployment: {
          repository: {
            githubRepoId: Number(repoId)
          }
        }
      },
      include: {
        deployment: true
      }
    });

    if (!dbPr) {
      return NextResponse.json({ message: 'Pull request not tracked by this application' }, { status: 200 });
    }

    const deployment = dbPr.deployment;

    if (action === 'closed') {
      if (isMerged) {
        // Update Pull Request and Deployment
        await prisma.$transaction([
          prisma.pullRequest.update({
            where: { id: dbPr.id },
            data: { status: 'merged' }
          }),
          prisma.deployment.update({
            where: { id: deployment.id },
            data: { status: 'MERGED' }
          }),
          prisma.activityEvent.create({
            data: {
              deploymentId: deployment.id,
              userId: deployment.userId,
              type: 'PR_MERGED',
              title: 'Pull request merged',
              description: `PR #${prNumber} was successfully merged on GitHub.`,
              metadata: { prNumber, prUrl: dbPr.prUrl }
            }
          })
        ]);
        console.log(`[Webhook] Marked deployment ${deployment.id} as MERGED`);
      } else {
        await prisma.$transaction([
          prisma.pullRequest.update({
            where: { id: dbPr.id },
            data: { status: 'closed' }
          }),
          prisma.deployment.update({
            where: { id: deployment.id },
            data: { status: 'CLOSED' }
          }),
          prisma.activityEvent.create({
            data: {
              deploymentId: deployment.id,
              userId: deployment.userId,
              type: 'PR_CLOSED',
              title: 'Pull request closed',
              description: `PR #${prNumber} was closed without merging.`,
              metadata: { prNumber, prUrl: dbPr.prUrl }
            }
          })
        ]);
        console.log(`[Webhook] Marked deployment ${deployment.id} as CLOSED`);
      }
    }
  }

  return NextResponse.json({ success: true });
}
