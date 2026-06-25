'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  CheckCircle,
  Building,
  Rocket,
  Shield,
  Zap,
  Info,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

function getCookie(name: string): string | null {
  const match = typeof document !== 'undefined' ? document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)')) : null;
  return match ? match[2] : null;
}

export default function BillingSettingsPage() {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/workspaces');
      if (!res.ok) throw new Error('Failed to fetch workspaces');
      const data = await res.json();
      setWorkspaces(data);

      const activeWpId = getCookie('activeWorkspaceId');
      const active = data.find((w: any) => w.id === activeWpId) || data[0];
      setActiveWorkspace(active);
    } catch (err: any) {
      setError(err.message || 'An error occurred fetching workspaces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCheckout = async (plan: 'free' | 'pro' | 'team' | 'msp') => {
    if (!activeWorkspace) return;
    try {
      setActionLoading(true);
      setActionSuccess('');
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          plan,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Billing checkout failed');

      setActionSuccess(`Plan successfully updated to ${plan}!`);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Payment simulation failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <span className="w-8 h-8 rounded-full border-2 border-[var(--accent-500)] border-t-transparent animate-spin" />
        <p className="text-sm text-[var(--text-secondary)]">Loading billing settings...</p>
      </div>
    );
  }

  const currentPlan = activeWorkspace?.billingPlan || 'free';
  const deploymentsCount = activeWorkspace?.deploymentsCount || 0;

  // Set limits based on active workspace tier
  let deploymentLimit = 3;
  if (currentPlan === 'pro') deploymentLimit = 25;
  if (currentPlan === 'team' || currentPlan === 'msp') deploymentLimit = Infinity;

  const deploymentPercent = deploymentLimit === Infinity ? 0 : Math.min(100, (deploymentsCount / deploymentLimit) * 100);

  // Count owned workspaces
  const ownedWorkspacesCount = workspaces.filter(w => w.role === 'OWNER').length;
  // If the user owns any workspace on Pro/Team/MSP, they have unlimited workspaces
  const hasPremiumWorkspace = workspaces.some(w => w.role === 'OWNER' && ['pro', 'team', 'msp'].includes(w.billingPlan));
  const workspaceLimit = hasPremiumWorkspace ? Infinity : 1;
  const workspacePercent = workspaceLimit === Infinity ? 0 : Math.min(100, (ownedWorkspacesCount / 1) * 100);

  return (
    <>
      <Header
        title="Billing & Subscription"
        description="Configure pricing plans and monitor resource usage metrics"
      />

      <div className="p-6 lg:p-8 space-y-6 page-enter max-w-6xl">
        {/* Active Workspace Info */}
        <Card className="border border-[var(--border-primary)] shadow-sm">
          <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-500)] to-[var(--accent-700)] shadow-lg shadow-[var(--accent-500)]/15 shrink-0 text-white font-bold uppercase text-lg">
                {activeWorkspace?.name?.substring(0, 2) || 'WP'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    {activeWorkspace?.name}
                  </h3>
                  <Badge variant={currentPlan === 'free' ? 'neutral' : 'success'} className="capitalize">
                    {currentPlan} Plan
                  </Badge>
                </div>
                <p className="text-xs text-[var(--text-tertiary)] flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" />
                  Workspace ID: <span className="font-mono">{activeWorkspace?.id}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentPlan !== 'free' ? (
                <div className="flex items-center gap-1.5 text-xs text-[var(--success)] font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Subscription Active
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                  <Info className="w-4 h-4" />
                  Upgrade plan below to unlock premium limits
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Global Payment Provider Notice */}
        <Card className="border-indigo-500/20 bg-indigo-500/5 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex gap-3 text-left">
            <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-[var(--text-primary)]">Global Merchant of Record: Paddle Enabled</h4>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Stacksmith uses **Paddle** as our Merchant of Record. By managing global tax collection and local banking compliance, Paddle ensures checkout operations and payouts remain fully available for developers in **Algeria** and internationally where Stripe is not yet supported.
              </p>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="p-4 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/20 text-xs text-[var(--error)] flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Action Failed</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {actionSuccess && (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {actionSuccess}
          </div>
        )}

        {/* Resource Usage Limits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Deployment Limit */}
          <Card className="border border-[var(--border-primary)] shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                  <Rocket className="w-4 h-4 text-[var(--accent-500)]" />
                  Managed Deployments
                </h4>
                <span className="text-xs text-[var(--text-secondary)] font-medium">
                  {deploymentsCount} / {deploymentLimit === Infinity ? '∞' : deploymentLimit}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    deploymentPercent >= 100
                      ? 'bg-[var(--error)]'
                      : deploymentPercent >= 80
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-[var(--accent-500)] to-[var(--accent-600)]'
                  }`}
                  style={{ width: `${deploymentLimit === Infinity ? 100 : deploymentPercent}%` }}
                />
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">
                {deploymentLimit === Infinity
                  ? 'Unlimited blueprint updates and deployments enabled.'
                  : `Currently using ${deploymentsCount} out of ${deploymentLimit} deployments for this workspace.`}
              </p>
            </CardContent>
          </Card>

          {/* Workspace Limit */}
          <Card className="border border-[var(--border-primary)] shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-[var(--accent-500)]" />
                  Owned Workspaces
                </h4>
                <span className="text-xs text-[var(--text-secondary)] font-medium">
                  {ownedWorkspacesCount} / {workspaceLimit === Infinity ? '∞' : 1}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    workspacePercent >= 100
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-[var(--accent-500)] to-[var(--accent-600)]'
                  }`}
                  style={{ width: `${workspaceLimit === Infinity ? 100 : workspacePercent}%` }}
                />
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">
                {workspaceLimit === Infinity
                  ? 'Unlimited workspaces allowed on your current active plan.'
                  : 'Free tier users are restricted to 1 owned workspace. Upgrade to Pro/Team to create more.'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Cards */}
        <div className="space-y-4 pt-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Select Plan Tier
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Free Tier Card */}
            <Card className={`border flex flex-col justify-between transition-all duration-300 ${currentPlan === 'free' ? 'border-[var(--accent-500)] bg-[var(--bg-secondary)]' : 'border-[var(--border-primary)] hover:border-[var(--border-secondary)]'}`}>
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">Free Sandbox</h4>
                    {currentPlan === 'free' && <Badge variant="neutral">Active</Badge>}
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] min-h-[48px]">
                    Ideal for developers experimenting with Terraform deployments in isolation.
                  </p>
                  <div className="pt-1 flex items-baseline gap-0.5">
                    <span className="text-2xl font-extrabold text-[var(--text-primary)]">$0</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">/ mo</span>
                  </div>
                </div>

                <ul className="space-y-2 text-[11px] text-[var(--text-secondary)] flex-1">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Public blueprints
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Max 3 deployments
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Basic lint checks
                  </li>
                </ul>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCheckout('free')}
                  disabled={currentPlan === 'free' || actionLoading}
                  className="w-full text-xs font-semibold cursor-pointer mt-4"
                >
                  {currentPlan === 'free' ? 'Active Plan' : 'Downgrade'}
                </Button>
              </CardContent>
            </Card>

            {/* Pro Tier Card */}
            <Card className={`border flex flex-col justify-between transition-all duration-300 ${currentPlan === 'pro' ? 'border-[var(--accent-500)] bg-[var(--bg-secondary)]' : 'border-[var(--border-primary)] hover:border-[var(--border-secondary)]'}`}>
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">Developer Pro</h4>
                    {currentPlan === 'pro' && <Badge variant="neutral">Active</Badge>}
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] min-h-[48px]">
                    Perfect for small DevOps teams needing automated continuous updates in Git.
                  </p>
                  <div className="pt-1 flex items-baseline gap-0.5">
                    <span className="text-2xl font-extrabold text-[var(--text-primary)]">$29</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">/ mo</span>
                  </div>
                </div>

                <ul className="space-y-2 text-[11px] text-[var(--text-secondary)] flex-1">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    25 managed deployments
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    Upgrade PR generation
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    Security &amp; cost reports
                  </li>
                </ul>

                <Button
                  variant={currentPlan === 'pro' ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => handleCheckout('pro')}
                  disabled={currentPlan === 'pro' || actionLoading}
                  className="w-full text-xs font-semibold cursor-pointer mt-4"
                >
                  {currentPlan === 'pro' ? 'Active Plan' : 'Select Pro'}
                </Button>
              </CardContent>
            </Card>

            {/* Team Tier Card */}
            <Card className={`border flex flex-col justify-between transition-all duration-300 ${currentPlan === 'team' ? 'border-[var(--accent-500)] bg-[var(--bg-secondary)]' : 'border-[var(--border-primary)] hover:border-[var(--border-secondary)]'}`}>
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">Enterprise Team</h4>
                    {currentPlan === 'team' && <Badge variant="neutral">Active</Badge>}
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] min-h-[48px]">
                    For organizations deploying custom blueprints and strict compliance guardrails.
                  </p>
                  <div className="pt-1 flex items-baseline gap-0.5">
                    <span className="text-2xl font-extrabold text-[var(--text-primary)]">$99</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">/ mo</span>
                  </div>
                </div>

                <ul className="space-y-2 text-[11px] text-[var(--text-secondary)] flex-1">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    Private blueprints repository
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    Organization compliance policies
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    Manual approval workflow gates
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    Up to 5 collaborative seats
                  </li>
                </ul>

                <Button
                  variant={currentPlan === 'team' ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => handleCheckout('team')}
                  disabled={currentPlan === 'team' || actionLoading}
                  className="w-full text-xs font-semibold cursor-pointer mt-4"
                >
                  {currentPlan === 'team' ? 'Active Plan' : 'Select Team'}
                </Button>
              </CardContent>
            </Card>

            {/* MSP Tier Card */}
            <Card className={`border relative flex flex-col justify-between transition-all duration-300 ${currentPlan === 'msp' ? 'border-[var(--accent-500)] bg-[var(--bg-secondary)]' : 'border-[var(--border-primary)] hover:border-[var(--border-secondary)]'}`}>
              <div className="absolute -top-2.5 right-3">
                <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-2.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-wider shadow-md">
                  MSP Choice
                </span>
              </div>

              <CardContent className="p-5 flex flex-col justify-between h-full space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">Cloud MSP</h4>
                    {currentPlan === 'msp' && <Badge variant="neutral">Active</Badge>}
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] min-h-[48px]">
                    Tailored for consultancies managing isolated customer tenants and bulk updates.
                  </p>
                  <div className="pt-1 flex items-baseline gap-0.5">
                    <span className="text-2xl font-extrabold text-[var(--text-primary)]">$249</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">/ mo</span>
                  </div>
                </div>

                <ul className="space-y-2 text-[11px] text-[var(--text-secondary)] flex-1">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    Isolated client workspaces
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    Bulk upgrade campaigns
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    White-label health reports
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    100 managed deployments
                  </li>
                </ul>

                <Button
                  variant={currentPlan === 'msp' ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => handleCheckout('msp')}
                  disabled={currentPlan === 'msp' || actionLoading}
                  className="w-full text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-none cursor-pointer mt-4"
                >
                  {currentPlan === 'msp' ? 'Active Plan' : 'Select MSP'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
