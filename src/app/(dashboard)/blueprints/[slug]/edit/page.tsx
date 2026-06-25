'use client';

import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Code2,
  Trash,
  Settings,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
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

export default function EditBlueprintPage({ params }: PageProps) {
  const { slug } = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  // Blueprint state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [tags, setTags] = useState('');
  const [architectureSummary, setArchitectureSummary] = useState('');
  const [securityNotes, setSecurityNotes] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [versions, setVersions] = useState<any[]>([]);

  // Code files state
  const [versionsTf, setVersionsTf] = useState('');
  const [variablesTf, setVariablesTf] = useState('');
  const [mainTf, setMainTf] = useState('');
  const [outputsTf, setOutputsTf] = useState('');
  
  // Variables list state
  const [variables, setVariables] = useState<VisualVariable[]>([]);
  const [activeTab, setActiveTab] = useState<'visual' | 'main' | 'outputs' | 'versions' | 'compiled' | 'releases'>('visual');

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
  const [optLabel, setOptLabel] = useState('');
  const [optValue, setOptValue] = useState('');

  // New version release state
  const [newVersionString, setNewVersionString] = useState('');
  const [releasing, setReleasing] = useState(false);

  // General states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Sync visual variables changes to compiled variables.tf HCL
  useEffect(() => {
    if (variables.length > 0) {
      setVariablesTf(compileVariablesTf(variables));
    }
  }, [variables]);

  // Load blueprint details on mount or session resolution
  useEffect(() => {
    if (!session?.user?.id) return;

    const loadDetails = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('/api/blueprints');
        if (!res.ok) throw new Error('Failed to load blueprints list');
        const items = await res.json();
        
        const bp = items.find((item: any) => item.slug === slug);
        if (!bp) {
          throw new Error(`Blueprint ${slug} not found`);
        }

        if (bp.ownerId !== session?.user?.id) {
          throw new Error('You do not have permission to edit this blueprint');
        }

        setName(bp.name);
        setDescription(bp.description);
        setCategory(bp.category);
        setDifficulty(bp.difficulty);
        setTags(bp.tags.join(','));
        setOwnerId(bp.ownerId);
        setVersions(bp.versions || []);

        const latestVersion = bp.versions[bp.versions.length - 1];
        if (latestVersion) {
          setVariables(latestVersion.inputs || []);
          setArchitectureSummary(bp.architectureSummary || latestVersion.architectureSummary || '');
          setSecurityNotes(bp.securityNotes || latestVersion.securityNotes || '');
          setVersionsTf(latestVersion.files?.['versions.tf'] || '');
          setMainTf(latestVersion.files?.['main.tf'] || '');
          setOutputsTf(latestVersion.files?.['outputs.tf'] || '');
        }

      } catch (err: any) {
        setError(err.message || 'An error occurred while loading');
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [slug, session]);

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

  const handleSaveBlueprint = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/blueprints/custom/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name,
          description,
          category,
          difficulty,
          estimatedDeployTime: '10-20 minutes',
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
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
      if (!res.ok) throw new Error(data.error || 'Failed to save changes');

      setMessage('Changes saved successfully and verified via Terraform.');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save blueprint'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlueprint = async () => {
    if (!confirm('Are you absolutely sure you want to delete this custom blueprint? This action is permanent.')) return;
    
    setDeleting(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/blueprints/custom/${slug}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete blueprint');
      }

      router.push('/blueprints');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to delete blueprint'));
      setDeleting(false);
    }
  };

  const handleReleaseVersion = async () => {
    if (!newVersionString.trim() || !/^\d+\.\d+\.\d+$/.test(newVersionString.trim())) {
      setError('Please enter a valid semver version, e.g. 1.1.0');
      return;
    }

    setReleasing(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/blueprints/custom/${slug}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: newVersionString.trim(),
          blueprintInput: {
            slug,
            name,
            description,
            category,
            difficulty,
            tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
            architectureSummary,
            securityNotes,
            versionsTf,
            variablesTf,
            mainTf,
            outputsTf,
            inputs: variables,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to release new version');

      setMessage(`Published version ${newVersionString} successfully.`);
      setVersions(data.versions || []);
      setNewVersionString('');
      setActiveTab('visual');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to release version'));
    } finally {
      setReleasing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-2">
        <span className="w-6 h-6 rounded-full border-2 border-[var(--accent-500)] border-t-transparent animate-spin" />
        <span className="text-xs text-[var(--text-secondary)]">Loading blueprint details...</span>
      </div>
    );
  }

  return (
    <>
      <Header
        title={`Edit Blueprint: ${name || slug}`}
        description="Modify metadata, update variable schemas, edit Terraform code, and publish new versions"
      />

      <div className="p-6 lg:p-8 space-y-6 max-w-7xl page-enter">
        <div className="flex items-center justify-between">
          <Link href={`/blueprints/${slug}`} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            &larr; Back to detail view
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)]">Owner: You</span>
            <Badge variant="neutral">Active</Badge>
          </div>
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
                <Label htmlFor="slug">Slug (Immutable)</Label>
                <Input id="slug" value={slug} disabled className="mt-1 font-mono text-xs bg-slate-900/50 cursor-not-allowed" />
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
                    onChange={(e) => setDifficulty(e.target.value as any)}
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

              <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                <Button onClick={handleSaveBlueprint} loading={saving} className="w-full">
                  Save Custom Blueprint
                </Button>
                <Button
                  onClick={handleDeleteBlueprint}
                  disabled={deleting}
                  variant="ghost"
                  className="w-full text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-1.5"
                >
                  <Trash className="w-4 h-4" />
                  Delete Blueprint
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
                { id: 'releases', label: 'Releases / Versioning' },
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
                          Required field
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

            {activeTab === 'releases' && (
              <Card className="border-white/5 bg-slate-950/20 backdrop-blur-md">
                <CardContent className="p-5 space-y-6">
                  {/* Create New Version */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Publish a New Version</h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Increment the semver value (e.g., 1.1.0) to register a new immutable release of this blueprint.
                      </p>
                    </div>

                    <div className="flex gap-2 max-w-md items-end">
                      <div className="flex-1">
                        <Label htmlFor="new-version">Semver Version</Label>
                        <Input
                          id="new-version"
                          value={newVersionString}
                          onChange={(e) => setNewVersionString(e.target.value)}
                          placeholder="e.g. 1.1.0"
                          className="mt-1"
                        />
                      </div>
                      <Button onClick={handleReleaseVersion} loading={releasing} className="gap-1">
                        Publish Version
                      </Button>
                    </div>
                  </div>

                  {/* History of versions */}
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Version History</h4>
                    <div className="divide-y divide-white/5">
                      {versions.map((v: any) => (
                        <div key={v.version} className="flex justify-between items-center py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white font-mono">{v.version}</span>
                            {v.isLatest && <Badge variant="success">Latest</Badge>}
                          </div>
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            Published {new Date(v.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
