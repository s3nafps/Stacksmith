'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Plus,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface Repository {
  id: number;
  fullName: string;
  isPrivate: boolean;
  description: string | null;
  language: string | null;
  htmlUrl: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function ConnectionsPage() {
  const { data: session } = useSession();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  
  // App onboarding & mock modal states
  const [showMockModal, setShowMockModal] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [installingMock, setInstallingMock] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchRepos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/github/repositories');
      if (!res.ok) throw new Error('Failed to fetch repositories. Please connect your GitHub account.');
      const data = await res.json();
      setRepos(data);
      setError('');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    try {
      await fetchRepos();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to sync repositories'));
    } finally {
      setSyncing(false);
    }
  };

  const handleInstallMock = async () => {
    if (!orgName.trim()) return;
    setInstallingMock(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/github/installations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName: orgName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to install mock app');

      setSuccessMessage(`Successfully simulated GitHub App installation on "${orgName.trim()}"!`);
      setShowMockModal(false);
      setOrgName('');
      await fetchRepos();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Mock installation failed'));
    } finally {
      setInstallingMock(false);
    }
  };

  useEffect(() => {
    fetchRepos();

    // Check for success param in URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('success') === 'github-app') {
        setSuccessMessage('GitHub App successfully installed and repositories synced!');
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  return (
    <>
      <Header
        title="Connections"
        description="Manage your connected VCS integrations and installations"
      />

      <div className="p-6 lg:p-8 space-y-6 page-enter max-w-4xl">
        {successMessage && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Connection status card */}
        <Card className="border-white/5 bg-slate-950/20 backdrop-blur-md">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 border border-white/10 text-white">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">GitHub</h3>
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </Badge>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Connected as <span className="font-semibold text-[var(--text-primary)]">{session?.user?.name || session?.user?.email || 'GitHub user'}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowMockModal(true)} className="gap-1 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/10">
                <Plus className="w-3.5 h-3.5" />
                Add Mock Installation
              </Button>
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing || loading} className="gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                Sync Repos
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Real App Onboarding Card */}
        <Card className="border-white/5 bg-slate-950/10">
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[var(--text-secondary)] fill-current" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Install VCS GitHub App
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                To link real repositories and automate Git pull request flows, install the Stacksmith GitHub App.
              </p>
            </div>
            <div className="flex gap-3">
              <Button asChild size="sm" variant="outline" className="gap-1">
                <a
                  href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'stacksmith'}/installations/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Install Real App <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info banner */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-xs text-[var(--text-secondary)]">
            Stacksmith uses GitHub Apps to gain read and write permissions to repositories. Access tokens are encrypted using AES-256-GCM.
          </p>
        </div>

        {/* Repositories catalog */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Imported Repositories</h3>
              <Badge variant="neutral">{repos.length} total</Badge>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2">
                <span className="w-5 h-5 rounded-full border-2 border-[var(--accent-500)] border-t-transparent animate-spin" />
                <span className="text-xs text-[var(--text-secondary)]">Syncing repositories...</span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-[var(--error-muted)] text-[var(--error)] text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : repos.length === 0 ? (
              <div className="text-center py-12 text-xs text-[var(--text-tertiary)]">
                No repositories configured. Click Add Mock Installation or Sync Repos.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-secondary)]">
                {repos.map((repo) => (
                  <div key={repo.id} className="flex items-start justify-between py-3.5 first:pt-0 last:pb-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{repo.fullName}</span>
                        {repo.isPrivate && <Badge variant="neutral">Private</Badge>}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] max-w-xl">{repo.description || 'No description provided'}</p>
                      {repo.language && (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className="w-2 h-2 rounded-full bg-[var(--accent-500)]" />
                          <span className="text-[10px] text-[var(--text-tertiary)]">{repo.language}</span>
                        </div>
                      )}
                    </div>
                    <Button asChild variant="ghost" size="icon-sm">
                      <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer" title="View on GitHub">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mock Installation Modal */}
      {showMockModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowMockModal(false)}
              className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                Simulate GitHub App Installation
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Enter an organization name to simulate installing the VCS GitHub App. This registers mock repositories in the database.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label htmlFor="org-name" className="text-xs font-semibold text-[var(--text-secondary)]">
                  Organization / Account Name
                </label>
                <Input
                  id="org-name"
                  value={orgName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrgName(e.target.value)}
                  placeholder="e.g. acme-corp"
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleInstallMock} loading={installingMock} className="flex-1">
                  Install Mock App
                </Button>
                <Button onClick={() => setShowMockModal(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
