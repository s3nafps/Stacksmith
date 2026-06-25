'use client';

import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  GitPullRequest,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Code2,
} from 'lucide-react';

interface RepositoryOption {
  id: string;
  fullName: string;
  defaultBranch: string;
}

interface VisualVariable {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'region' | 'cidr' | 'domain' | 'sensitive';
  label: string;
  description: string;
  default: string | number | boolean;
  required: boolean;
  options?: { label: string; value: string }[];
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

const defaultVersionsTf = `terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}
`;

const defaultMainTf = `provider "aws" {
  region = var.aws_region
}

resource "aws_s3_bucket" "example" {
  bucket = "\${var.project_name}-example"
}
`;

const defaultOutputsTf = `output "bucket_name" {
  description = "Created bucket name."
  value       = aws_s3_bucket.example.bucket
}
`;

const initialVariables: VisualVariable[] = [
  {
    name: 'project_name',
    type: 'text',
    label: 'Project Name',
    description: 'Project name used for resource naming.',
    default: '',
    required: true,
  },
  {
    name: 'aws_region',
    type: 'region',
    label: 'AWS Region',
    description: 'AWS region.',
    default: 'us-east-1',
    required: true,
    options: [
      { label: 'US East (N. Virginia)', value: 'us-east-1' },
      { label: 'US West (Oregon)', value: 'us-west-2' },
      { label: 'EU (Ireland)', value: 'eu-west-1' },
    ],
  },
];

function compileVariablesTf(variables: VisualVariable[]): string {
  return variables
    .map((v) => {
      let typeStr = 'string';
      if (v.type === 'number') {
        typeStr = 'number';
      } else if (v.type === 'boolean') {
        typeStr = 'bool';
      }

      const lines = [
        `variable "${v.name}" {`,
        `  description = ${JSON.stringify(v.description || '')}`,
        `  type        = ${typeStr}`,
      ];

      if (v.default !== undefined && v.default !== '') {
        if (v.type === 'boolean') {
          const val = v.default === true || v.default === 'true';
          lines.push(`  default     = ${val}`);
        } else if (v.type === 'number') {
          const val = Number(v.default);
          lines.push(`  default     = ${isNaN(val) ? 0 : val}`);
        } else {
          lines.push(`  default     = ${JSON.stringify(String(v.default))}`);
        }
      }

      lines.push('}');
      return lines.join('\n');
    })
    .join('\n\n');
}

export default function NewBlueprintPage() {
  const [slug, setSlug] = useState('custom-s3-example');
  const [name, setName] = useState('Custom S3 Example');
  const [description, setDescription] = useState('A custom Terraform blueprint created in InfraPack.');
  const [category, setCategory] = useState('storage');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [tags, setTags] = useState('custom,s3');
  const [architectureSummary, setArchitectureSummary] = useState('Creates a small AWS baseline from user-authored Terraform.');
  const [securityNotes, setSecurityNotes] = useState('Review generated Terraform before merging and applying.');
  
  // Custom states for visual variables list
  const [variables, setVariables] = useState<VisualVariable[]>(initialVariables);
  const [activeTab, setActiveTab] = useState<'visual' | 'main' | 'outputs' | 'versions' | 'compiled'>('visual');

  // Form states for creating/editing a single variable
  const [showVarForm, setShowVarForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [varName, setVarName] = useState('');
  const [varLabel, setVarLabel] = useState('');
  const [varType, setVarType] = useState<VisualVariable['type']>('text');
  const [varDescription, setVarDescription] = useState('');
  const [varDefault, setVarDefault] = useState('');
  const [varRequired, setVarRequired] = useState(true);
  const [varOptions, setVarOptions] = useState<{ label: string; value: string }[]>([]);
  
  // Temp option state
  const [optLabel, setOptLabel] = useState('');
  const [optValue, setOptValue] = useState('');

  const [versionsTf, setVersionsTf] = useState(defaultVersionsTf);
  const [variablesTf, setVariablesTf] = useState('');
  const [mainTf, setMainTf] = useState(defaultMainTf);
  const [outputsTf, setOutputsTf] = useState(defaultOutputsTf);
  const [repos, setRepos] = useState<RepositoryOption[]>([]);
  const [repositoryId, setRepositoryId] = useState('');
  const [createdSlug, setCreatedSlug] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Sync variables compiling
  useEffect(() => {
    setVariablesTf(compileVariablesTf(variables));
  }, [variables]);

  useEffect(() => {
    fetch('/api/github/repositories')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: RepositoryOption[]) => {
        setRepos(data);
        if (data[0]) setRepositoryId(data[0].id);
      })
      .catch(() => setRepos([]));
  }, []);

  const handleAddVarClick = () => {
    setEditingIndex(null);
    setVarName('');
    setVarLabel('');
    setVarType('text');
    setVarDescription('');
    setVarDefault('');
    setVarRequired(true);
    setVarOptions([]);
    setOptLabel('');
    setOptValue('');
    setShowVarForm(true);
  };

  const handleEditVarClick = (index: number) => {
    const v = variables[index];
    setEditingIndex(index);
    setVarName(v.name);
    setVarLabel(v.label);
    setVarType(v.type);
    setVarDescription(v.description);
    setVarDefault(String(v.default ?? ''));
    setVarRequired(v.required);
    setVarOptions(v.options ? [...v.options] : []);
    setOptLabel('');
    setOptValue('');
    setShowVarForm(true);
  };

  const handleDeleteVar = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const handleAddOption = () => {
    if (!optLabel.trim() || !optValue.trim()) return;
    setVarOptions([...varOptions, { label: optLabel.trim(), value: optValue.trim() }]);
    setOptLabel('');
    setOptValue('');
  };

  const handleRemoveOption = (index: number) => {
    setVarOptions(varOptions.filter((_, i) => i !== index));
  };

  const handleSaveVariable = () => {
    if (!varName.trim()) return;

    const newVar: VisualVariable = {
      name: varName.trim().replace(/\s+/g, '_'),
      label: varLabel.trim() || varName.trim(),
      type: varType,
      description: varDescription.trim(),
      default: varType === 'boolean' ? (varDefault === 'true') : varDefault,
      required: varRequired,
      options: ['select', 'region'].includes(varType) ? varOptions : undefined,
    };

    if (editingIndex !== null) {
      const updated = [...variables];
      updated[editingIndex] = newVar;
      setVariables(updated);
    } else {
      setVariables([...variables, newVar]);
    }

    setShowVarForm(false);
  };

  const createBlueprint = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/blueprints/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name,
          description,
          category,
          difficulty,
          estimatedDeployTime: '10-20 minutes',
          tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
          architectureSummary,
          securityNotes,
          versionsTf,
          variablesTf,
          mainTf,
          outputsTf,
          inputs: variables,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create blueprint');

      setCreatedSlug(data.slug);
      setMessage(`Created ${data.name}. It is now visible in the catalog.`);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to create blueprint'));
    } finally {
      setLoading(false);
    }
  };

  const syncBlueprint = async () => {
    if (!createdSlug || !repositoryId) return;
    setSyncing(true);
    setError('');

    try {
      const res = await fetch(`/api/blueprints/custom/${createdSlug}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync blueprint');
      setMessage(`Opened PR #${data.number}: ${data.htmlUrl}`);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to sync blueprint'));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <Header title="New Blueprint" description="Create, validate, and sync a custom Terraform blueprint" />

      <div className="p-6 lg:p-8 space-y-6 max-w-7xl page-enter">
        <div className="flex items-center justify-between">
          <Link href="/blueprints" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            &larr; Back to catalog
          </Link>
          {createdSlug && <Badge variant="success">Saved in Database</Badge>}
        </div>

        {error && (
          <div className="flex gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-[var(--error)]">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {message && (
          <div className="flex gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-500">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
          {/* Metadata Card */}
          <Card className="border-white/5 bg-slate-950/25 backdrop-blur-md">
            <CardContent className="space-y-4 p-5">
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 min-h-20 w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-2 text-sm text-[var(--text-primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <select
                    id="difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                    className="mt-1 h-9 w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 text-sm text-[var(--text-primary)]"
                  >
                    <option value="beginner">beginner</option>
                    <option value="intermediate">intermediate</option>
                    <option value="advanced">advanced</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} className="mt-1" />
              </div>

              <div>
                <Label>Architecture Summary</Label>
                <textarea
                  value={architectureSummary}
                  onChange={(e) => setArchitectureSummary(e.target.value)}
                  className="mt-1 min-h-20 w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-2 text-xs text-[var(--text-primary)]"
                />
              </div>
              <div>
                <Label>Security Notes</Label>
                <textarea
                  value={securityNotes}
                  onChange={(e) => setSecurityNotes(e.target.value)}
                  className="mt-1 min-h-20 w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-2 text-xs text-[var(--text-primary)]"
                />
              </div>

              <div>
                <Label htmlFor="repo">Sync Repository</Label>
                <select
                  id="repo"
                  value={repositoryId}
                  onChange={(e) => setRepositoryId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 text-sm text-[var(--text-primary)]"
                >
                  <option value="">Select a repository to sync</option>
                  {repos.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={createBlueprint} loading={loading} className="flex-1">
                  Create DB Blueprint
                </Button>
                <Button
                  onClick={syncBlueprint}
                  disabled={!createdSlug || !repositoryId}
                  loading={syncing}
                  variant="outline"
                  className="gap-1.5"
                >
                  <GitPullRequest className="h-4 w-4" />
                  Sync PR
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Builder & Files Tabs */}
          <div className="space-y-4">
            {/* Tab Headers */}
            <div className="flex items-center gap-1.5 border-b border-[var(--border-primary)] pb-1">
              {[
                { id: 'visual', label: 'Variables Builder' },
                { id: 'main', label: 'main.tf' },
                { id: 'outputs', label: 'outputs.tf' },
                { id: 'versions', label: 'versions.tf' },
                { id: 'compiled', label: 'variables.tf (compiled)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-[var(--accent-500)] text-[var(--text-primary)] bg-white/5'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Body */}
            {activeTab === 'visual' && (
              <Card className="border-white/5 bg-slate-950/20 backdrop-blur-md">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Visual Input Variables</h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Define variables to build custom UI forms for users during deployment.
                      </p>
                    </div>
                    <Button onClick={handleAddVarClick} size="sm" className="gap-1">
                      <Plus className="w-3.5 h-3.5" /> Add Variable
                    </Button>
                  </div>

                  {/* Variables List */}
                  <div className="space-y-2">
                    {variables.length === 0 ? (
                      <div className="text-center py-10 border border-dashed border-[var(--border-primary)] rounded-lg text-xs text-[var(--text-tertiary)]">
                        No variables defined. Add your first variable to start building the schema.
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {variables.map((v, i) => (
                          <div
                            key={v.name}
                            className="flex items-start justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[var(--text-primary)] font-mono">{v.name}</span>
                                <Badge variant="neutral" className="text-[10px]">
                                  {v.type}
                                </Badge>
                                {v.required && (
                                  <span className="text-[10px] text-amber-500 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded">
                                    Required
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--text-secondary)]">{v.description || 'No description'}</p>
                              {v.default !== undefined && v.default !== '' && (
                                <p className="text-[10px] text-[var(--text-tertiary)]">
                                  Default: <code className="bg-black/25 px-1 py-0.5 rounded text-[var(--text-secondary)]">{String(v.default)}</code>
                                </p>
                              )}
                              {v.options && v.options.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1.5">
                                  {v.options.map((opt) => (
                                    <span key={opt.value} className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full">
                                      {opt.label}: {opt.value}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex gap-1.5">
                              <Button onClick={() => handleEditVarClick(i)} variant="ghost" size="icon-sm" title="Edit variable">
                                <Edit2 className="w-3.5 h-3.5 text-[var(--text-secondary)] hover:text-white" />
                              </Button>
                              <Button onClick={() => handleDeleteVar(i)} variant="ghost" size="icon-sm" title="Delete variable">
                                <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add/Edit Form Overlay/Block */}
                  {showVarForm && (
                    <div className="p-5 border border-[var(--border-secondary)] bg-slate-950/90 rounded-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          {editingIndex !== null ? 'Edit Variable' : 'Add New Variable'}
                        </h4>
                        <button onClick={() => setShowVarForm(false)} className="text-[var(--text-secondary)] hover:text-white">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="var-name">Variable Name (Terraform id)</Label>
                          <Input
                            id="var-name"
                            value={varName}
                            onChange={(e) => setVarName(e.target.value)}
                            placeholder="e.g. instance_type"
                            className="mt-1 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <Label htmlFor="var-label">UI Field Label</Label>
                          <Input
                            id="var-label"
                            value={varLabel}
                            onChange={(e) => setVarLabel(e.target.value)}
                            placeholder="e.g. Instance Type"
                            className="mt-1 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="var-type">Input Type</Label>
                          <select
                            id="var-type"
                            value={varType}
                            onChange={(e) => setVarType(e.target.value as any)}
                            className="mt-1 h-9 w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 text-sm text-[var(--text-primary)]"
                          >
                            <option value="text">text</option>
                            <option value="number">number</option>
                            <option value="boolean">boolean</option>
                            <option value="select">select</option>
                            <option value="region">region</option>
                            <option value="cidr">cidr</option>
                            <option value="domain">domain</option>
                            <option value="sensitive">sensitive</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="var-default">Default Value</Label>
                          {varType === 'boolean' ? (
                            <select
                              id="var-default"
                              value={varDefault}
                              onChange={(e) => setVarDefault(e.target.value)}
                              className="mt-1 h-9 w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 text-sm text-[var(--text-primary)]"
                            >
                              <option value="">No default</option>
                              <option value="true">true</option>
                              <option value="false">false</option>
                            </select>
                          ) : (
                            <Input
                              id="var-default"
                              value={varDefault}
                              onChange={(e) => setVarDefault(e.target.value)}
                              placeholder="Optional default value"
                              className="mt-1 text-xs"
                            />
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="var-desc">Description</Label>
                        <Input
                          id="var-desc"
                          value={varDescription}
                          onChange={(e) => setVarDescription(e.target.value)}
                          placeholder="Describe the purpose of this input variable"
                          className="mt-1 text-xs"
                        />
                      </div>

                      <div className="flex items-center gap-2 py-1">
                        <input
                          type="checkbox"
                          id="var-req"
                          checked={varRequired}
                          onChange={(e) => setVarRequired(e.target.checked)}
                          className="rounded border-white/10 bg-slate-900 text-[var(--accent-500)]"
                        />
                        <label htmlFor="var-req" className="text-xs font-medium text-[var(--text-secondary)]">
                          Required field (deployment configuration blocks if missing)
                        </label>
                      </div>

                      {/* Select/Region Options Manager */}
                      {['select', 'region'].includes(varType) && (
                        <div className="p-4 rounded-lg bg-black/40 border border-white/5 space-y-3">
                          <Label className="text-xs font-semibold text-indigo-400">Options Configuration</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Label (e.g. US East)"
                              value={optLabel}
                              onChange={(e) => setOptLabel(e.target.value)}
                              className="text-xs"
                            />
                            <Input
                              placeholder="Value (e.g. us-east-1)"
                              value={optValue}
                              onChange={(e) => setOptValue(e.target.value)}
                              className="text-xs font-mono"
                            />
                            <Button onClick={handleAddOption} size="sm" type="button" variant="outline">
                              Add Option
                            </Button>
                          </div>
                          {varOptions.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {varOptions.map((opt, oIdx) => (
                                <Badge key={opt.value} variant="neutral" className="gap-1 py-1 px-2.5">
                                  <span>{opt.label}: <code className="font-mono">{opt.value}</code></span>
                                  <button onClick={() => handleRemoveOption(oIdx)} className="text-red-400 hover:text-red-500 ml-1">
                                    <X className="w-3 h-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t border-white/5">
                        <Button onClick={handleSaveVariable} size="sm" className="gap-1">
                          <Check className="w-3.5 h-3.5" /> Save Variable
                        </Button>
                        <Button onClick={() => setShowVarForm(false)} size="sm" variant="ghost">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'main' && (
              <Card>
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-[var(--text-secondary)]">main.tf HCL Script</Label>
                    <Badge variant="neutral" className="font-mono text-[9px]">AWS Provider Ready</Badge>
                  </div>
                  <textarea
                    value={mainTf}
                    onChange={(e) => setMainTf(e.target.value)}
                    spellCheck={false}
                    className="min-h-[400px] w-full rounded-lg border border-[var(--border-primary)] bg-black/85 p-3.5 font-mono text-xs text-green-400 focus:outline-none"
                  />
                </CardContent>
              </Card>
            )}

            {activeTab === 'outputs' && (
              <Card>
                <CardContent className="p-5 space-y-2">
                  <Label className="text-xs text-[var(--text-secondary)]">outputs.tf HCL Script</Label>
                  <textarea
                    value={outputsTf}
                    onChange={(e) => setOutputsTf(e.target.value)}
                    spellCheck={false}
                    className="min-h-[400px] w-full rounded-lg border border-[var(--border-primary)] bg-black/85 p-3.5 font-mono text-xs text-green-400 focus:outline-none"
                  />
                </CardContent>
              </Card>
            )}

            {activeTab === 'versions' && (
              <Card>
                <CardContent className="p-5 space-y-2">
                  <Label className="text-xs text-[var(--text-secondary)]">versions.tf HCL Script</Label>
                  <textarea
                    value={versionsTf}
                    onChange={(e) => setVersionsTf(e.target.value)}
                    spellCheck={false}
                    className="min-h-[400px] w-full rounded-lg border border-[var(--border-primary)] bg-black/85 p-3.5 font-mono text-xs text-green-400 focus:outline-none"
                  />
                </CardContent>
              </Card>
            )}

            {activeTab === 'compiled' && (
              <Card>
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-[var(--text-secondary)]">Auto-compiled variables.tf (Read-only)</Label>
                    <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                      <Code2 className="w-3.5 h-3.5" />
                      Compiled from Builder
                    </div>
                  </div>
                  <textarea
                    value={variablesTf}
                    readOnly
                    spellCheck={false}
                    className="min-h-[400px] w-full rounded-lg border border-[var(--border-primary)] bg-black/90 p-3.5 font-mono text-xs text-indigo-300 focus:outline-none cursor-not-allowed"
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
