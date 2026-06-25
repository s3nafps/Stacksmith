'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Shield } from 'lucide-react';
import Link from 'next/link';

export default function PublicPricingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Navigation Header */}
      <header className="border-b border-white/5 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-white">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/15">
              <span className="text-white font-black text-sm">S</span>
            </div>
            Stacksmith
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-16 lg:py-24 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Transparent, Outcome-Based Pricing
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Choose the plan that fits your infrastructure needs. All paid subscriptions process securely through Paddle, our global Merchant of Record.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Free Tier Card */}
          <Card className="border border-white/5 bg-slate-900/40 flex flex-col justify-between hover:border-white/10 transition-all duration-300">
            <CardContent className="p-6 flex flex-col h-full justify-between space-y-6">
              <div className="space-y-2">
                <h4 className="text-base font-bold text-white">Free Sandbox</h4>
                <p className="text-[11px] text-slate-400 min-h-[48px]">
                  Ideal for developers experimenting with Terraform deployments in isolation.
                </p>
                <div className="pt-2 flex items-baseline gap-0.5">
                  <span className="text-3xl font-extrabold text-white">$0</span>
                  <span className="text-xs text-slate-500">/ mo</span>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-400 flex-1">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  Public blueprints
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  Max 3 deployments
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  Basic lint checks
                </li>
              </ul>

              <Button asChild variant="outline" className="w-full mt-6">
                <Link href="/login">Start Free</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Pro Tier Card */}
          <Card className="border border-white/5 bg-slate-900/40 flex flex-col justify-between hover:border-white/10 transition-all duration-300">
            <CardContent className="p-6 flex flex-col h-full justify-between space-y-6">
              <div className="space-y-2">
                <h4 className="text-base font-bold text-white">Developer Pro</h4>
                <p className="text-[11px] text-slate-400 min-h-[48px]">
                  Perfect for small DevOps teams needing automated continuous updates in Git.
                </p>
                <div className="pt-2 flex items-baseline gap-0.5">
                  <span className="text-3xl font-extrabold text-white">$29</span>
                  <span className="text-xs text-slate-500">/ mo</span>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-400 flex-1">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                  25 managed deployments
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                  Upgrade PR generation
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                  Security &amp; cost reports
                </li>
              </ul>

              <Button asChild className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white border-none">
                <Link href="/login">Select Pro</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Team Tier Card */}
          <Card className="border border-white/5 bg-slate-900/40 flex flex-col justify-between hover:border-white/10 transition-all duration-300">
            <CardContent className="p-6 flex flex-col h-full justify-between space-y-6">
              <div className="space-y-2">
                <h4 className="text-base font-bold text-white">Enterprise Team</h4>
                <p className="text-[11px] text-slate-400 min-h-[48px]">
                  For organizations deploying custom blueprints and compliance policies.
                </p>
                <div className="pt-2 flex items-baseline gap-0.5">
                  <span className="text-3xl font-extrabold text-white">$99</span>
                  <span className="text-xs text-slate-500">/ mo</span>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-400 flex-1">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                  Private blueprints repository
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                  Organization compliance policies
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                  Manual approval gates
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                  Up to 5 collaborative seats
                </li>
              </ul>

              <Button asChild className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white border-none">
                <Link href="/login">Select Team</Link>
              </Button>
            </CardContent>
          </Card>

          {/* MSP Tier Card */}
          <Card className="border border-white/5 bg-slate-900/40 relative flex flex-col justify-between hover:border-white/10 transition-all duration-300">
            <div className="absolute -top-2.5 right-3">
              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-2.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-wider shadow-md">
                MSP Choice
              </span>
            </div>
            <CardContent className="p-6 flex flex-col h-full justify-between space-y-6">
              <div className="space-y-2">
                <h4 className="text-base font-bold text-white">Cloud MSP</h4>
                <p className="text-[11px] text-slate-400 min-h-[48px]">
                  Tailored for consultancies managing isolated client tenants and updates.
                </p>
                <div className="pt-2 flex items-baseline gap-0.5">
                  <span className="text-3xl font-extrabold text-white">$249</span>
                  <span className="text-xs text-slate-500">/ mo</span>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-400 flex-1">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                  Isolated client workspaces
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                  Bulk upgrade campaigns
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                  White-label health reports
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                  100 managed deployments
                </li>
              </ul>

              <Button asChild className="w-full mt-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-none">
                <Link href="/login">Select MSP</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Global Payments Banner */}
        <Card className="border-indigo-500/20 bg-indigo-500/5 backdrop-blur-sm mt-8">
          <CardContent className="p-5 flex flex-col md:flex-row items-center justify-between gap-4 text-left">
            <div className="flex gap-3">
              <Shield className="w-6 h-6 text-indigo-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-white">Merchant of Record: Paddle Compliance</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  All transactions are safely handled by Paddle, ensuring full tax compliance, VAT collection, and secure payouts globally.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer Links */}
      <footer className="border-t border-white/5 py-8 mt-12 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>&copy; 2026 Stacksmith. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/refund" className="hover:text-white transition-colors">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
