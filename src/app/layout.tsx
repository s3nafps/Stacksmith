import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'InfraPack — Production-Ready Terraform Blueprints',
  description:
    'Browse, configure, and deploy curated Terraform blueprints through GitHub pull requests. No state hosting, no credential storage.',
  keywords: ['terraform', 'infrastructure', 'aws', 'blueprints', 'devops', 'iac'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
