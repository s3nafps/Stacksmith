'use client';

import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-8 lg:p-16">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/pricing" className="text-xs text-indigo-400 hover:underline">
          &larr; Back to pricing
        </Link>
        <h1 className="text-2xl font-bold text-white">Terms of Service</h1>
        <p className="text-xs text-slate-500">Last updated: June 25, 2026</p>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">1. Acceptance of Terms</h2>
          <p className="text-xs leading-relaxed">
            By accessing or using the Stacksmith platform (the "Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">2. Description of Service</h2>
          <p className="text-xs leading-relaxed">
            Stacksmith provides a continuous Terraform blueprint maintenance platform that automates pull requests and checks compatibility of cloud architectures. All subscription checkouts are handled securely via our Merchant of Record, Paddle.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">3. User Accounts & Security</h2>
          <p className="text-xs leading-relaxed">
            You are responsible for maintaining the confidentiality of your credentials and account authentication. Stacksmith encrypts your VCS access tokens securely and never stores plaintext passwords.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">4. Billing & Cancellations</h2>
          <p className="text-xs leading-relaxed">
            Payments are billed in advance on a recurring monthly subscription basis. You may cancel your subscription at any time within your settings panel. Cancellations take effect at the end of the current billing cycle.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">5. Limitation of Liability</h2>
          <p className="text-xs leading-relaxed">
            Stacksmith is an automation tool. You are responsible for inspecting, testing, and applying the generated Terraform code in your own environments. Stacksmith is not liable for cloud provider costs, service interruptions, or misconfigured infrastructure actions.
          </p>
        </section>
      </div>
    </div>
  );
}
