# Contributing

## Prerequisites

- Node.js 22
- npm
- SQLite for local development through Prisma
- Optional: Terraform or OpenTofu for validation checks

## Setup

```bash
npm ci
copy .env.example .env.local
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

## Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Use `npm run check` before opening a pull request.

## Branches and Commits

Use short descriptive branches such as `docs/blueprint-guide` or `fix/github-mock-guard`. Conventional commits are preferred but not required.

## Pull Requests

PRs should explain the problem, the change, and the verification performed. Include tests or docs when behavior changes. Do not include secrets, `.env` files, SQLite databases, Terraform state, generated `.terraform/` directories, or local build output.

When changing API routes or deployment code, consider workspace authorization, repository ownership, sensitive input redaction, mock behavior, and production behavior.

## Adding a Blueprint

Read [docs/BLUEPRINTS.md](docs/BLUEPRINTS.md). Add tests or examples for required inputs, sensitive inputs, generated files, and upgrade compatibility where practical.

## Database Changes

Update `prisma/schema.prisma`, run `npm run db:generate`, and document migration or reset expectations. Do not commit local database files.

## Good First Contributions

- Documentation improvements
- Blueprint README improvements
- Input validation
- Focused tests
- UI accessibility fixes
- Additional AWS blueprint tests

## Security Reports

Do not open public issues for vulnerabilities. Follow [SECURITY.md](SECURITY.md).
