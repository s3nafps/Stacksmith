# Security Model

Stacksmith is designed around customer-owned execution:

- No hosted Terraform apply.
- No hosted Terraform state.
- No permanent cloud credentials.
- Sensitive inputs are encrypted at rest and redacted from generated files.
- Generated pull requests are reviewable before customer CI runs anything.
- Custom blueprint validation is disabled without a sandbox.

Production must not enable `ENABLE_DEMO_AUTH`, `ENABLE_RUNNER_SIMULATOR`, or `ENABLE_MOCK_BILLING`. `MOCK_GITHUB_API` is blocked in production unless `ALLOW_DEMO_PRODUCTION=true` is explicitly set for a dedicated demo deployment.

GitHub App permissions planned for production:

- Metadata: read
- Contents: write
- Pull requests: write
