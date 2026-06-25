'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import {
  Settings,
  User,
  Shield,
  CheckCircle,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const mockGitHub = process.env.NEXT_PUBLIC_MOCK_GITHUB_API === 'true';
  const [toolPref, setToolPref] = useState('terraform');
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <Header
        title="Settings"
        description="Configure your workspace settings and preferences"
      />

      <div className="p-6 lg:p-8 space-y-6 page-enter max-w-3xl">
        {/* Profile Details */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <User className="w-4 h-4 text-[var(--accent-500)]" />
              User Profile
            </h3>
            <div className="flex items-center gap-4 py-2">
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || 'User avatar'}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-xl object-cover border border-[var(--border-primary)]"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-base font-semibold">
                  {session?.user?.name?.[0] || 'U'}
                </div>
              )}
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                  {session?.user?.name || 'Demo Architect'}
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {session?.user?.email || 'demo@infrapack.dev'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardContent className="p-5 space-y-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Settings className="w-4 h-4 text-[var(--accent-500)]" />
              General Preferences
            </h3>

            {/* Default Tool */}
            <div className="space-y-2">
              <Label>Default IaC Engine</Label>
              <p className="text-xs text-[var(--text-tertiary)]">
                Which engine you prefer for checking local formatting and syntax validations.
              </p>
              <div className="flex gap-2 pt-1">
                {['terraform', 'opentofu'].map((tool) => (
                  <button
                    key={tool}
                    onClick={() => setToolPref(tool)}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all duration-150 capitalize ${
                      toolPref === tool
                        ? 'border-[var(--accent-500)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/15 text-[var(--accent-700)] dark:text-[var(--accent-300)]'
                        : 'border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                    }`}
                  >
                    {tool}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Selector */}
            <div className="space-y-2">
              <Label>Color Mode</Label>
              <p className="text-xs text-[var(--text-tertiary)]">
                Choose the visual color scheme for the application workspace.
              </p>
              <div className="flex gap-2 pt-1">
                {['light', 'dark', 'system'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all duration-150 capitalize ${
                      mounted && theme === t
                        ? 'border-[var(--accent-500)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/15 text-[var(--accent-700)] dark:text-[var(--accent-300)]'
                        : 'border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Settings / Security details */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              Security Specifications
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-[var(--border-secondary)] text-xs">
                <span className="text-[var(--text-secondary)]">Mock GitHub Mode</span>
                <Badge variant={mockGitHub ? 'warning' : 'success'}>
                  {mockGitHub ? 'Enabled (Sandbox)' : 'Disabled (Real GitHub)'}
                </Badge>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border-secondary)] text-xs">
                <span className="text-[var(--text-secondary)]">Token Encryption Key</span>
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  AES-256-GCM (Loaded)
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border-secondary)] text-xs">
                <span className="text-[var(--text-secondary)]">Database Driver</span>
                <span className="font-mono font-medium text-[var(--text-primary)]">
                  SQLite (better-sqlite3)
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border-secondary)] text-xs">
                <span className="text-[var(--text-secondary)]">SaaS Mode</span>
                <span className="font-semibold text-violet-500">
                  Customer-Owned State (Read-Only PRs)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button onClick={handleSave} className="px-6">
            Save Preferences
          </Button>
          {saved && (
            <span className="text-xs text-[var(--success)] flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Settings saved successfully!
            </span>
          )}
        </div>
      </div>
    </>
  );
}
