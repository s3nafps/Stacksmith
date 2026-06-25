'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Package, ShieldCheck, Activity, Zap } from 'lucide-react';
import { useState } from 'react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const isMock = process.env.NEXT_PUBLIC_MOCK_GITHUB === 'true';

  const handleSignIn = async () => {
    setLoading(true);
    try {
      if (isMock) {
        await signIn('credentials', { callbackUrl: '/overview' });
      } else {
        await signIn('github', { callbackUrl: '/overview' });
      }
    } catch (error) {
      console.error('Sign-in failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-black text-white flex flex-col justify-between p-6 md:p-12 relative overflow-hidden">
      {/* Background Decorative Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[150px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3 relative z-10">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
          <Package className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
          Stacksmith
        </span>
      </div>

      {/* Hero & Login Section */}
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center my-auto relative z-10 py-12">
        {/* Left Column: Value Prop */}
        <div className="space-y-8 text-left">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-300">
              <Zap className="w-3.5 h-3.5" />
              SaaS Blueprint Maintenance
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] bg-gradient-to-br from-white via-slate-100 to-indigo-400 bg-clip-text text-transparent">
              Verified IaC Blueprints.
              <br />
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Safely Upgraded in Git.
              </span>
            </h1>
            <p className="text-slate-400 text-base md:text-lg max-w-lg leading-relaxed">
              Stacksmith rolls out secure, validated AWS Terraform configurations. Track module updates, generate pull requests, and maintain code sanity automatically.
            </p>
          </div>

          {/* Features Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-500/10 shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Customer-Owned Runner</h4>
                <p className="text-xs text-slate-400 mt-0.5">CI executes in your secure env.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-500/10 shrink-0 mt-0.5">
                <Activity className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Safe Auto-Upgrades</h4>
                <p className="text-xs text-slate-400 mt-0.5">Continuous compatibility checks.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sign In Card */}
        <div className="flex justify-center lg:justify-end">
          <Card className="w-full max-w-md border-white/10 bg-slate-950/40 backdrop-blur-xl shadow-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
            <CardContent className="p-0 space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-white tracking-tight">Access the Platform</h3>
                <p className="text-xs text-slate-400">
                  {isMock
                    ? 'Use the simulated GitHub connection to get started instantly.'
                    : 'Connect your GitHub account to manage infrastructure.'}
                </p>
              </div>

              {/* Login Button */}
              <Button
                size="lg"
                onClick={handleSignIn}
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-medium shadow-xl shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all py-6 rounded-xl flex items-center justify-center gap-3 cursor-pointer"
              >
                {loading ? (
                  <span className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    <span>{isMock ? 'Sign in with Demo Account' : 'Sign in with GitHub'}</span>
                  </>
                )}
              </Button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  Deployment Sandbox
                </span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                By signing in, you agree to connect your repositories. Stacksmith only accesses repositories you explicitly grant access to.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer info */}
      <div className="flex flex-col sm:flex-row justify-between items-center border-t border-white/5 pt-6 text-xs text-slate-500 relative z-10 gap-2">
        <p>© 2026 Stacksmith. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-slate-400">Documentation</a>
          <a href="#" className="hover:text-slate-400">Security Policy</a>
          <a href="#" className="hover:text-slate-400">Architecture</a>
        </div>
      </div>
    </main>
  );
}
