'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Rocket,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  GitBranch,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatRelativeTime } from '@/lib/utils';

interface Deployment {
  id: string;
  status: string;
  targetDir: string;
  environmentName: string;
  createdAt: string;
  blueprint: {
    name: string;
    slug: string;
    category: string;
  };
  blueprintVersion: {
    version: string;
  };
  repository: {
    fullName: string;
  } | null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
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

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDeployments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/deployments');
      if (!res.ok) throw new Error('Failed to fetch deployments');
      const data = await res.json();
      setDeployments(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, []);

  return (
    <>
      <Header
        title="Deployments"
        description="Manage your generated infrastructure deployments"
      />

      <div className="p-6 lg:p-8 space-y-6 page-enter">
        <div className="flex justify-between items-center">
          <div className="text-sm text-[var(--text-secondary)]">
            Total deployments: <span className="font-semibold text-[var(--text-primary)]">{deployments.length}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDeployments} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <span className="w-8 h-8 rounded-full border-2 border-[var(--accent-500)] border-t-transparent animate-spin" />
            <p className="text-sm text-[var(--text-secondary)]">Loading deployments...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <AlertTriangle className="w-12 h-12 text-[var(--error)] mb-3" />
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">Failed to load</h3>
            <p className="text-sm text-[var(--text-secondary)]">{error}</p>
          </div>
        ) : deployments.length === 0 ? (
          <div className="empty-state py-24">
            <Rocket className="empty-state-icon" />
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No deployments yet</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Get started by selecting a blueprint from the catalog.
            </p>
            <Button asChild>
              <Link href="/blueprints">Browse blueprints</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {deployments.map((dep) => {
              const badge = statusBadgeStyles[dep.status] || { label: dep.status, variant: 'neutral' };
              return (
                <Card key={dep.id} className="group hover:shadow-md transition-all duration-200">
                  <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Info */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-[15px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-600)] transition-colors">
                          {dep.blueprint.name}
                        </h3>
                        <Badge variant="neutral">v{dep.blueprintVersion.version}</Badge>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] flex-wrap">
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                          {dep.repository?.fullName || 'No repository'}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-[var(--border-secondary)]" />
                        <span>Dir: <code className="font-mono">{dep.targetDir}</code></span>
                        <div className="w-1 h-1 rounded-full bg-[var(--border-secondary)]" />
                        <span>Env: <span className="font-medium capitalize">{dep.environmentName}</span></span>
                      </div>
                    </div>

                    {/* Meta & Action */}
                    <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 border-t border-[var(--border-secondary)] pt-3 md:border-none md:pt-0">
                      <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Created {formatRelativeTime(new Date(dep.createdAt))}
                      </span>
                      <Button asChild variant="ghost" size="sm" className="group-hover:translate-x-0.5 transition-transform">
                        <Link href={`/deployments/${dep.id}`} className="flex items-center gap-1">
                          Details
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
