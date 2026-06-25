'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Rocket,
  GitPullRequest,
  Blocks,
  ArrowUpCircle,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
} from 'lucide-react';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';

// Static seed data for the MVP overview
const stats = [
  {
    label: 'Deployments',
    value: '12',
    change: '+3 this week',
    icon: Rocket,
    color: 'from-indigo-500 to-violet-600',
    shadowColor: 'shadow-indigo-500/20',
  },
  {
    label: 'Open PRs',
    value: '4',
    change: '2 pending review',
    icon: GitPullRequest,
    color: 'from-emerald-500 to-teal-600',
    shadowColor: 'shadow-emerald-500/20',
  },
  {
    label: 'Blueprints in use',
    value: '3',
    change: 'of 3 available',
    icon: Blocks,
    color: 'from-amber-500 to-orange-600',
    shadowColor: 'shadow-amber-500/20',
  },
  {
    label: 'Updates available',
    value: '1',
    change: 'aws-s3-static-site',
    icon: ArrowUpCircle,
    color: 'from-rose-500 to-pink-600',
    shadowColor: 'shadow-rose-500/20',
  },
];

const recentActivity = [
  {
    id: '1',
    type: 'PR_CREATED' as const,
    title: 'Pull request created',
    description: 'aws-vpc-network → acme/infrastructure #47',
    time: new Date(Date.now() - 1000 * 60 * 23),
    status: 'success' as const,
  },
  {
    id: '2',
    type: 'VALIDATION_PASSED' as const,
    title: 'Validation passed',
    description: 'aws-s3-static-site v1.0.0 — all checks passed',
    time: new Date(Date.now() - 1000 * 60 * 60 * 2),
    status: 'success' as const,
  },
  {
    id: '3',
    type: 'UPGRADE_AVAILABLE' as const,
    title: 'Upgrade available',
    description: 'aws-s3-static-site v1.0.0 → v1.1.0',
    time: new Date(Date.now() - 1000 * 60 * 60 * 5),
    status: 'warning' as const,
  },
  {
    id: '4',
    type: 'DEPLOYMENT_CREATED' as const,
    title: 'New deployment',
    description: 'aws-github-oidc → acme/platform-services',
    time: new Date(Date.now() - 1000 * 60 * 60 * 24),
    status: 'info' as const,
  },
  {
    id: '5',
    type: 'PR_MERGED' as const,
    title: 'Pull request merged',
    description: 'aws-s3-static-site → acme/frontend #41',
    time: new Date(Date.now() - 1000 * 60 * 60 * 48),
    status: 'success' as const,
  },
];

const activityIcon = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: GitBranch,
  error: AlertTriangle,
};

const activityColor = {
  success: 'text-[var(--success)]',
  warning: 'text-[var(--warning)]',
  info: 'text-[var(--info)]',
  error: 'text-[var(--error)]',
};

export default function OverviewPage() {
  return (
    <>
      <Header title="Overview" description="Your infrastructure at a glance" />

      <div className="p-6 lg:p-8 space-y-6 page-enter">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[var(--accent-600)] via-[var(--accent-700)] to-indigo-900 p-6 lg:p-8 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djZoLTZWMzBoNnYtNmg2djZoLTZ6TTYgMzR2Nmg2di02SDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative">
            <p className="text-indigo-200 text-sm font-medium mb-1">Welcome to InfraPack</p>
            <h2 className="text-xl lg:text-2xl font-semibold mb-2 tracking-tight">
              Ship infrastructure through pull requests
            </h2>
            <p className="text-indigo-100/80 text-sm max-w-xl leading-relaxed">
              InfraPack generates reviewed Terraform code through GitHub pull requests.
              It does not apply infrastructure or store Terraform state.
            </p>
            <div className="flex gap-3 mt-5">
              <Button asChild size="default" className="bg-white text-indigo-700 hover:bg-indigo-50 shadow-lg">
                <Link href="/blueprints">
                  Browse blueprints
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="default" className="border-white/20 text-white hover:bg-white/10">
                <Link href="/deployments">View deployments</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="group hover:shadow-lg transition-all duration-200">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg ${stat.shadowColor}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                    {stat.value}
                  </div>
                  <div className="text-sm text-[var(--text-secondary)] mt-0.5">{stat.label}</div>
                  <div className="text-xs text-[var(--text-tertiary)] mt-1">{stat.change}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity feed */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-secondary)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent activity</h3>
                  <Link href="/deployments" className="text-xs text-[var(--accent-500)] hover:text-[var(--accent-600)] font-medium transition-colors">
                    View all →
                  </Link>
                </div>
                <div className="divide-y divide-[var(--border-secondary)]">
                  {recentActivity.map((event) => {
                    const Icon = activityIcon[event.status];
                    return (
                      <div key={event.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--bg-secondary)] transition-colors">
                        <div className={`mt-0.5 ${activityColor[event.status]}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)]">{event.title}</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{event.description}</p>
                        </div>
                        <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(event.time)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick actions */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Quick actions</h3>
                <div className="space-y-2">
                  <Link
                    href="/blueprints"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors group"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/30">
                      <Blocks className="w-4 h-4 text-[var(--accent-600)] dark:text-[var(--accent-400)]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-600)] transition-colors">
                        New deployment
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">From a blueprint</p>
                    </div>
                  </Link>
                  <Link
                    href="/connections"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors group"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                      <GitBranch className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-emerald-600 transition-colors">
                        Connect repository
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">Link a GitHub repo</p>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Notice */}
            <Card className="border-[var(--accent-200)] dark:border-[var(--accent-800)]/40 bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/10">
              <CardContent className="p-5">
                <div className="flex gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent-100)] dark:bg-[var(--accent-800)]/30 shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-[var(--accent-600)] dark:text-[var(--accent-400)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--accent-800)] dark:text-[var(--accent-200)]">
                      Update available
                    </p>
                    <p className="text-xs text-[var(--accent-700)] dark:text-[var(--accent-300)] mt-1 leading-relaxed">
                      aws-s3-static-site has a new version (v1.1.0) with CloudFront distribution support.
                    </p>
                    <Button variant="link" size="sm" className="px-0 mt-2 text-[var(--accent-600)] h-auto">
                      Review upgrade →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
