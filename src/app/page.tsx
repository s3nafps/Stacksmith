import { auth } from '@/auth';
import Link from 'next/link';
import {
  Package,
  ArrowRight,
  Shield,
  Zap,
  Building,
  Terminal,
  GitPullRequest,
  CheckCircle,
  GitBranch,
  Activity,
  UserCheck,
} from 'lucide-react';

export default async function Home() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden selection:bg-indigo-500/30">
      {/* Decorative background glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-white/5 backdrop-blur-md sticky top-0 z-50 bg-slate-950/70">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/20">
              <Package className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-[15px] font-bold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
              Stacksmith
            </span>
          </div>

          <nav className="flex items-center gap-4">
            <Link
              href={isLoggedIn ? '/overview' : '/login'}
              className="text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Console
            </Link>
            <Link
              href={isLoggedIn ? '/overview' : '/login'}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all hover:scale-[1.02] flex items-center gap-1 group"
            >
              {isLoggedIn ? 'Dashboard' : 'Sign In'}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-5xl mx-auto px-6 pt-24 pb-16 text-center space-y-8 z-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-300 animate-pulse">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            Evolve from Code Gen to Continuous Blueprint Maintenance
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] bg-gradient-to-b from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
            Production-Ready Terraform Blueprints.
            <br />
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Safely Maintained Over Time.
            </span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Stacksmith gives small DevOps teams and MSPs verified Terraform blueprints, opens validated pull requests, and automatically rolls out safe upgrades when provider, module, or architecture requirements evolve.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link
            href={isLoggedIn ? '/overview' : '/login'}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-sm font-semibold text-white shadow-xl shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
          >
            {isLoggedIn ? 'Go to Dashboard' : 'Get Started for Free'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-center"
          >
            Learn More
          </a>
        </div>

        {/* Console Preview / Glassmorphic card */}
        <div className="pt-8 max-w-4xl mx-auto">
          <div className="rounded-xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-2.5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/35 to-transparent" />
            {/* Mock terminal header */}
            <div className="flex items-center justify-between px-3 pb-2.5 border-b border-white/5">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-[10px] text-slate-500 font-mono">stacksmith-upgrade-bot.log</span>
            </div>
            {/* Mock logs content */}
            <div className="p-4 text-left font-mono text-xs text-slate-400 space-y-1.5 overflow-x-auto select-none bg-slate-950/60 rounded-lg mt-2">
              <p className="text-slate-500">// Upgrading AWS VPC from version 1.2.0 to 2.0.0...</p>
              <p><span className="text-emerald-500">[Info]</span> Comparing customer configurations with new version templates...</p>
              <p><span className="text-indigo-400">[Upgrade Bot]</span> Regenerating managed files, keeping manually edited files intact.</p>
              <p>- Checking OpenTofu &amp; Terraform compatibility (v1.8 - v1.14)...</p>
              <p>- Evaluating estimated cost diff (via simulated Infracost): +$7/month.</p>
              <p>- Running security scans: 42 passed, 0 security warnings.</p>
              <p className="text-emerald-500">[Success] Pull Request generated successfully on mock-org/infrastructure (#14)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5 space-y-16 relative z-10">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Evolve to Continuous Blueprint Maintenance
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
            Stacksmith packages best-practice AWS templates, validates inputs, and ensures they stay clean and updated.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="rounded-xl border border-white/5 bg-slate-900/30 p-6 space-y-4 hover:border-indigo-500/20 hover:bg-slate-900/40 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-100">Customer-Owned Execution</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No cloud credentials or state files stored in Stacksmith. Your own GitHub Action runs format, check, and validation tests, reporting results back securely.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-xl border border-white/5 bg-slate-900/30 p-6 space-y-4 hover:border-indigo-500/20 hover:bg-slate-900/40 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-100">Continuous Upgrade Bot</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automatically track module, provider, and tool version updates. Stacksmith detects changes, runs local diffs, and opens safe upgrade PRs with detailed changelogs.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-xl border border-white/5 bg-slate-900/30 p-6 space-y-4 hover:border-indigo-500/20 hover:bg-slate-900/40 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-100">Blueprint Trust Panel</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Know who maintains the code, when it was last tested, provider constraints, and baseline pricing before you click generate.
            </p>
          </div>
        </div>
      </section>

      {/* Integration walkthrough / CTA banner */}
      <section className="max-w-5xl mx-auto px-6 pb-24 z-10 relative">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900/60 to-indigo-950/20 backdrop-blur-xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
          <div className="space-y-3 text-left">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight">Deploy & Maintain Safe Cloud Infrastructure</h3>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md leading-relaxed">
              Connect your repositories and begin deploying blueprints that remain production-ready month after month.
            </p>
          </div>
          <Link
            href={isLoggedIn ? '/overview' : '/login'}
            className="w-full md:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white shadow-xl shadow-indigo-600/15 transition-all text-center flex items-center justify-center gap-2 group shrink-0"
          >
            Launch Console
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 text-center text-xs text-slate-500 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 Stacksmith. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-300">Documentation</a>
            <a href="#" className="hover:text-slate-300">Security Specs</a>
            <a href="#" className="hover:text-slate-300">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
