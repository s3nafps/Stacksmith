'use client';

import Link from 'next/link';

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-8 lg:p-16">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/pricing" className="text-xs text-indigo-400 hover:underline">
          &larr; Back to pricing
        </Link>
        <h1 className="text-2xl font-bold text-white">Refund Policy</h1>
        <p className="text-xs text-slate-500">Last updated: June 25, 2026</p>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">1. Refund Guarantee</h2>
          <p className="text-xs leading-relaxed">
            Stacksmith stands behind our automation services. If you are not satisfied with your active billing plan subscription, we offer a **14-day refund policy** from the initial date of purchase.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">2. Process a Refund</h2>
          <p className="text-xs leading-relaxed">
            To request a refund, please contact our support team or initiate a refund directly through the checkout invoice received from **Paddle**, our global Merchant of Record. Refund payouts will be credited to the original bank account or payment method within 5 to 10 business days.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">3. Exclusions</h2>
          <p className="text-xs leading-relaxed">
            Refunds are limited to the initial subscription period (first month). Payouts cannot be processed for renewals or accounts that have violated Stacksmith terms of use (e.g. workspace abuse or resource limit circumventing).
          </p>
        </section>
      </div>
    </div>
  );
}
