# Stacksmith

Stacksmith is a local SaaS MVP for generating curated AWS Terraform blueprints and opening GitHub pull requests. It does not apply infrastructure or host Terraform state.

## Setup

```bash
npm install
npx prisma generate
npx tsx prisma/seed.ts
npm run dev
```

Open http://localhost:3000.

## Environment

Copy `.env.example` to `.env.local`.

For sandbox/demo mode:

```env
DATABASE_URL="file:./dev.db"
ENABLE_DEMO_AUTH="true"
NEXT_PUBLIC_ENABLE_DEMO_AUTH="true"
ENABLE_RUNNER_SIMULATOR="true"
MOCK_GITHUB_API="true"
NEXT_PUBLIC_MOCK_GITHUB_API="true"
```

For real GitHub OAuth mode:

```env
ENABLE_DEMO_AUTH="false"
NEXT_PUBLIC_ENABLE_DEMO_AUTH="false"
ENABLE_RUNNER_SIMULATOR="false"
MOCK_GITHUB_API="false"
NEXT_PUBLIC_MOCK_GITHUB_API="false"
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
```

Set `GITHUB_WEBHOOK_SECRET` when using webhooks. Signed webhook requests are rejected when the signature is missing or invalid.

## Commands

```bash
npm run dev      # local app
npm run lint     # eslint
npm run test     # vitest
npm run build    # production build
```

## Blueprint Catalog

Blueprint metadata and Terraform files live under `blueprints/*`. The catalog and detail pages load from that filesystem-backed catalog through `/api/blueprints`, so adding a new valid `blueprint.json` and version directory is enough to surface it in the UI.

## Custom Blueprints

Open `/blueprints/new` to create a custom blueprint. The builder writes:

```text
blueprints/custom/<slug>/blueprint.json
blueprints/custom/<slug>/versions/1.0.0/*.tf
```

Creation validates the blueprint schema and runs the existing Terraform validator when Terraform/OpenTofu is available. After saving, use `Sync PR` to open a pull request that commits the custom blueprint folder into a selected GitHub repository.

## Notes

- Sensitive inputs are detected from blueprint input type `sensitive` and common secret-like names.
- `GET /api/deployments/[id]/generate` previews generated files without mutating deployment status.
- `POST /api/deployments/[id]/generate` performs generation and updates deployment state.
