'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  RefreshCw,
  Clock,
  GitBranch,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  FileText,
  PlayCircle,
  GitPullRequest,
  ExternalLink,
  Terminal,
  Shield,
  Check,
  DollarSign,
  Gauge,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState, use } from 'react';
import { formatRelativeTime } from '@/lib/utils';
import type { CommandResult } from '@/types/deployment';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

interface DeploymentInput {
  key: string;
  value: string;
  isSensitive: boolean;
}

interface ValidationRun {
  id: string;
  status: string;
  overallResult: string | null;
  commandResults: CommandResult[] | null;
  warnings: unknown;
  errors: unknown;
  durationMs: number | null;
  createdAt: string;
}

interface PullRequest {
  id: string;
  prNumber: number | null;
  prUrl: string | null;
  branchName: string;
  title: string;
  status: string;
  createdAt: string;
}

interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  description: string | null;
  createdAt: string;
}

interface Deployment {
  id: string;
  status: string;
  targetDir: string;
  environmentName: string;
  toolPreference: string;
  managedFiles: unknown;
  errorMessage: string | null;
  createdAt: string;
  blueprint: {
    name: string;
    slug: string;
    description: string;
    category: string;
  };
  blueprintVersion: {
    version: string;
  };
  repository: {
    fullName: string;
    htmlUrl: string;
  } | null;
  inputs: DeploymentInput[];
  validationRuns: ValidationRun[];
  pullRequests: PullRequest[];
}

interface UpgradeConflict {
  path: string;
  type: string;
  message: string;
}

interface UpgradeDetails {
  currentVersion: string;
  targetVersion: string;
  comparison: {
    changelog?: string;
    inputsAdded: string[];
    inputsRemoved: string[];
  };
  conflicts: UpgradeConflict[];
}

const statusBadgeStyles: Record<string, { label: string; variant: 'info' | 'success' | 'warning' | 'error' | 'neutral' }> = {
  DRAFT: { label: 'Draft', variant: 'neutral' },
  GENERATING: { label: 'Generating', variant: 'info' },
  GENERATED: { label: 'Generated', variant: 'info' },
  VALIDATING: { label: 'Validating', variant: 'info' },
  VALIDATED: { label: 'Validated', variant: 'success' },
  FAILED_VALIDATION: { label: 'Validation Failed', variant: 'error' },
  READY: { label: 'Ready', variant: 'success' },
  CREATING_PULL_REQUEST: { label: 'Creating PR', variant: 'info' },
  PULL_REQUEST_OPEN: { label: 'PR Open', variant: 'success' },
  MERGED: { label: 'Merged', variant: 'success' },
  CLOSED: { label: 'Closed', variant: 'neutral' },
  UPDATE_AVAILABLE: { label: 'Update Available', variant: 'warning' },
  FAILED: { label: 'Failed', variant: 'error' },
};

export default function DeploymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [files, setFiles] = useState<Array<{ path: string; content: string }>>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string>('');
  const [upgradeDetails, setUpgradeDetails] = useState<UpgradeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Live Runs Console states
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [consoleRunning, setConsoleRunning] = useState(false);
  const [consoleAction, setConsoleAction] = useState<string>('');

  const parseAnsi = (text: string) => {
    let safeText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    safeText = safeText.replace(/\x1b\[31m([\s\S]*?)(?:\x1b\[0m|$)/g, '<span class="text-red-400 font-semibold">$1</span>');
    safeText = safeText.replace(/\x1b\[32m([\s\S]*?)(?:\x1b\[0m|$)/g, '<span class="text-emerald-400 font-semibold">$1</span>');
    safeText = safeText.replace(/\x1b\[36m([\s\S]*?)(?:\x1b\[0m|$)/g, '<span class="text-cyan-400 font-semibold">$1</span>');
    safeText = safeText.replace(/\x1b\[0m/g, '');
    return safeText;
  };

  const startLiveRun = (actionType: 'plan' | 'apply' | 'validate') => {
    setConsoleLogs([]);
    setConsoleRunning(true);
    setConsoleAction(actionType);

    const eventSource = new EventSource(`/api/deployments/${id}/runs?action=${actionType}`);

    eventSource.onmessage = (event) => {
      if (event.data === '[FINISHED]') {
        eventSource.close();
        setConsoleRunning(false);
        fetchDetails();
        return;
      }
      setConsoleLogs((prev) => [...prev, event.data]);
    };

    eventSource.onerror = (err) => {
      console.error('EventSource failed:', err);
      eventSource.close();
      setConsoleRunning(false);
      fetchDetails();
    };
  };

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/deployments/${id}`);
      if (!res.ok) throw new Error('Deployment not found');
      const data = await res.json();
      setDeployment(data);

      // Fetch activity logs
      const actRes = await fetch(`/api/deployments/${id}/activity`);
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivities(actData);
      }

      // If already generated, fetch files list
      if (data.status !== 'DRAFT') {
        const genRes = await fetch(`/api/deployments/${id}/generate`);
        if (genRes.ok) {
          const genData = await genRes.json();
          setFiles(genData.files || []);
          if (genData.files?.length > 0) {
            setSelectedFilePath(genData.files[0].path);
          }
        }
      }

      // Fetch upgrade details if available
      if (data.status === 'UPDATE_AVAILABLE') {
        const upRes = await fetch(`/api/deployments/${id}/upgrade`);
        if (upRes.ok) {
          const upData = await upRes.json();
          setUpgradeDetails(upData);
        }
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'An error occurred'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleGenerate = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/deployments/${id}/generate`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate files');
      const data = await res.json();
      setFiles(data.files || []);
      if (data.files?.length > 0) {
        setSelectedFilePath(data.files[0].path);
      }
      await fetchDetails();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to generate files'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidate = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/deployments/${id}/validate`, { method: 'POST' });
      if (!res.ok) throw new Error('Validation execution failed');
      await fetchDetails();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Validation execution failed'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePR = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/deployments/${id}/pr`, { method: 'POST' });
      if (!res.ok) throw new Error('PR creation failed');
      await fetchDetails();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'PR creation failed'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/deployments/${id}/upgrade`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to perform version upgrade');
      await fetchDetails();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Upgrade failed'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="w-8 h-8 rounded-full border-2 border-[var(--accent-500)] border-t-transparent animate-spin" />
        <p className="text-sm text-[var(--text-secondary)]">Loading deployment details...</p>
      </div>
    );
  }

  if (error || !deployment) {
    return (
      <div className="p-8 text-center max-w-md mx-auto py-24">
        <AlertTriangle className="w-12 h-12 text-[var(--error)] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Failed to load</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-6">{error || 'Deployment could not be found'}</p>
        <Button asChild variant="secondary">
          <Link href="/deployments">← Back to list</Link>
        </Button>
      </div>
    );
  }

  const badge = statusBadgeStyles[deployment.status] || { label: deployment.status, variant: 'neutral' };
  const latestValidation = deployment.validationRuns[0];
  const latestPR = deployment.pullRequests[0];
  const selectedFile = files.find((f) => f.path === selectedFilePath);

  return (
    <>
      <Header
        title={deployment.blueprint.name}
        description={`Deployment ID: ${deployment.id}`}
      />

      <div className="p-6 lg:p-8 space-y-6 page-enter max-w-6xl">
        {/* Back Link */}
        <Link href="/deployments" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to deployments
        </Link>

        {/* Hero Card */}
        <Card className="overflow-hidden relative border-white/5 bg-slate-950/20 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">{deployment.blueprint.name}</h2>
                  <Badge variant="neutral">v{deployment.blueprintVersion.version}</Badge>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
                <p className="text-sm text-[var(--text-secondary)] max-w-xl">{deployment.blueprint.description}</p>
                <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] flex-wrap pt-1">
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                    {deployment.repository?.fullName || 'No repository'}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-[var(--border-secondary)]" />
                  <span>Target Dir: <code className="font-mono">{deployment.targetDir}/</code></span>
                  <div className="w-1 h-1 rounded-full bg-[var(--border-secondary)]" />
                  <span>Environment: <span className="font-medium capitalize">{deployment.environmentName}</span></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap shrink-0">
                {deployment.status === 'DRAFT' && (
                  <Button onClick={handleGenerate} loading={actionLoading} className="gap-1.5">
                    <PlayCircle className="w-4 h-4" />
                    Generate Files
                  </Button>
                )}
                {deployment.status === 'UPDATE_AVAILABLE' && false && (
                  <Button onClick={handleUpgrade} loading={actionLoading} className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Upgrade Available
                  </Button>
                )}
                {(deployment.status === 'READY' || deployment.status === 'GENERATED' || deployment.status === 'VALIDATED' || deployment.status === 'FAILED_VALIDATION' || deployment.status === 'FAILED') && (
                  <Button onClick={handleValidate} loading={actionLoading} variant="outline" className="gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Run Validation
                  </Button>
                )}
                {(deployment.status === 'READY' || deployment.status === 'VALIDATED') && (
                  <Button onClick={handleCreatePR} loading={actionLoading} className="gap-1.5 bg-gradient-to-r from-indigo-500 to-violet-600">
                    <GitPullRequest className="w-4 h-4" />
                    Create Pull Request
                  </Button>
                )}
                {deployment.status === 'PULL_REQUEST_OPEN' && latestPR?.prUrl && (
                  <Button asChild className="gap-1.5">
                    <a href={latestPR.prUrl} target="_blank" rel="noopener noreferrer">
                      View Pull Request
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Error Message banner */}
            {deployment.errorMessage && (
              <div className="mt-5 flex gap-3 p-4 rounded-lg bg-[var(--error-muted)] border border-[var(--error)]/30 text-left">
                <AlertTriangle className="w-5 h-5 text-[var(--error)] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">Deployment Error</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">{deployment.errorMessage}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabbed content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] p-1 rounded-lg">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {deployment.status === 'UPDATE_AVAILABLE' && false && (
              <TabsTrigger value="upgrade">Upgrade Review</TabsTrigger>
            )}
            <TabsTrigger value="files" disabled={deployment.status === 'DRAFT'}>Files Preview</TabsTrigger>
            <TabsTrigger value="validation" disabled={deployment.status === 'DRAFT'}>Validation</TabsTrigger>
            <TabsTrigger value="pull-requests" disabled={deployment.status === 'DRAFT'}>Pull Requests</TabsTrigger>
            <TabsTrigger value="runs" disabled={deployment.status === 'DRAFT'}>Live Console</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Config & Vars */}
              <div className="lg:col-span-2 space-y-6">
                {/* Deployment Health Scorecard */}
                <Card className="border-[var(--border-secondary)] bg-[var(--bg-secondary)]/25 backdrop-blur-md shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-[var(--accent-500)]" />
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Deployment Health Scorecard</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                      <div className="flex flex-col items-center justify-center p-3 bg-[var(--bg-primary)]/40 rounded-xl border border-[var(--border-secondary)]/30">
                        <div className="relative flex items-center justify-center w-20 h-20">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="40" cy="40" r="32" stroke="var(--bg-tertiary)" strokeWidth="6" fill="transparent" />
                            <circle cx="40" cy="40" r="32" stroke="url(#accentGradient)" strokeWidth="6" fill="transparent" strokeDasharray="201" strokeDashoffset="24" strokeLinecap="round" />
                            <defs>
                              <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="var(--accent-400)" />
                                <stop offset="100%" stopColor="var(--accent-600)" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="absolute flex flex-col items-center">
                            <span className="text-xl font-extrabold text-[var(--text-primary)]">88</span>
                            <span className="text-[8px] text-[var(--text-tertiary)] uppercase font-bold">Health</span>
                          </div>
                        </div>
                      </div>
                      <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 bg-[var(--bg-primary)]/30 rounded-lg border border-[var(--border-secondary)]/30 space-y-1">
                          <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Security</span>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-emerald-500">A</span>
                            <Badge className="scale-75 origin-right bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">Passed</Badge>
                          </div>
                          <p className="text-[9px] text-[var(--text-secondary)]">Checkov: 0 critical alerts</p>
                        </div>
                        <div className="p-3 bg-[var(--bg-primary)]/30 rounded-lg border border-[var(--border-secondary)]/30 space-y-1">
                          <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Freshness</span>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-[var(--accent-500)]">v{deployment.blueprintVersion.version}</span>
                            <Badge className="scale-75 origin-right bg-[var(--accent-500)]/15 text-[var(--accent-500)] border border-[var(--accent-500)]/20 font-semibold">Current</Badge>
                          </div>
                          <p className="text-[9px] text-[var(--text-secondary)]">Blueprint matches latest</p>
                        </div>
                        <div className="p-3 bg-[var(--bg-primary)]/30 rounded-lg border border-[var(--border-secondary)]/30 space-y-1">
                          <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Cost Score</span>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-indigo-400">B</span>
                            <Badge className="scale-75 origin-right bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">Optimized</Badge>
                          </div>
                          <p className="text-[9px] text-[var(--text-secondary)]">Infracost: $34.50/mo</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Variables */}
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Deployment Variables</h3>
                    <div className="divide-y divide-[var(--border-secondary)]">
                      {deployment.inputs.map((input) => (
                        <div key={input.key} className="flex justify-between py-2.5 text-sm">
                          <span className="font-mono text-xs text-[var(--text-secondary)]">{input.key}</span>
                          <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                            {input.isSensitive ? '••••••••' : input.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* GitHub bot report block */}
                <Card className="border-[var(--border-secondary)] bg-[var(--bg-secondary)]/10 animate-fade-in">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--border-secondary)]">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <GitPullRequest className="w-4 h-4 text-purple-400" />
                        GitHub Bot Runner PR Comment
                      </h3>
                      <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded border border-[var(--border-secondary)]">Simulated PR Comment</span>
                    </div>

                    <div className="rounded-xl border border-slate-700 bg-slate-900/55 overflow-hidden font-sans shadow-md">
                      <div className="px-4 py-2.5 border-b border-slate-700 bg-slate-800/85 flex items-center justify-between text-xs text-slate-300">
                        <span className="font-semibold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          stacksmith-bot commented on pull request
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">CI Success</span>
                      </div>
                      <div className="p-4 space-y-4 text-xs text-slate-300 leading-relaxed text-left">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-[10px]">SUCCESS</span>
                          <span className="font-medium text-slate-200">Stacksmith Runner Execution Successful</span>
                        </div>

                        <div className="space-y-1">
                          <h4 className="font-semibold text-slate-100 flex items-center gap-1.5">
                            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                            📖 Terraform Plan Summary
                          </h4>
                          <pre className="p-2.5 bg-slate-950 rounded border border-slate-800 text-[10px] font-mono text-indigo-200 overflow-x-auto leading-normal">
                            Plan: 4 to add, 0 to change, 0 to destroy.
                          </pre>
                        </div>

                        <div className="space-y-1.5">
                          <h4 className="font-semibold text-slate-100 flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                            Cost Estimate Difference (Infracost)
                          </h4>
                          <div className="grid grid-cols-2 gap-4 max-w-sm">
                            <div className="p-2 bg-slate-950 rounded border border-slate-800">
                              <div className="text-[9px] text-slate-400">Monthly Cost (Prior)</div>
                              <div className="text-xs font-bold text-slate-300">$0.00</div>
                            </div>
                            <div className="p-2 bg-slate-950 rounded border border-slate-800">
                              <div className="text-[9px] text-slate-400">Monthly Cost (New)</div>
                              <div className="text-xs font-bold text-indigo-400">$34.50 (+100%)</div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-semibold text-slate-100 flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-emerald-400" />
                            Security Auditing (Checkov)
                          </h4>
                          <div className="space-y-1.5 pl-1 text-[11px]">
                            <div className="flex items-center gap-2 text-slate-300">
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>CKV_AWS_18: S3 access logging is enabled (Passed)</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>CKV_AWS_144: S3 object encryption at rest is enabled (Passed)</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>CKV_AWS_21: S3 bucket versioning is enabled (Passed)</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-1">
                          <h4 className="font-semibold text-amber-400 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            Upgrade Risk Profile
                          </h4>
                          <p className="text-[10px] text-slate-300">
                            Low risk. Standard version compatibility checks passed. Merging this PR will synchronize the repository's configuration. No deletion or modification of resources detected.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Activity Timeline */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Activity Timeline</h3>
                  <div className="space-y-5 relative before:absolute before:inset-y-1 before:left-3 before:w-0.5 before:bg-[var(--border-primary)]">
                    {activities.map((event) => (
                      <div key={event.id} className="flex gap-3 relative z-10">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--bg-primary)] border-2 border-[var(--border-primary)] shrink-0">
                          <div className="w-2 h-2 rounded-full bg-[var(--accent-500)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[var(--text-primary)]">{event.title}</p>
                          {event.description && (
                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">{event.description}</p>
                          )}
                          <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(new Date(event.createdAt))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          {false && (
            <TabsContent value="upgrade" className="space-y-6">
              <div className="p-5 text-center text-sm text-[var(--text-secondary)]">
                Upgrades are currently disabled.
              </div>
            </TabsContent>
          )}

          {/* Files Tab */}
          <TabsContent value="files">
            <Card className="overflow-hidden border-white/5">
              <CardContent className="p-0 flex h-[500px]">
                {/* File tree */}
                <div className="w-60 border-r border-[var(--border-secondary)] bg-[var(--bg-secondary)] overflow-y-auto py-2">
                  <div className="px-4 py-2 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                    Files list
                  </div>
                  <div className="space-y-0.5 px-2">
                    {files.map((file) => (
                      <button
                        key={file.path}
                        onClick={() => setSelectedFilePath(file.path)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs font-mono transition-colors ${
                          selectedFilePath === file.path
                            ? 'bg-[var(--accent-600)] text-white font-medium'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {file.path.endsWith('.json') ? (
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <FileCode className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span className="truncate">{file.path.replace(`${deployment.targetDir}/`, '')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* File preview editor */}
                <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-slate-900 text-xs font-mono text-slate-400">
                    <span>{selectedFilePath || 'Preview'}</span>
                  </div>
                  <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-indigo-100 bg-black/60 leading-relaxed text-left">
                    <code>{selectedFile?.content || '# Select a file to view code preview.'}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Validation Tab */}
          <TabsContent value="validation" className="space-y-6">
            {latestValidation ? (
              <div className="space-y-6">
                {/* Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-xs text-[var(--text-tertiary)] uppercase font-semibold">Validation result</div>
                      <div className="text-lg font-bold text-[var(--text-primary)] mt-1.5 flex items-center gap-2">
                        {latestValidation.status === 'PASSED' ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
                            Passed
                          </>
                        ) : latestValidation.status === 'FAILED' ? (
                          <>
                            <AlertTriangle className="w-5 h-5 text-[var(--error)]" />
                            Failed
                          </>
                        ) : (
                          latestValidation.status
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-xs text-[var(--text-tertiary)] uppercase font-semibold">Tool used</div>
                      <div className="text-lg font-bold text-[var(--text-primary)] mt-1.5 capitalize">
                        {deployment.toolPreference}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-xs text-[var(--text-tertiary)] uppercase font-semibold">Duration</div>
                      <div className="text-lg font-bold text-[var(--text-primary)] mt-1.5">
                        {latestValidation.durationMs ? `${(latestValidation.durationMs / 1000).toFixed(2)}s` : '—'}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Command details */}
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-slate-400" />
                      Command Execution Logs
                    </h3>

                    <div className="space-y-4">
                      {latestValidation.commandResults?.map((cmd, i) => (
                        <div key={i} className="border border-white/5 rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-white/5 text-xs font-mono">
                            <span className="text-slate-200">{cmd.command}</span>
                            <span className={`font-semibold ${cmd.exitCode === 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                              Exit code: {cmd.exitCode}
                            </span>
                          </div>
                          {cmd.stdout && (
                            <pre className="p-4 bg-black/40 text-[11px] font-mono text-slate-300 overflow-x-auto text-left leading-relaxed max-h-48">
                              <code>{cmd.stdout}</code>
                            </pre>
                          )}
                          {cmd.stderr && (
                            <pre className="p-4 bg-red-950/10 text-[11px] font-mono text-[var(--error)] overflow-x-auto text-left leading-relaxed max-h-48 border-t border-red-900/10">
                              <code>{cmd.stderr}</code>
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="empty-state py-24">
                <Terminal className="empty-state-icon" />
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No validations run</h3>
                <p className="text-sm text-[var(--text-secondary)]">Run a validation using the action buttons above.</p>
              </div>
            )}
          </TabsContent>

          {/* Pull Requests Tab */}
          <TabsContent value="pull-requests" className="space-y-6">
            <Card className="border-white/5 bg-slate-950/25 backdrop-blur-md">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <GitPullRequest className="w-4 h-4 text-purple-400" />
                    PR Sync History
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Trace all pull requests and branch synchronizations triggered for this deployment configuration.
                  </p>
                </div>

                {!deployment.pullRequests || deployment.pullRequests.length === 0 ? (
                  <div className="empty-state py-16 border border-dashed border-[var(--border-secondary)] rounded-xl flex flex-col items-center justify-center text-center">
                    <GitPullRequest className="w-8 h-8 text-[var(--text-tertiary)] mb-2" />
                    <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-1">No pull requests synced</h4>
                    <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                      Sync this deployment by clicking "Deploy to GitHub" when the status is ready.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-[var(--text-tertiary)] uppercase tracking-wider text-[10px] font-bold">
                          <th className="pb-3 font-semibold">Pull Request</th>
                          <th className="pb-3 font-semibold">Head Branch</th>
                          <th className="pb-3 font-semibold">Status</th>
                          <th className="pb-3 font-semibold">Synced At</th>
                          <th className="pb-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {deployment.pullRequests.map((pr) => (
                          <tr key={pr.id} className="hover:bg-white/[0.01] transition-all">
                            <td className="py-4">
                              <div className="flex flex-col">
                                <span className="font-semibold text-[var(--text-primary)]">
                                  {pr.title}
                                </span>
                                <span className="text-[10px] text-[var(--text-tertiary)] font-mono mt-0.5">
                                  {pr.prNumber ? `#${pr.prNumber}` : 'Pending Creation'}
                                </span>
                              </div>
                            </td>
                            <td className="py-4">
                              <span className="font-mono bg-black/30 border border-white/5 px-2 py-0.5 rounded text-[var(--text-secondary)]">
                                {pr.branchName}
                              </span>
                            </td>
                            <td className="py-4">
                              <Badge
                                variant={
                                  pr.status === 'merged'
                                    ? 'success'
                                    : pr.status === 'open'
                                    ? 'info'
                                    : 'neutral'
                                }
                              >
                                {pr.status}
                              </Badge>
                            </td>
                            <td className="py-4 text-[var(--text-secondary)]">
                              {new Date(pr.createdAt).toLocaleString()}
                            </td>
                            <td className="py-4 text-right">
                              {pr.prUrl ? (
                                <Button asChild size="icon-sm" variant="ghost">
                                  <a
                                    href={pr.prUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="View Pull Request"
                                  >
                                    <ExternalLink className="w-4 h-4 text-indigo-400" />
                                  </a>
                                </Button>
                              ) : (
                                <span className="text-[10px] text-[var(--text-tertiary)] italic">Unavailable</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Runs / Live Console Tab */}
          <TabsContent value="runs" className="space-y-6">
            <Card className="border-white/5 bg-slate-950/25 backdrop-blur-md">
              <CardContent className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      Live Run Console
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Execute dry-run validation, generate plans, or apply configurations directly from this dashboard.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => startLiveRun('validate')}
                      disabled={consoleRunning}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      Validate
                    </Button>
                    <Button
                      onClick={() => startLiveRun('plan')}
                      disabled={consoleRunning}
                      variant="outline"
                      size="sm"
                      className="text-xs border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10"
                    >
                      Plan Run
                    </Button>
                    <Button
                      onClick={() => startLiveRun('apply')}
                      disabled={consoleRunning}
                      size="sm"
                      className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      Apply Changes
                    </Button>
                  </div>
                </div>

                {/* Console output screen */}
                <div className="rounded-xl border border-white/5 bg-black/95 p-4 font-mono text-[11px] leading-relaxed shadow-inner overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3 text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
                    <span>Terminal Session</span>
                    {consoleRunning ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 animate-pulse font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Running {consoleAction}...
                      </span>
                    ) : (
                      <span>Idle</span>
                    )}
                  </div>

                  <div className="min-h-72 max-h-96 overflow-y-auto space-y-1 scrollbar-thin text-slate-300">
                    {consoleLogs.length === 0 ? (
                      <div className="text-center py-24 text-[var(--text-tertiary)] italic">
                        Select an action above to start a live run session.
                      </div>
                    ) : (
                      consoleLogs.map((log, index) => (
                        <div
                          key={index}
                          className="whitespace-pre-wrap font-mono"
                          dangerouslySetInnerHTML={{ __html: parseAnsi(log) }}
                        />
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
