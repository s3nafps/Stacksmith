# Architecture

```text
Browser
-> Next.js routes
-> Authentication and RBAC
-> Deployment service
-> Blueprint loader
-> Generator
-> Validation abstraction
-> GitHub provider
-> Customer repository PR
```

Stacksmith is a Next.js App Router application backed by Prisma and SQLite today. The deployment service owns workflow state, workspace checks, generation, validation, and pull-request creation.

Curated blueprints are loaded from `blueprints/`. Custom blueprints can be stored in the database, but host-side validation for custom blueprints is disabled until sandboxing exists.

The GitHub provider abstraction supports a mock provider and a real REST provider. GitHub App onboarding is currently simulated only in demo mode.

Validation may run `terraform` or `tofu` with `init -backend=false` and `validate`. Stacksmith never runs apply.
