'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Bell, LogOut, Settings, CreditCard, User, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Header({ title, description }: { title: string; description?: string }) {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  // Popover States
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  // Mock Notifications
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Pull Request Open',
      desc: 'PR #12 generated for S3 Static Website in production.',
      time: '10m ago',
      unread: true,
    },
    {
      id: 2,
      title: 'Validation Passed',
      desc: 'Terraform formatting and security check successfully passed.',
      time: '1h ago',
      unread: true,
    },
    {
      id: 3,
      title: 'Subscription Active',
      desc: 'Workspace default-workspace upgraded to Enterprise Pro.',
      time: '1d ago',
      unread: false,
    },
  ]);

  useEffect(() => {
    setMounted(true);

    // Close dropdowns on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="flex items-center justify-between h-[60px] px-6 lg:px-8 border-b border-[var(--border-primary)] bg-[var(--bg-primary)] shrink-0 z-40 relative">
      <div className="flex flex-col">
        <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-tight">{title}</h1>
        {description && (
          <p className="text-[13px] text-[var(--text-secondary)] leading-tight mt-0.5">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
          className="cursor-pointer"
        >
          {mounted && theme === 'dark' ? (
            <Sun className="h-4 w-4 text-[var(--text-primary)]" />
          ) : (
            <Moon className="h-4 w-4 text-[var(--text-primary)]" />
          )}
        </Button>

        {/* Notifications Popover */}
        <div className="relative" ref={notificationsRef}>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowAccountMenu(false);
            }}
            aria-label="Notifications"
            className="relative cursor-pointer"
          >
            <Bell className="h-4 w-4 text-[var(--text-primary)]" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--error)] ring-2 ring-[var(--bg-primary)]" />
            )}
          </Button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-primary)] shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-secondary)]">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Notifications ({unreadCount})
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] font-semibold text-[var(--accent-400)] hover:underline cursor-pointer"
                  >
                    Mark read
                  </button>
                  <button
                    onClick={clearNotifications}
                    className="text-[10px] font-semibold text-[var(--text-tertiary)] hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="mt-2.5 space-y-2 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-[var(--text-tertiary)] text-center py-6">
                    All caught up! No notifications.
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        'p-2.5 rounded-lg border text-left transition-colors relative',
                        n.unread
                          ? 'bg-[var(--accent-500)]/5 border-[var(--accent-500)]/15'
                          : 'bg-transparent border-[var(--border-secondary)]'
                      )}
                    >
                      {n.unread && (
                        <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-[var(--accent-400)]" />
                      )}
                      <p className="text-xs font-semibold text-[var(--text-primary)] pr-3">
                        {n.title}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        {n.desc}
                      </p>
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{n.time}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Account Menu Popover */}
        <div className="relative" ref={accountRef}>
          <button
            onClick={() => {
              setShowAccountMenu(!showAccountMenu);
              setShowNotifications(false);
            }}
            className="w-8 h-8 rounded-xl overflow-hidden bg-gradient-to-br from-[var(--accent-400)] to-[var(--accent-600)] flex items-center justify-center text-white text-xs font-semibold ml-1 cursor-pointer border border-[var(--border-primary)] hover:border-[var(--accent-500)] transition-all"
            aria-label="Account Menu"
          >
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || 'User avatar'}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{session?.user?.name?.[0] || 'D'}</span>
            )}
          </button>

          {showAccountMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-primary)] shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* User Bio */}
              <div className="px-3 py-2 border-b border-[var(--border-secondary)] mb-1 text-left">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                  {session?.user?.name || 'Demo Architect'}
                </p>
                <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">
                  {session?.user?.email || 'demo@infrapack.dev'}
                </p>
              </div>

              {/* Navigation Items */}
              <Link
                href="/settings"
                onClick={() => setShowAccountMenu(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors text-left"
              >
                <User className="w-4 h-4 text-[var(--text-tertiary)]" />
                Profile Settings
              </Link>
              <Link
                href="/settings/billing"
                onClick={() => setShowAccountMenu(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors text-left"
              >
                <CreditCard className="w-4 h-4 text-[var(--text-tertiary)]" />
                Billing & Plan
              </Link>
              <Link
                href="/settings"
                onClick={() => setShowAccountMenu(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors text-left"
              >
                <Settings className="w-4 h-4 text-[var(--text-tertiary)]" />
                Preferences
              </Link>

              <div className="border-t border-[var(--border-secondary)] my-1 pt-1">
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
