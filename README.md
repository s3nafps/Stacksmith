# Stacksmith

Stacksmith is an open-source, self-hostable platform for generating and maintaining curated Terraform infrastructure blueprints through reviewable GitHub pull requests.

It is for platform and application teams that want repeatable infrastructure changes without giving a web app permanent cloud credentials. Stacksmith generates files, redacts sensitive inputs, and opens pull requests. It does not apply Terraform, host Terraform state, or execute arbitrary customer Terraform on the application host.

Stacksmith is licensed under the [Apache License 2.0](LICENSE).

## Release Status

Stacksmith v0.1.0 is an experimental OSS preview. It is suitable for local evaluation and experimental single-instance self-hosting. Terraform generation and blueprint contribution are available. Real GitHub App onboarding is under development. Billing and automated upgrades are disabled. Production multi-tenant use is not yet recommended.

## Feature Status

| Feature | Status | Notes |
| --- | --- | --- |
| Blueprint catalog | Stable | Curated blueprints live in `blueprints/`. |
| Terraform generation | Stable | Generates Terraform/OpenTofu files and `terraform.tfvars`. |
| Secret redaction | Stable | Sensitive inputs are omitted from tfvars and redacted in previews. |
| Workspace support | Experimental | RBAC exists; keep route-level checks when changing APIs. |
| Mock GitHub provider | Mock/demo | Requires `MOCK_GITHUB_API=true`; blocked in production by default. |
| Real GitHub OAuth provider | Experimental | OAuth sign-in is supported when credentials are configured. |
| GitHub App onboarding | Mock/demo | Callback is simulated only in demo mode. |
| Pull-request creation | Experimental | Uses provider abstraction; validation must pass first. |
| Terraform validation | Experimental | Runs `fmt`, `init -backend=false`, and `validate`; custom blueprints are disabled. |
| Custom blueprints | Experimental | Creation exists; host-side validation is disabled pending sandboxing. |
| Upgrade detection | Planned | Upgrade execution is disabled. |
| Upgrade pull requests | Disabled | Not production-ready. |
| Paddle billing | Planned | Self-hosted edition does not require Paddle. |
| PostgreSQL support | Planned | Prisma currently uses SQLite. |
| Self-hosting | Experimental | SQLite works for local/small single-instance installs. |

## Screenshots

Place screenshots in `docs/images/` before publishing release notes or a public landing page. Do not commit fabricated screenshots.

## Architecture

Browser -> Next.js App Router routes -> authentication and workspace RBAC -> deployment service -> blueprint loader -> generator -> validation abstraction -> GitHub provider -> customer repository pull request.

Main components:

- `src/app/`: UI and API route handlers.
- `src/features/blueprints/`: catalog and custom blueprint loading.
- `src/features/generator/`: file generation, tfvars, and `.stacksmith.json` manifests. Existing `.infrapack.json` manifests remain readable for compatibility.
- `src/features/github/`: mock and real provider abstraction.
- `src/features/validation/`: Terraform/OpenTofu validation without apply.
- `src/features/deployments/`: deployment workflow, RBAC-sensitive state changes, PR creation.
- `prisma/`: SQLite schema and seed data.

## Quick Start

```bash
git clone <repo-url>
cd Stacksmith
npm ci
copy .env.example .env.local
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

Useful checks:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run check
```

## Environment Variables

Copy `.env.example` to `.env.local` for development. Real `.env*` files are ignored.

Required local settings:

- `DATABASE_URL`: SQLite path, for example `file:./dev.db`.
- `NEXTAUTH_URL`: local app URL.
- `NEXTAUTH_SECRET`: long random string.
- `ENCRYPTION_KEY`: long random string for stored sensitive values.
- `TOKEN_ENCRYPTION_KEY`: 64-character hex key for GitHub tokens.

Authentication:

- `ENABLE_DEMO_AUTH`: server-side demo credentials provider.
- `NEXT_PUBLIC_ENABLE_DEMO_AUTH`: client-side UI hint for demo login.
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`: GitHub OAuth credentials.

GitHub integration:

- `MOCK_GITHUB_API`: server-side mock GitHub provider.
- `NEXT_PUBLIC_MOCK_GITHUB_API`: client-side UI hint for mock mode.
- `GITHUB_WEBHOOK_SECRET`: secret for signed webhook routes.
- `NEXT_PUBLIC_GITHUB_APP_NAME`: optional app slug used in install links.

Demo/mock settings:

- `ENABLE_RUNNER_SIMULATOR`: enables simulated run records only.
- `ENABLE_MOCK_BILLING`: enables development-only billing simulation.
- `ALLOW_DEMO_PRODUCTION`: explicit escape hatch for dedicated demo deployments only.

Demo variables must be false in production. Production rejects demo auth, mock billing, runner simulation, unsafe encryption keys, and mock GitHub unless `ALLOW_DEMO_PRODUCTION=true`.

## Security Model

Stacksmith does not run Terraform apply, does not store Terraform state, and does not need permanent AWS credentials. Generated sensitive values are redacted from committed files. Validation uses `terraform init -backend=false` and `terraform validate`; custom blueprint validation remains disabled until a real sandbox exists. Customer-owned CI is responsible for plan/apply.

Report vulnerabilities privately using GitHub private vulnerability reporting. See [SECURITY.md](SECURITY.md).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), [SECURITY.md](SECURITY.md), and [docs/BLUEPRINTS.md](docs/BLUEPRINTS.md). Use the issue and pull-request templates in `.github/`.

## Roadmap

See [ROADMAP.md](ROADMAP.md) and [docs/ROADMAP.md](docs/ROADMAP.md). The next engineering milestone is real GitHub App installation, ownership verification, short-lived installation tokens, repository sync, atomic commits, real pull-request creation, and signed merge webhook processing.

## License

Stacksmith is licensed under the [Apache License 2.0](LICENSE).
