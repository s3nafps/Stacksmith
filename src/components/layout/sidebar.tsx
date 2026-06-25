'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Blocks,
  Rocket,
  GitBranch,
  Settings,
  Package,
  ChevronLeft,
  Menu,
  ChevronDown,
  Plus,
  Check,
  CreditCard,
  Shield,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navigation = [
  { name: 'Overview', href: '/overview', icon: LayoutDashboard },
  { name: 'Blueprints', href: '/blueprints', icon: Blocks },
  { name: 'Deployments', href: '/deployments', icon: Rocket },
  { name: 'Connections', href: '/connections', icon: GitBranch },
  { name: 'Policies', href: '/settings/policies', icon: Shield },
  { name: 'Billing', href: '/settings/billing', icon: CreditCard },
  { name: 'Settings', href: '/settings', icon: Settings },
];

function setCookie(name: string, val: string) {
  document.cookie = `${name}=${val}; path=/; max-age=31536000; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = typeof document !== 'undefined' ? document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)')) : null;
  return match ? match[2] : null;
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Workspace states
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch('/api/workspaces');
      if (!res.ok) throw new Error('Failed to fetch workspaces');
      const data = await res.json();
      setWorkspaces(data);

      const savedWpId = getCookie('activeWorkspaceId');
      const active = data.find((w: any) => w.id === savedWpId) || data[0];
      if (active) {
        setActiveWorkspace(active);
        if (!savedWpId || savedWpId !== active.id) {
          setCookie('activeWorkspaceId', active.id);
        }
      }
    } catch (err) {
      console.error('Error fetching workspaces:', err);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleWorkspaceSwitch = (id: string) => {
    setCookie('activeWorkspaceId', id);
    setShowDropdown(false);
    window.location.reload();
  };

  const handleCreateWorkspace = async () => {
    try {
      setCreateLoading(true);
      setCreateError('');
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWorkspaceName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create workspace');
      }

      setCookie('activeWorkspaceId', data.id);
      setShowCreateModal(false);
      setNewWorkspaceName('');
      window.location.reload();
    } catch (err: any) {
      setCreateError(err.message || 'An error occurred');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-primary)] shadow-md"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5 text-[var(--text-primary)]" />
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'sidebar hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-out',
          collapsed ? 'w-[68px]' : 'w-[240px]'
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-[60px] px-4 border-b border-[var(--sidebar-border)] shrink-0">
          <Link href="/overview" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-500)] to-[var(--accent-700)] shadow-lg shadow-[var(--accent-500)]/20 animate-pulse">
              <Package className="w-4.5 h-4.5 text-white" />
            </div>
            {!collapsed && (
              <span className="text-[15px] font-semibold text-white tracking-tight">
                Stacksmith
              </span>
            )}
          </Link>
        </div>

        {/* Workspace Switcher */}
        {!collapsed && (
          <div className="px-3 py-3 border-b border-[var(--sidebar-border)] relative shrink-0">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-primary)] hover:border-[var(--accent-500)] transition-all duration-200 text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--accent-400)] shrink-0 font-bold text-[10px] uppercase">
                  {activeWorkspace?.name?.substring(0, 2) || 'WP'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {activeWorkspace?.name || 'Loading...'}
                  </p>
                  <p className="text-[9px] text-[var(--text-tertiary)] uppercase font-semibold tracking-wider">
                    {activeWorkspace?.billingPlan || 'free'} plan
                  </p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors shrink-0 ml-1" />
            </button>

            {showDropdown && (
              <div className="absolute left-3 right-3 mt-1 py-1 z-50 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-primary)] shadow-xl animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="max-h-[180px] overflow-y-auto">
                  {workspaces.map((wp) => (
                    <button
                      key={wp.id}
                      onClick={() => handleWorkspaceSwitch(wp.id)}
                      className={cn(
                        "flex items-center justify-between w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer",
                        wp.id === activeWorkspace?.id && "bg-[var(--bg-secondary)] text-[var(--accent-400)] font-semibold"
                      )}
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <div className="flex items-center justify-center w-5 h-5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-[10px] uppercase font-bold shrink-0">
                          {wp.name.substring(0, 2)}
                        </div>
                        <span className="truncate">{wp.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {wp.billingPlan === 'pro' && (
                          <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-[var(--accent-500)]/10 text-[var(--accent-400)] border border-[var(--accent-500)]/20 uppercase">
                            Pro
                          </span>
                        )}
                        {wp.id === activeWorkspace?.id && (
                          <Check className="w-3.5 h-3.5 text-[var(--accent-400)]" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="border-t border-[var(--border-secondary)] pt-1 mt-1 px-1">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setShowCreateModal(true);
                    }}
                    className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent-400)] hover:bg-[var(--bg-secondary)] rounded-md transition-all text-left cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Workspace
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className={cn('mb-3 px-3', collapsed && 'px-0 text-center')}>
            {!collapsed && (
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-500)]">
                Platform
              </span>
            )}
          </div>

          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'sidebar-item relative',
                  isActive && 'active',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? item.name : undefined}
              >
                <Icon className={cn('w-[18px] h-[18px] shrink-0', isActive && 'text-[var(--accent-400)]')} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-[var(--sidebar-border)] shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'sidebar-item w-full',
              collapsed && 'justify-center px-2'
            )}
          >
            <ChevronLeft
              className={cn(
                'w-[18px] h-[18px] shrink-0 transition-transform duration-200',
                collapsed && 'rotate-180'
              )}
            />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-primary)] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">Create Workspace</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Workspaces isolate your repositories, blueprints, and deployments.
            </p>
            {createError && (
              <div className="mb-4 p-3 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/20 text-xs text-[var(--error)]">
                {createError}
              </div>
            )}
            <div className="space-y-3 mb-6">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
                Workspace Name
              </label>
              <input
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="e.g. Acme Corp Infrastructure"
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-500)] transition-colors"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewWorkspaceName('');
                  setCreateError('');
                }}
                className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateWorkspace}
                disabled={createLoading || !newWorkspaceName.trim()}
                className="px-3 py-2 rounded-lg bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-xs text-white font-medium transition-all disabled:opacity-50 cursor-pointer"
              >
                {createLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

