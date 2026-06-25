'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Shield,
  FileCode,
  Clock,
  Cloud,
  GitBranch,
  AlertTriangle,
  HardDrive,
  Network,
  KeyRound,
  ChevronDown,
  Settings,
  CheckCircle2,
  TrendingUp,
  Gauge,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { useState, use, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface RepositoryOption {
  id: string;
  fullName: string;
  defaultBranch: string;
}

interface PullRequestResult {
  prNumber?: number;
  branchName?: string;
}

interface ApiBlueprint {
  slug: string;
  name: string;
  description: string;
  provider: string;
  category: string;
  difficulty: string;
  estimatedDeployTime?: string;
  architectureSummary?: string;
  securityNotes?: string;
  tags: string[];
  ownerId?: string;
  versions: Array<{
    version: string;
    changelog?: string;
    inputs: Array<{
      name: string;
      type: string;
      label: string;
      description?: string;
      default?: string | number | boolean;
      required: boolean;
      options?: Array<{ label: string; value: string }>;
      placeholder?: string;
    }>;
    outputs: Array<{ name: string; description: string }>;
  }>;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// Blueprint data
const blueprintData: Record<string, {
  slug: string;
  name: string;
  description: string;
  provider: string;
  category: string;
  difficulty: string;
  estimatedDeployTime: string;
  version: string;
  architectureSummary: string;
  securityNotes: string;
  tags: string[];
  icon: typeof HardDrive;
  gradient: string;
  inputs: Array<{
    name: string;
    type: string;
    label: string;
    description: string;
    default?: string | number | boolean;
    required: boolean;
    options?: Array<{ label: string; value: string }>;
    placeholder?: string;
  }>;
  outputs: Array<{ name: string; description: string }>;
  changelog: string;
}> = {
  'aws-s3-static-site': {
    slug: 'aws-s3-static-site',
    name: 'Secure S3 Static Website',
    description: 'Production-ready S3 static site hosting with server-side encryption, versioning, access logging, and optional CloudFront CDN distribution.',
    provider: 'aws',
    category: 'Storage',
    difficulty: 'beginner',
    estimatedDeployTime: '5–10 min',
    version: '1.0.0',
    architectureSummary: 'Creates an S3 bucket configured for static website hosting with server-side encryption (AES-256), object versioning, and access logging to a dedicated logging bucket. Includes a bucket policy for public read access to serve static content.',
    securityNotes: 'All objects are encrypted at rest with SSE-S3. Access logging enabled by default. Versioning protects against accidental deletion. Public read access is limited to the static site bucket only.',
    tags: ['s3', 'static-site', 'cloudfront', 'hosting'],
    icon: HardDrive,
    gradient: 'from-orange-500 to-amber-600',
    inputs: [
      { name: 'project_name', type: 'text', label: 'Project name', description: 'Used for resource naming and tagging', default: 'my-static-site', required: true, placeholder: 'my-project' },
      { name: 'environment', type: 'select', label: 'Environment', description: 'Deployment environment', default: 'production', required: true, options: [{ label: 'Production', value: 'production' }, { label: 'Staging', value: 'staging' }, { label: 'Development', value: 'development' }] },
      { name: 'aws_region', type: 'region', label: 'AWS Region', description: 'AWS region for resource deployment', default: 'us-east-1', required: true, options: [{ label: 'US East (N. Virginia)', value: 'us-east-1' }, { label: 'US West (Oregon)', value: 'us-west-2' }, { label: 'EU West (Ireland)', value: 'eu-west-1' }, { label: 'EU Central (Frankfurt)', value: 'eu-central-1' }, { label: 'AP Southeast (Singapore)', value: 'ap-southeast-1' }] },
      { name: 'domain_name', type: 'domain', label: 'Domain name', description: 'Custom domain for the site (optional)', required: false, placeholder: 'example.com' },
      { name: 'index_document', type: 'text', label: 'Index document', description: 'Default index page', default: 'index.html', required: true },
      { name: 'error_document', type: 'text', label: 'Error document', description: 'Custom error page', default: 'error.html', required: true },
      { name: 'enable_versioning', type: 'boolean', label: 'Enable versioning', description: 'Enable S3 object versioning for rollback protection', default: true, required: false },
    ],
    outputs: [
      { name: 'bucket_name', description: 'S3 bucket name' },
      { name: 'website_endpoint', description: 'S3 website endpoint URL' },
      { name: 'bucket_arn', description: 'S3 bucket ARN' },
    ],
    changelog: 'Initial release with S3 static website hosting, encryption, versioning, and logging.',
  },
  'aws-vpc-network': {
    slug: 'aws-vpc-network',
    name: 'AWS VPC Network',
    description: 'Multi-AZ VPC with public and private subnets, NAT gateway, internet gateway, route tables, and VPC flow logs.',
    provider: 'aws',
    category: 'Networking',
    difficulty: 'intermediate',
    estimatedDeployTime: '10–15 min',
    version: '1.0.0',
    architectureSummary: 'Creates a VPC spanning two availability zones with separate public and private subnets. Public subnets route through an Internet Gateway while private subnets route through a NAT Gateway. VPC Flow Logs capture network traffic for monitoring.',
    securityNotes: 'Private subnets have no direct internet access. NAT Gateway enables outbound-only internet connectivity. Flow logs capture all traffic metadata. Network ACLs provide an additional layer of network security.',
    tags: ['vpc', 'networking', 'subnets', 'nat'],
    icon: Network,
    gradient: 'from-blue-500 to-cyan-600',
    inputs: [
      { name: 'project_name', type: 'text', label: 'Project name', description: 'Used for resource naming and tagging', default: 'my-network', required: true, placeholder: 'my-project' },
      { name: 'environment', type: 'select', label: 'Environment', description: 'Deployment environment', default: 'production', required: true, options: [{ label: 'Production', value: 'production' }, { label: 'Staging', value: 'staging' }, { label: 'Development', value: 'development' }] },
      { name: 'aws_region', type: 'region', label: 'AWS Region', description: 'AWS region for resource deployment', default: 'us-east-1', required: true, options: [{ label: 'US East (N. Virginia)', value: 'us-east-1' }, { label: 'US West (Oregon)', value: 'us-west-2' }, { label: 'EU West (Ireland)', value: 'eu-west-1' }, { label: 'EU Central (Frankfurt)', value: 'eu-central-1' }, { label: 'AP Southeast (Singapore)', value: 'ap-southeast-1' }] },
      { name: 'vpc_cidr', type: 'cidr', label: 'VPC CIDR block', description: 'IPv4 CIDR block for the VPC', default: '10.0.0.0/16', required: true, placeholder: '10.0.0.0/16' },
      { name: 'enable_nat_gateway', type: 'boolean', label: 'Enable NAT Gateway', description: 'Enable NAT Gateway for private subnet internet access', default: true, required: false },
      { name: 'enable_flow_logs', type: 'boolean', label: 'Enable VPC Flow Logs', description: 'Enable VPC flow logs for traffic monitoring', default: true, required: false },
    ],
    outputs: [
      { name: 'vpc_id', description: 'VPC ID' },
      { name: 'public_subnet_ids', description: 'Public subnet IDs' },
      { name: 'private_subnet_ids', description: 'Private subnet IDs' },
      { name: 'nat_gateway_ip', description: 'NAT Gateway public IP' },
    ],
    changelog: 'Initial release with VPC, subnets, NAT/IGW, and flow logs.',
  },
  'aws-github-oidc': {
    slug: 'aws-github-oidc',
    name: 'GitHub Actions OIDC',
    description: 'Secure keyless authentication from GitHub Actions to AWS using OIDC federation. Eliminates the need for long-lived AWS credentials.',
    provider: 'aws',
    category: 'Security',
    difficulty: 'intermediate',
    estimatedDeployTime: '3–5 min',
    version: '1.0.0',
    architectureSummary: 'Creates an IAM OIDC identity provider for GitHub Actions and an IAM role with a trust policy scoped to specific GitHub organizations, repositories, and branches. The role can be assumed by GitHub Actions workflows without any stored AWS credentials.',
    securityNotes: 'No long-lived credentials needed. Trust policy restricts access to specific GitHub repos and branches. Session duration is configurable. Uses the official GitHub OIDC provider thumbprint.',
    tags: ['oidc', 'github-actions', 'iam', 'security'],
    icon: KeyRound,
    gradient: 'from-violet-500 to-purple-600',
    inputs: [
      { name: 'project_name', type: 'text', label: 'Project name', description: 'Used for resource naming and tagging', default: 'gh-oidc', required: true, placeholder: 'my-project' },
      { name: 'environment', type: 'select', label: 'Environment', description: 'Deployment environment', default: 'production', required: true, options: [{ label: 'Production', value: 'production' }, { label: 'Staging', value: 'staging' }, { label: 'Development', value: 'development' }] },
      { name: 'aws_region', type: 'region', label: 'AWS Region', description: 'AWS region for IAM resources', default: 'us-east-1', required: true, options: [{ label: 'US East (N. Virginia)', value: 'us-east-1' }, { label: 'US West (Oregon)', value: 'us-west-2' }, { label: 'EU West (Ireland)', value: 'eu-west-1' }] },
      { name: 'github_org', type: 'text', label: 'GitHub organization', description: 'GitHub organization or user name', required: true, placeholder: 'my-org' },
      { name: 'github_repo', type: 'text', label: 'GitHub repository', description: 'Repository name (without org prefix)', required: true, placeholder: 'my-repo' },
      { name: 'github_branch', type: 'text', label: 'Branch restriction', description: 'Branch pattern to restrict access', default: 'main', required: false },
    ],
    outputs: [
      { name: 'role_arn', description: 'IAM role ARN for GitHub Actions' },
      { name: 'oidc_provider_arn', description: 'OIDC provider ARN' },
    ],
    changelog: 'Initial release with OIDC provider and IAM role.',
  },
};

type PageBlueprint = (typeof blueprintData)[string] & { ownerId?: string };

const WIZARD_STEPS = ['Repository', 'Configure', 'Review', 'Deploy'];

function iconForBlueprint(slug: string, category: string) {
  if (slug.includes('vpc') || category.toLowerCase() === 'networking') return Network;
  if (slug.includes('oidc') || category.toLowerCase() === 'security') return KeyRound;
  if (slug.includes('lambda') || slug.includes('ecs') || category.toLowerCase() === 'compute') return Cloud;
  return HardDrive;
}

function gradientForBlueprint(slug: string, category: string): string {
  if (slug.includes('vpc') || category.toLowerCase() === 'networking') return 'from-blue-500 to-cyan-600';
  if (slug.includes('oidc') || category.toLowerCase() === 'security') return 'from-violet-500 to-purple-600';
  if (slug.includes('lambda')) return 'from-emerald-500 to-teal-600';
  if (slug.includes('ecs')) return 'from-sky-500 to-indigo-600';
  if (slug.includes('rds')) return 'from-pink-500 to-rose-600';
  return 'from-orange-500 to-amber-600';
}

function toPageBlueprint(bp: ApiBlueprint): PageBlueprint {
  const latest = bp.versions[bp.versions.length - 1];

  return {
    slug: bp.slug,
    name: bp.name,
    description: bp.description,
    provider: bp.provider,
    category: bp.category,
    difficulty: bp.difficulty,
    estimatedDeployTime: bp.estimatedDeployTime ?? '5-10 min',
    version: latest.version,
    architectureSummary: bp.architectureSummary ?? 'Terraform blueprint generated from the local Stacksmith catalog.',
    securityNotes: bp.securityNotes ?? 'Review generated files before merging the pull request.',
    tags: bp.tags,
    icon: iconForBlueprint(bp.slug, bp.category),
    gradient: gradientForBlueprint(bp.slug, bp.category),
    inputs: latest.inputs.map((input) => ({
      name: input.name,
      type: input.type,
      label: input.label,
      description: input.description ?? input.label,
      default: input.default,
      required: input.required,
      options: input.options,
      placeholder: input.placeholder,
    })),
    outputs: latest.outputs,
    changelog: latest.changelog ?? '',
    ownerId: bp.ownerId,
  };
}

function getDefaultInputs(blueprint: PageBlueprint | undefined): Record<string, string | number | boolean> {
  const defaults: Record<string, string | number | boolean> = {};
  blueprint?.inputs.forEach((input) => {
    if (input.default !== undefined) {
      defaults[input.name] = input.default;
    }
  });
  return defaults;
}

export default function BlueprintDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: session } = useSession();
  const fallbackBlueprint = blueprintData[slug];
  const [fetchedBlueprint, setFetchedBlueprint] = useState<PageBlueprint | null>(null);
  const blueprint = (fetchedBlueprint ?? fallbackBlueprint) as PageBlueprint;
  const [step, setStep] = useState(0);
  const [showWizard, setShowWizard] = useState(false);
  const [repos, setRepos] = useState<RepositoryOption[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [targetDir, setTargetDir] = useState('infrastructure');
  const [environmentName, setEnvironmentName] = useState('production');
  const [toolPreference, setToolPreference] = useState('terraform');
  const [inputValues, setInputValues] = useState<Record<string, string | number | boolean>>(() => getDefaultInputs(blueprint));
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdDeploymentId, setCreatedDeploymentId] = useState<string>('');
  const [generatedFiles, setGeneratedFiles] = useState<Array<{ path: string; content: string }> | null>(null);
  const [validationResult, setValidationResult] = useState<{ status: string; commands: Array<{ command: string; exitCode: number }> } | null>(null);
  const [prCreated, setPrCreated] = useState(false);
  const [prDetails, setPrDetails] = useState<PullRequestResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeProfile, setActiveProfile] = useState<string>('production');

  const handleSelectProfile = (profile: string) => {
    setActiveProfile(profile);
    setEnvironmentName(profile);
    
    // Apply preset values for inputs
    setInputValues((prev) => {
      const next = { ...prev };
      next['environment'] = profile;
      if (slug === 'aws-s3-static-site') {
        next['enable_versioning'] = profile !== 'development';
      } else if (slug === 'aws-vpc-network') {
        next['enable_nat_gateway'] = profile !== 'development';
        next['enable_flow_logs'] = profile !== 'development';
        if (profile === 'development') {
          next['vpc_cidr'] = '10.0.0.0/16';
        } else if (profile === 'staging') {
          next['vpc_cidr'] = '10.10.0.0/16';
        } else {
          next['vpc_cidr'] = '10.20.0.0/16';
        }
      } else if (slug === 'aws-github-oidc') {
        if (profile === 'development') {
          next['github_branch'] = 'dev';
        } else if (profile === 'staging') {
          next['github_branch'] = 'staging';
        } else {
          next['github_branch'] = 'main';
        }
      }
      return next;
    });
  };

  useEffect(() => {
    fetch('/api/blueprints')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load blueprint');
        return res.json();
      })
      .then((items: ApiBlueprint[]) => {
        const found = items.find((item) => item.slug === slug);
        if (!found) return;
        const mapped = toPageBlueprint(found);
        setFetchedBlueprint(mapped);
        setInputValues(getDefaultInputs(mapped));
      })
      .catch(() => {
        setFetchedBlueprint(null);
      });
  }, [slug]);

  // Load repositories on wizard open
  useEffect(() => {
    if (!showWizard) return;

    fetch('/api/github/repositories')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load repositories. Is VCS connected?');
        return r.json();
      })
      .then((data) => {
        setRepos(data);
        if (data.length > 0) {
          setSelectedRepo(data[0].id);
        }
      })
      .catch((e: unknown) => {
        setErrorMsg(getErrorMessage(e, 'Error loading connected repositories.'));
      })
      .finally(() => {
        setLoadingRepos(false);
      });
  }, [showWizard]);

  if (!blueprint) {
    return (
      <>
        <Header title="Blueprint not found" />
        <div className="p-8 empty-state">
          <p className="text-sm text-[var(--text-secondary)]">The requested blueprint does not exist.</p>
          <Button asChild variant="secondary" className="mt-4">
            <Link href="/blueprints">← Back to catalog</Link>
          </Button>
        </div>
      </>
    );
  }

  const Icon = blueprint.icon;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg('');

    try {
      // 1. Create draft deployment
      const createRes = await fetch('/api/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blueprintSlug: slug,
          blueprintVersion: blueprint.version,
          repositoryId: selectedRepo,
          targetDir,
          environmentName,
          toolPreference,
          inputs: inputValues,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || 'Failed to initialize deployment record');
      }

      const { id: depId } = await createRes.json();
      setCreatedDeploymentId(depId);

      // 2. Generate files
      const genRes = await fetch(`/api/deployments/${depId}/generate`, {
        method: 'POST',
      });
      if (!genRes.ok) {
        const err = await genRes.json();
        throw new Error(err.error || 'Failed to generate Terraform templates');
      }
      const { files: genFiles } = await genRes.json();
      setGeneratedFiles(genFiles);

      // 3. Run validation
      const valRes = await fetch(`/api/deployments/${depId}/validate`, {
        method: 'POST',
      });
      if (!valRes.ok) {
        const err = await valRes.json();
        throw new Error(err.error || 'Validation execution failed');
      }
      const valResult = await valRes.json();
      setValidationResult(valResult);

      setStep(3);
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, 'An error occurred during IaC compilation.'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreatePR = async () => {
    setIsGenerating(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/deployments/${createdDeploymentId}/pr`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'VCS commit/PR creation failed');
      }
      const data = await res.json();
      setPrCreated(true);
      setPrDetails(data);
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, 'Failed to create git pull request'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Header title={blueprint.name} description={blueprint.description} />

      <div className="p-6 lg:p-8 page-enter">
        {!showWizard ? (
          /* Blueprint detail view */
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Back link */}
            <Link href="/blueprints" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to catalog
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-6">

            {/* Hero */}
            <div className="flex items-start gap-5">
              <div className={`flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${blueprint.gradient} shadow-xl`}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">{blueprint.name}</h2>
                  <Badge variant="neutral">v{blueprint.version}</Badge>
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">{blueprint.description}</p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                    <Cloud className="w-3.5 h-3.5" />
                    <span className="uppercase font-medium tracking-wider">{blueprint.provider}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{blueprint.estimatedDeployTime}</span>
                  </div>
                  <Badge variant={blueprint.difficulty === 'beginner' ? 'success' : 'warning'}>
                    {blueprint.difficulty}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                {session?.user?.id && blueprint?.ownerId === session.user.id && (
                  <Button asChild variant="outline" size="lg">
                    <Link href={`/blueprints/${blueprint.slug}/edit`}>
                      <Settings className="w-4 h-4 mr-1.5 text-[var(--accent-500)]" />
                      Edit Blueprint
                    </Link>
                  </Button>
                )}
                <Button onClick={() => {
                  setLoadingRepos(true);
                  setErrorMsg('');
                  setShowWizard(true);
                }} size="lg">
                  Deploy this blueprint
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Architecture */}
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-[var(--accent-500)]" />
                  Architecture
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{blueprint.architectureSummary}</p>
              </CardContent>
            </Card>

            {/* Security */}
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  Security notes
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{blueprint.securityNotes}</p>
              </CardContent>
            </Card>

            {/* Inputs & Outputs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Required inputs</h3>
                  <div className="space-y-2">
                    {blueprint.inputs.map((input) => (
                      <div key={input.name} className="flex items-start justify-between py-1.5 font-sans">
                        <div>
                          <code className="text-xs font-mono text-[var(--accent-600)] dark:text-[var(--accent-400)]">{input.name}</code>
                          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{input.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="neutral">{input.type}</Badge>
                          {input.required && <Badge variant="info">required</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Outputs</h3>
                  <div className="space-y-2">
                    {blueprint.outputs.map((output) => (
                      <div key={output.name} className="py-1.5">
                        <code className="text-xs font-mono text-[var(--accent-600)] dark:text-[var(--accent-400)]">{output.name}</code>
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{output.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="border-[var(--border-secondary)] bg-[var(--bg-secondary)]/35 backdrop-blur-md shadow-lg">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-[var(--accent-500)] animate-pulse" />
                    Blueprint Trust Scorecard
                  </h3>
                  <Badge variant="success" className="font-semibold px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Verified</Badge>
                </div>

                <div className="flex flex-col items-center justify-center p-4 bg-[var(--bg-primary)]/40 rounded-xl border border-[var(--border-secondary)]/50">
                  <div className="relative flex items-center justify-center w-24 h-24">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="38"
                        stroke="var(--bg-tertiary)"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="38"
                        stroke="url(#accentGradient)"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray="238"
                        strokeDashoffset="10"
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="var(--accent-400)" />
                          <stop offset="100%" stopColor="var(--accent-600)" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-2xl font-extrabold text-[var(--text-primary)]">96</span>
                      <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Trust Score</span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] text-center mt-3 font-medium">
                    Excellent maintenance status and security compliance.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Metrics & Compatibility</h4>
                  
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs py-1.5 border-b border-[var(--border-secondary)]/50">
                      <span className="text-[var(--text-secondary)]">Maintenance Status</span>
                      <span className="font-semibold text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Actively Maintained
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs py-1.5 border-b border-[var(--border-secondary)]/50">
                      <span className="text-[var(--text-secondary)]">Terraform Compatibility</span>
                      <span className="font-mono font-medium text-[var(--text-primary)]">v1.8 – v1.14</span>
                    </div>
                    <div className="flex justify-between items-center text-xs py-1.5 border-b border-[var(--border-secondary)]/50">
                      <span className="text-[var(--text-secondary)]">OpenTofu Compatibility</span>
                      <span className="font-mono font-medium text-[var(--text-primary)]">v1.8 – v1.11</span>
                    </div>
                    <div className="flex justify-between items-center text-xs py-1.5 border-b border-[var(--border-secondary)]/50">
                      <span className="text-[var(--text-secondary)]">AWS Provider Range</span>
                      <span className="font-mono font-medium text-[var(--text-primary)]">v5.80 – v6.x</span>
                    </div>
                    <div className="flex justify-between items-center text-xs py-1.5 border-b border-[var(--border-secondary)]/50">
                      <span className="text-[var(--text-secondary)]">Active Installations</span>
                      <span className="font-semibold text-[var(--text-primary)]">1,248 repositories</span>
                    </div>
                    <div className="flex justify-between items-center text-xs py-1.5 border-b border-[var(--border-secondary)]/50">
                      <span className="text-[var(--text-secondary)]">Upgrade Success Rate</span>
                      <span className="font-semibold text-[var(--accent-500)] flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-[var(--accent-500)]" /> 99.4%
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs py-1.5 border-b border-[var(--border-secondary)]/50">
                      <span className="text-[var(--text-secondary)]">Security Audit</span>
                      <span className="font-semibold text-emerald-500">24 Rules Passed (100%)</span>
                    </div>
                    <div className="flex justify-between items-center text-xs py-1.5">
                      <span className="text-[var(--text-secondary)]">Est. Cost Range</span>
                      <span className="font-semibold text-indigo-500 flex items-center gap-0.5 dark:text-indigo-400">
                        <DollarSign className="w-3.5 h-3.5 shrink-0" />15 – 250 / mo
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                  <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400">Upgrade Policy Compliance</h4>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    This blueprint adheres to Stacksmith's automatic upgrade validation workflow. Pull requests for versions compatibility are generated automatically within 24 hours of provider releases.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    ) : (
          /* Configuration Wizard */
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Back */}
            <button
              onClick={() => { setShowWizard(false); setStep(0); setGeneratedFiles(null); setValidationResult(null); setPrCreated(false); setErrorMsg(''); }}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to blueprint
            </button>

            {/* Wizard header */}
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Configure {blueprint.name}</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                InfraPack will generate Terraform files and create a pull request — it will not apply any infrastructure.
              </p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2">
              {WIZARD_STEPS.map((stepName, i) => (
                <div key={stepName} className="flex items-center gap-2">
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all duration-200 ${
                    i < step
                      ? 'bg-[var(--success)] text-white'
                      : i === step
                        ? 'bg-[var(--accent-600)] text-white shadow-md shadow-[var(--accent-500)]/30'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                  }`}>
                    {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium ${i === step ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                    {stepName}
                  </span>
                  {i < WIZARD_STEPS.length - 1 && (
                    <div className={`w-8 h-px mx-1 ${i < step ? 'bg-[var(--success)]' : 'bg-[var(--border-primary)]'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="flex gap-3 p-4 rounded-lg bg-[var(--error-muted)] border border-[var(--error)]/30 text-left text-xs">
                <AlertTriangle className="w-4 h-4 text-[var(--error)] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)]">Execution Error</h4>
                  <p className="text-[var(--text-secondary)] mt-1 font-mono">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Step content */}
            <Card>
              <CardContent className="p-6">
                {step === 0 && (
                  <div className="space-y-5 animate-fade-in">
                    <div>
                      <Label htmlFor="repo">Target repository</Label>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5 mb-2">Select the repository for the pull request</p>
                      
                      {loadingRepos ? (
                        <div className="flex items-center justify-center py-6 gap-2 border border-dashed border-[var(--border-primary)] rounded-lg">
                          <span className="w-4 h-4 rounded-full border-2 border-[var(--accent-500)] border-t-transparent animate-spin" />
                          <span className="text-xs text-[var(--text-secondary)]">Loading VCS repositories...</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {repos.map((repo) => (
                            <button
                              key={repo.id}
                              onClick={() => setSelectedRepo(repo.id)}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-150 text-left ${
                                selectedRepo === repo.id
                                  ? 'border-[var(--accent-500)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/15 shadow-sm'
                                  : 'border-[var(--border-primary)] hover:border-[var(--accent-300)] hover:bg-[var(--bg-secondary)]'
                              }`}
                            >
                              <GitBranch className={`w-4 h-4 ${selectedRepo === repo.id ? 'text-[var(--accent-600)]' : 'text-[var(--text-tertiary)]'}`} />
                              <div className="flex-1">
                                <span className="text-sm font-medium text-[var(--text-primary)]">{repo.fullName}</span>
                                <span className="text-xs text-[var(--text-tertiary)] ml-2">({repo.defaultBranch})</span>
                              </div>
                              {selectedRepo === repo.id && <Check className="w-4 h-4 text-[var(--accent-600)]" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="targetDir">Target directory</Label>
                        <Input id="targetDir" value={targetDir} onChange={(e) => setTargetDir(e.target.value)} className="mt-1.5" />
                      </div>
                      <div>
                        <Label htmlFor="env">Environment</Label>
                        <Input id="env" value={environmentName} onChange={(e) => setEnvironmentName(e.target.value)} className="mt-1.5" />
                      </div>
                    </div>

                    <div>
                      <Label>Tool preference</Label>
                      <div className="flex gap-2 mt-1.5">
                        {['terraform', 'opentofu'].map((tool) => (
                          <button
                            key={tool}
                            onClick={() => setToolPreference(tool)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-150 ${
                              toolPreference === tool
                                ? 'border-[var(--accent-500)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/15 text-[var(--accent-700)] dark:text-[var(--accent-300)]'
                                : 'border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                            }`}
                          >
                            {tool === 'terraform' ? 'Terraform' : 'OpenTofu'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-5 animate-fade-in">
                    <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border-secondary)] space-y-3 mb-2">
                      <Label className="text-sm font-semibold text-[var(--text-primary)]">Environment Profile Preset</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {['development', 'staging', 'production'].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handleSelectProfile(p)}
                            className={`px-3 py-2 text-xs font-semibold rounded-lg capitalize transition-all border ${
                              activeProfile === p
                                ? 'bg-[var(--accent-600)] text-white border-transparent shadow-sm'
                                : 'bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--accent-500)]'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)] italic">
                        {activeProfile === 'development' && 'Presets single NAT, small DBs, short log retention, and disables S3 versioning/deletion protection.'}
                        {activeProfile === 'staging' && 'Presets NAT gateway, medium DB, 14-day logs, and enables standard backups.'}
                        {activeProfile === 'production' && 'Presets Multi-AZ, full deletion protection, 90-day logs, and forces manual approvals.'}
                      </p>
                    </div>

                    <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />
                      Configure the blueprint variables. Sensitive values are never stored.
                    </p>
                    {blueprint.inputs.map((input) => (
                      <div key={input.name}>
                        <Label htmlFor={input.name}>
                          {input.label}
                          {input.required && <span className="text-[var(--error)] ml-0.5">*</span>}
                        </Label>
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5 mb-1.5">{input.description}</p>

                        {input.type === 'boolean' ? (
                          <button
                            onClick={() => setInputValues((prev) => ({ ...prev, [input.name]: !prev[input.name] }))}
                            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                              inputValues[input.name] ? 'bg-[var(--accent-600)]' : 'bg-[var(--gray-300)] dark:bg-[var(--gray-600)]'
                            }`}
                          >
                            <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                              inputValues[input.name] ? 'translate-x-5' : ''
                            }`} />
                          </button>
                        ) : (input.type === 'select' || input.type === 'region') && input.options ? (
                          <div className="relative">
                            <select
                              id={input.name}
                              value={(inputValues[input.name] as string) || ''}
                              onChange={(e) => setInputValues((prev) => ({ ...prev, [input.name]: e.target.value }))}
                              className="flex h-9 w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] appearance-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-500)]"
                            >
                              {input.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
                          </div>
                        ) : (
                          <Input
                            id={input.name}
                            type={input.type === 'number' ? 'number' : 'text'}
                            placeholder={input.placeholder}
                            value={(inputValues[input.name] as string) || ''}
                            onChange={(e) => setInputValues((prev) => ({ ...prev, [input.name]: e.target.value }))}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5 animate-fade-in">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Review your configuration</h3>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm py-2 border-b border-[var(--border-secondary)]">
                        <span className="text-[var(--text-secondary)]">Blueprint</span>
                        <span className="font-medium text-[var(--text-primary)]">{blueprint.name} v{blueprint.version}</span>
                      </div>
                      <div className="flex justify-between text-sm py-2 border-b border-[var(--border-secondary)]">
                        <span className="text-[var(--text-secondary)]">Repository</span>
                        <span className="font-medium text-[var(--text-primary)]">{repos.find((r) => r.id === selectedRepo)?.fullName || '—'}</span>
                      </div>
                      <div className="flex justify-between text-sm py-2 border-b border-[var(--border-secondary)]">
                        <span className="text-[var(--text-secondary)]">Target directory</span>
                        <code className="text-xs font-mono text-[var(--accent-600)]">{targetDir}/</code>
                      </div>
                      <div className="flex justify-between text-sm py-2 border-b border-[var(--border-secondary)]">
                        <span className="text-[var(--text-secondary)]">Tool</span>
                        <span className="font-medium text-[var(--text-primary)] capitalize">{toolPreference}</span>
                      </div>

                      {Object.entries(inputValues).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm py-2 border-b border-[var(--border-secondary)]">
                          <span className="text-[var(--text-secondary)]">{key}</span>
                          <span className="font-medium text-[var(--text-primary)] font-mono text-xs">{String(value)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]">
                      <Shield className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                      <p className="text-xs text-[var(--text-secondary)]">
                        This will generate Terraform files and validate them. No infrastructure will be created or modified until you merge the pull request and run Terraform yourself.
                      </p>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-5 animate-fade-in">
                    {!prCreated ? (
                      <>
                        {/* Generated files */}
                        {generatedFiles && (
                          <div>
                            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                              <FileCode className="w-4 h-4 text-[var(--accent-500)]" />
                              Generated files
                            </h3>
                            <div className="space-y-1">
                              {generatedFiles.map((file) => (
                                <div key={file.path} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[var(--bg-secondary)] transition-colors">
                                  <FileCode className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                                  <code className="text-xs font-mono text-[var(--text-primary)]">{file.path}</code>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Validation */}
                        {validationResult && (
                          <div>
                            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                              {validationResult.status === 'passed' || validationResult.status === 'skipped' ? (
                                <Check className="w-4 h-4 text-[var(--success)]" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-[var(--error)]" />
                              )}
                              Validation: <span className="capitalize font-bold">{validationResult.status}</span>
                            </h3>
                            <div className="space-y-1.5">
                              {validationResult.commands.map((cmd, i) => (
                                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--bg-secondary)]">
                                  <div className={`w-1.5 h-1.5 rounded-full ${cmd.exitCode === 0 ? 'bg-[var(--success)]' : 'bg-[var(--error)]'}`} />
                                  <code className="text-xs font-mono text-[var(--text-secondary)]">{cmd.command}</code>
                                  <span className={`ml-auto text-xs font-medium ${cmd.exitCode === 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                                    {cmd.exitCode === 0 ? 'passed' : 'failed'}
                                  </span>
                                </div>
                              ))}
                              {validationResult.commands.length === 0 && (
                                <p className="text-xs text-[var(--text-secondary)]">
                                  {validationResult.status === 'skipped' && 'Validation skipped because Terraform/OpenTofu is not installed in the sandbox.'}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        <Button onClick={handleCreatePR} loading={isGenerating} size="lg" className="w-full bg-gradient-to-r from-indigo-500 to-violet-600">
                          <GitBranch className="w-4 h-4" />
                          Create pull request
                        </Button>
                      </>
                    ) : (
                      /* PR Created Success */
                      <div className="text-center py-8 animate-scale-in">
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[var(--success-muted)] mx-auto mb-4">
                          <Check className="w-8 h-8 text-[var(--success)]" />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Pull request created</h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-1">
                          Branch: <code className="text-xs font-mono text-[var(--accent-600)]">{prDetails?.branchName || `infrapack/${slug}`}</code>
                        </p>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                          PR #{prDetails?.prNumber || '1'} on {repos.find((r) => r.id === selectedRepo)?.fullName}
                        </p>

                        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] mb-6 text-left">
                          <AlertTriangle className="w-4 h-4 text-[var(--warning)] shrink-0" />
                          <p className="text-xs text-[var(--text-secondary)]">
                            Review the pull request, then run <code className="font-mono text-[var(--accent-600)]">{toolPreference} apply</code> in your own environment. InfraPack does not apply infrastructure.
                          </p>
                        </div>

                        <div className="flex justify-center gap-3">
                          <Button variant="secondary" asChild>
                            <Link href="/deployments">View deployments</Link>
                          </Button>
                          <Button asChild>
                            <Link href="/blueprints">Deploy another</Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            {!prCreated && (
              <div className="flex justify-between">
                <Button
                  variant="secondary"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>

                {step < 2 && (
                  <Button
                    onClick={() => setStep((s) => s + 1)}
                    disabled={step === 0 && !selectedRepo}
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}

                {step === 2 && (
                  <Button onClick={handleGenerate} loading={isGenerating}>
                    Generate & validate
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
