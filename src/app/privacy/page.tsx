'use client';

import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-8 lg:p-16">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/pricing" className="text-xs text-indigo-400 hover:underline">
          &larr; Back to pricing
        </Link>
        <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
        <p className="text-xs text-slate-500">Last updated: June 25, 2026</p>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">1. Information We Collect</h2>
          <p className="text-xs leading-relaxed">
            We collect basic user profile information (email, profile avatar, and name) during GitHub authentication to identify your account and workspace membership.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">2. Token Storage and Encryption</h2>
          <p className="text-xs leading-relaxed">
            To integrate with your repositories, Stacksmith requests repository-scoped OAuth tokens. All access and refresh tokens are encrypted at rest using AES-256-GCM encryption algorithms. We never read or modify database code unrelated to your generated blueprints.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">3. Third Party Services</h2>
          <p className="text-xs leading-relaxed">
            We utilize **Paddle** as our payment gateway and Merchant of Record. Paddle processes your email address, billing details, and country parameters to collect local sales tax and manage subscriptions. Stacksmith does not store credit card credentials.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">4. Your Rights (GDPR / CCPA)</h2>
          <p className="text-xs leading-relaxed">
            You hold the right to access, export, or delete your account records at any time. Deleting your workspace will scrub all connected VCS tokens and configurations permanently from our database.
          </p>
        </section>
      </div>
    </div>
  );
}
