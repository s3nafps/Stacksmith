# Roadmap

No dates are promised.

## Near Term

- Finish real GitHub App onboarding.
- Improve self-hosting documentation and health checks.
- Harden production environment validation.
- Expand blueprint tests.
- Review the five moderate npm vulnerabilities individually.
- Create GitHub labels: `good first issue`, `help wanted`, `bug`, `security`, `blueprint`, and `documentation`.
- Enable GitHub private vulnerability reporting and branch protection for `main`.
- Require CI before merging.
- Publish the first GitHub release as `v0.1.0`.

## Later

- PostgreSQL support.
- Sandboxed custom blueprint validation.
- Upgrade detection and upgrade pull requests.
- Optional hosted/commercial billing integration.
- Release automation.

## First Release Positioning

Stacksmith v0.1.0 is an experimental OSS preview:

- Suitable for local evaluation and experimental single-instance self-hosting.
- Terraform generation and blueprint contribution are available.
- Real GitHub App onboarding is under development.
- Billing and automated upgrades are disabled.
- Production multi-tenant use is not yet recommended.

## Next Engineering Milestone

Do not work on Paddle yet. Complete real GitHub App installation first:

1. Verify installation ownership.
2. Generate short-lived installation tokens.
3. Sync authorized repositories.
4. Create one atomic Git commit.
5. Open a real pull request.
6. Process the signed merge webhook.
