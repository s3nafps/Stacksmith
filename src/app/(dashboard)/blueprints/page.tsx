'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  Cloud,
  Shield,
  Clock,
  Network,
  KeyRound,
  HardDrive,
  Database,
  Layers,
  Activity,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface ApiBlueprint {
  slug: string;
  name: string;
  description: string;
  provider: string;
  category: string;
  difficulty: string;
  estimatedDeployTime?: string;
  tags: string[];
  versions: Array<{ version: string }>;
}

const outcomeCatalog = [
  {
    slug: 'aws-s3-static-site',
    outcome: 'Host a static website',
    name: 'Secure S3 Static Website',
    description: 'Deploy static sites with server-side encryption, versioning, access logging, and optional CloudFront CDN distribution.',
    provider: 'aws',
    category: 'Storage',
    difficulty: 'beginner',
    estimatedDeployTime: '5–10 min',
    version: '1.0.0',
    tags: ['s3', 'static-site', 'cloudfront', 'hosting'],
    icon: HardDrive,
    gradient: 'from-orange-500 to-amber-600',
    shadowColor: 'shadow-orange-500/15',
    isPremium: false,
  },
  {
    slug: 'aws-vpc-network',
    outcome: 'Build a secure networking foundation',
    name: 'AWS VPC Network',
    description: 'Multi-AZ VPC with public and private subnets, NAT gateway, internet gateway, route tables, and VPC flow logs.',
    provider: 'aws',
    category: 'Networking',
    difficulty: 'intermediate',
    estimatedDeployTime: '10–15 min',
    version: '1.0.0',
    tags: ['vpc', 'networking', 'subnets', 'nat'],
    icon: Network,
    gradient: 'from-blue-500 to-cyan-600',
    shadowColor: 'shadow-blue-500/15',
    isPremium: false,
  },
  {
    slug: 'aws-github-oidc',
    outcome: 'Give GitHub Actions secure AWS access',
    name: 'GitHub Actions OIDC Link',
    description: 'Establish secure keyless authentication from GitHub Actions to AWS using OIDC federation. Eliminate credentials storage.',
    provider: 'aws',
    category: 'Security',
    difficulty: 'intermediate',
    estimatedDeployTime: '3–5 min',
    version: '1.0.0',
    tags: ['oidc', 'github-actions', 'iam', 'security'],
    icon: KeyRound,
    gradient: 'from-violet-500 to-purple-600',
    shadowColor: 'shadow-violet-500/15',
    isPremium: false,
  },
  {
    slug: 'aws-rds-postgres',
    outcome: 'Create a production PostgreSQL database',
    name: 'RDS Aurora Serverless Postgres',
    description: 'Deploy auto-scaling Serverless v2 PostgreSQL instances across multi-AZ private subnets with daily backups and Secrets Manager integration.',
    provider: 'aws',
    category: 'Databases',
    difficulty: 'advanced',
    estimatedDeployTime: '12–18 min',
    version: '1.0.0',
    tags: ['rds', 'postgres', 'aurora', 'database'],
    icon: Database,
    gradient: 'from-pink-500 to-rose-600',
    shadowColor: 'shadow-pink-500/15',
    isPremium: true,
  },
  {
    slug: 'aws-ecs-fargate',
    outcome: 'Deploy a Docker application',
    name: 'AWS ECS Fargate Service',
    description: 'Spin up containerized applications behind public ALBs in private Fargate clusters. Logs streaming, autoscaling.',
    provider: 'aws',
    category: 'Compute',
    difficulty: 'intermediate',
    estimatedDeployTime: '8–12 min',
    version: '1.0.0',
    tags: ['ecs', 'fargate', 'containers', 'docker'],
    icon: Cloud,
    gradient: 'from-emerald-500 to-teal-600',
    shadowColor: 'shadow-emerald-500/15',
    isPremium: true,
  },
  {
    slug: 'aws-saas-starter',
    outcome: 'Create a SaaS starter infrastructure',
    name: 'SaaS Starter Composed Stack',
    description: 'Fully integrated starter architecture containing Networking VPC, ECS container cluster, Application Load Balancer, and RDS Database.',
    provider: 'aws',
    category: 'Composed',
    difficulty: 'advanced',
    estimatedDeployTime: '15–25 min',
    version: '1.0.0',
    tags: ['composed', 'saas', 'ecs', 'vpc', 'rds'],
    icon: Layers,
    gradient: 'from-indigo-500 to-sky-600',
    shadowColor: 'shadow-indigo-500/15',
    isPremium: true,
  },
];

const difficultyLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  beginner: { label: 'Beginner', variant: 'success' },
  intermediate: { label: 'Intermediate', variant: 'warning' },
  advanced: { label: 'Advanced', variant: 'error' },
};

export default function BlueprintsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [catalog, setCatalog] = useState(outcomeCatalog);

  useEffect(() => {
    fetch('/api/blueprints')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load blueprints');
        return res.json();
      })
      .then((items: ApiBlueprint[]) => {
        // Map database-loaded custom blueprints
        const dbItems = items
          .filter(item => !outcomeCatalog.some(oc => oc.slug === item.slug))
          .map(bp => {
            const isVpc = bp.slug.includes('vpc') || bp.category.toLowerCase() === 'networking';
            const isOidc = bp.slug.includes('oidc') || bp.category.toLowerCase() === 'security';
            const isCompute = bp.slug.includes('lambda') || bp.slug.includes('ecs') || bp.category.toLowerCase() === 'compute';
            
            let icon = HardDrive;
            let gradient = 'from-orange-500 to-amber-600';
            let shadowColor = 'shadow-orange-500/15';

            if (isVpc) {
              icon = Network;
              gradient = 'from-blue-500 to-cyan-600';
              shadowColor = 'shadow-blue-500/15';
            } else if (isOidc) {
              icon = KeyRound;
              gradient = 'from-violet-500 to-purple-600';
              shadowColor = 'shadow-violet-500/15';
            } else if (isCompute) {
              icon = Cloud;
              gradient = 'from-emerald-500 to-teal-600';
              shadowColor = 'shadow-emerald-500/15';
            }

            return {
              slug: bp.slug,
              outcome: `Custom org blueprint: ${bp.name}`,
              name: bp.name,
              description: bp.description,
              provider: bp.provider,
              category: bp.category,
              difficulty: bp.difficulty,
              estimatedDeployTime: bp.estimatedDeployTime ?? '5-10 min',
              version: '1.0.0',
              tags: bp.tags,
              icon,
              gradient,
              shadowColor,
              isPremium: false,
            };
          });
        setCatalog([...outcomeCatalog, ...dbItems]);
      })
      .catch((err) => {
        console.error('Error fetching blueprints:', err);
      });
  }, []);

  const categories = ['All', ...Array.from(new Set(catalog.map((bp) => bp.category)))];

  const filtered = catalog.filter((bp) => {
    const matchesSearch =
      !search ||
      bp.outcome.toLowerCase().includes(search.toLowerCase()) ||
      bp.name.toLowerCase().includes(search.toLowerCase()) ||
      bp.description.toLowerCase().includes(search.toLowerCase()) ||
      bp.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = category === 'All' || bp.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <Header
        title="Infrastructure Blueprints"
        description="Evolve cloud resources safely using outcome-driven best practices."
      />

      <div className="p-6 lg:p-8 space-y-6 page-enter">
        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <Input
              placeholder="Search by business outcome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
            <Link
              href="/blueprints/new"
              className="inline-flex items-center justify-center rounded-lg bg-[var(--accent-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-700)] cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Custom Blueprint
            </Link>
          </div>
        </div>

        {/* Categories filters */}
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 cursor-pointer ${
                category === cat
                  ? 'bg-[var(--accent-600)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Info banner */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]">
          <Shield className="w-4 h-4 text-[var(--accent-400)] shrink-0" />
          <p className="text-xs text-[var(--text-secondary)]">
            Stacksmith manages blueprint updates continuously. Apply actions run within your secure customer-owned runner environment.
          </p>
        </div>

        {/* Blueprint outcome list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((bp) => {
            const Icon = bp.icon;
            const diff = difficultyLabels[bp.difficulty] || { label: bp.difficulty, variant: 'neutral' };

            const cardContent = (
              <Card className={`card-interactive h-full flex flex-col justify-between ${bp.isPremium ? 'opacity-85 border-dashed border-[var(--border-primary)] bg-[var(--bg-secondary)]/50' : 'cursor-pointer border-[var(--border-primary)]'}`}>
                <CardContent className="p-6 flex flex-col flex-1">
                  {/* Outcome Title Banner */}
                  <div className="text-[11px] font-bold text-[var(--accent-400)] uppercase tracking-wider mb-2">
                    {bp.outcome}
                  </div>

                  {/* Logo & Version */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${bp.gradient} shadow-lg ${bp.shadowColor} transition-transform duration-200 group-hover:scale-105`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {bp.isPremium ? (
                        <Badge variant="warning" className="text-[10px]">Premium</Badge>
                      ) : (
                        <Badge variant="neutral">v{bp.version}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-2 group-hover:text-[var(--accent-600)] dark:group-hover:text-[var(--accent-400)] transition-colors">
                    {bp.name}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-6 flex-1">
                    {bp.description}
                  </p>

                  {/* Metadata line */}
                  <div className="flex items-center gap-3 mb-4 pt-4 border-t border-[var(--border-secondary)] text-[11px] text-[var(--text-tertiary)] flex-wrap">
                    <span className="uppercase font-semibold text-[var(--text-secondary)]">{bp.provider}</span>
                    <div className="w-1 h-1 rounded-full bg-[var(--border-secondary)]" />
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{bp.estimatedDeployTime}</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-[var(--border-secondary)]" />
                    <Badge variant={diff.variant}>{diff.label}</Badge>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {bp.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-[10px] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );

            if (bp.isPremium) {
              return (
                <div key={bp.slug} className="group relative block">
                  {cardContent}
                </div>
              );
            }

            return (
              <Link key={bp.slug} href={`/blueprints/${bp.slug}`} className="group relative block">
                {cardContent}
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="empty-state py-20 text-center">
            <Search className="empty-state-icon mx-auto mb-3" />
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No outcomes found</h3>
            <p className="text-sm text-[var(--text-secondary)]">Try search keywords like "website", "database", or "networking".</p>
          </div>
        )}
      </div>
    </>
  );
}
