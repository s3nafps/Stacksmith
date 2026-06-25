'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  Tags,
  Globe,
  Lock,
  Plus,
  Trash2,
  Save,
  Check,
} from 'lucide-react';
import { useState } from 'react';

interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'cost' | 'tagging';
  enabled: boolean;
}

export default function PoliciesPage() {
  const [tags, setTags] = useState<string[]>(['Environment', 'ProjectName', 'Owner', 'CostCenter']);
  const [newTag, setNewTag] = useState('');
  const [allowedRegions, setAllowedRegions] = useState<Record<string, boolean>>({
    'us-east-1': true,
    'us-west-2': true,
    'eu-west-1': true,
    'eu-central-1': false,
    'ap-southeast-1': false,
    'sa-east-1': false,
  });

  const [rules, setRules] = useState<ComplianceRule[]>([
    {
      id: 'block-wildcard-iam',
      name: 'Block Wildcard IAM Permissions',
      description: 'Fail validation if any IAM policy allows wildcard actions (*)',
      category: 'security',
      enabled: true,
    },
    {
      id: 'enforce-s3-encryption',
      name: 'Enforce S3 Encryption at Rest',
      description: 'Require all S3 buckets to have server-side encryption enabled',
      category: 'security',
      enabled: true,
    },
    {
      id: 'prevent-s3-public-write',
      name: 'Prevent Public S3 Write Access',
      description: 'Block S3 bucket policies that allow public write permissions',
      category: 'security',
      enabled: true,
    },
    {
      id: 'restrict-db-instance-size',
      name: 'Restrict Database Instance Sizes',
      description: 'Limit RDS instance classes to db.t3.medium and below in dev environments',
      category: 'cost',
      enabled: false,
    },
    {
      id: 'require-flow-logs',
      name: 'Require VPC Flow Logs',
      description: 'Enforce flow log creation for all public network VPC structures',
      category: 'security',
      enabled: true,
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleToggleRegion = (region: string) => {
    setAllowedRegions((prev) => ({
      ...prev,
      [region]: !prev[region],
    }));
  };

  const handleToggleRule = (id: string) => {
    setRules(
      rules.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
  };

  const handleSavePolicies = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }, 800);
  };

  return (
    <>
      <Header
        title="Compliance Policies"
        description="Configure infrastructure guardrails and validation rules for all connected repositories."
      />

      <div className="p-6 lg:p-8 space-y-6 page-enter max-w-6xl">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-secondary)]">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Workspace Guardrails</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Violations are checked during local planning and VCS runner stages, automatically blocking unsafe merges.
            </p>
          </div>
          <Button
            onClick={handleSavePolicies}
            loading={saving}
            className="bg-gradient-to-r from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/10 gap-1.5"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                Guardrails Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tag Enforcement */}
          <Card className="border-[var(--border-secondary)] bg-[var(--bg-secondary)]/15 backdrop-blur-sm">
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Tags className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Required Resource Tags</h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">All provisioned assets must contain these tags.</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. CostCenter"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    className="text-xs h-8.5"
                  />
                  <Button onClick={handleAddTag} size="sm" className="shrink-0 h-8.5 px-3">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {tags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)] text-xs font-mono"
                    >
                      <span className="text-[var(--text-primary)]">{tag}</span>
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="text-[var(--text-tertiary)] hover:text-[var(--error)] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {tags.length === 0 && (
                    <p className="text-[11px] text-[var(--text-tertiary)] italic text-center py-4">
                      No tags required.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Regional Restrictions */}
          <Card className="border-[var(--border-secondary)] bg-[var(--bg-secondary)]/15 backdrop-blur-sm">
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Allowed AWS Regions</h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">Restrict provisioning to selected regions.</p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                {Object.entries(allowedRegions).map(([region, allowed]) => (
                  <button
                    key={region}
                    onClick={() => handleToggleRegion(region)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 text-left ${
                      allowed
                        ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50'
                        : 'border-[var(--border-primary)] bg-[var(--bg-primary)]/40 opacity-70 hover:border-[var(--accent-500)]/40'
                    }`}
                  >
                    <span className="text-xs font-mono font-medium text-[var(--text-primary)] uppercase">
                      {region}
                    </span>
                    <Badge
                      className={`text-[9px] px-1.5 py-0 font-semibold ${
                        allowed
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : 'bg-slate-500/10 text-[var(--text-tertiary)] border border-[var(--border-primary)]'
                      }`}
                    >
                      {allowed ? 'Allowed' : 'Blocked'}
                    </Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Security Rules / Guardrails */}
          <Card className="border-[var(--border-secondary)] bg-[var(--bg-secondary)]/15 backdrop-blur-sm">
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">IAM & S3 Guardrails</h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">Static analysis rules enforced via Checkov scan.</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-3 rounded-lg border transition-all ${
                      rule.enabled
                        ? 'border-indigo-500/20 bg-indigo-500/5'
                        : 'border-[var(--border-primary)] bg-[var(--bg-primary)]/40 opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                          {rule.name}
                        </span>
                        <p className="text-[10px] text-[var(--text-secondary)] leading-normal">
                          {rule.description}
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleRule(rule.id)}
                        className={`relative shrink-0 w-8 h-4.5 rounded-full transition-colors duration-200 ${
                          rule.enabled ? 'bg-indigo-500' : 'bg-[var(--border-secondary)]'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            rule.enabled ? 'translate-x-3.5' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Global Compliance overview */}
        <Card className="border-[var(--border-secondary)] bg-[var(--bg-secondary)]/10">
          <CardContent className="p-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
            <div className="flex gap-3 text-left">
              <Shield className="w-9 h-9 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Automatic Policy Evaluation</h4>
                <p className="text-xs text-[var(--text-secondary)] leading-normal max-w-2xl mt-1">
                  Stacksmith runs a simulated static plan validation (`trivy` + `checkov` + `infracost`) on all active pull requests. Setting these guardrails enforces compliance in your teams' native flow before any Terraform execution.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              CI Runners Enabled
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
