# GitHub Actions OIDC for AWS — v1.0.0

## Overview

This blueprint configures secure, keyless authentication from GitHub Actions to AWS using OpenID Connect (OIDC):

- **IAM OIDC Provider** — Registers GitHub Actions as a trusted identity provider in your AWS account
- **IAM Role** — Assumable role with a trust policy scoped to a specific GitHub org, repo, and branch
- **Managed Policy Attachments** — Configurable AWS managed policies for the role
- **Privilege Escalation Guard** — Inline deny policy prevents the role from creating users, roles, or access keys

## How OIDC Works

```
┌─────────────────────┐     1. Request OIDC Token     ┌──────────────────────┐
│  GitHub Actions     │ ─────────────────────────────► │  GitHub OIDC         │
│  Workflow           │ ◄───────────────────────────── │  Provider            │
│                     │     2. Return JWT Token         │  (token.actions...)  │
│                     │                                 └──────────────────────┘
│                     │
│                     │     3. AssumeRoleWithWebIdentity
│                     │        (JWT + Role ARN)
│                     │ ─────────────────────────────► ┌──────────────────────┐
│                     │                                │  AWS STS             │
│                     │ ◄───────────────────────────── │                      │
│                     │     4. Temporary Credentials    │  Validates:          │
│                     │        (AccessKey, Secret,      │  - OIDC Provider     │
│                     │         SessionToken)           │  - Audience          │
└─────────────────────┘                                │  - Subject (org/repo)│
                                                       └──────────────────────┘
```

## Usage

### Variables

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `project_name` | string | — | Yes | Unique project name |
| `environment` | string | `dev` | Yes | Environment: `dev`, `staging`, `production` |
| `aws_region` | string | `us-east-1` | Yes | AWS region (IAM is global) |
| `github_org` | string | — | Yes | GitHub org or username |
| `github_repo` | string | — | Yes | GitHub repository name |
| `github_branch` | string | `main` | No | Branch restriction (`*` for any) |
| `role_name` | string | `""` | No | Custom IAM role name |
| `policy_arns` | list(string) | `["...ReadOnlyAccess"]` | No | Managed policy ARNs |
| `max_session_duration` | number | `3600` | No | Max session duration (900-43200s) |

### Example terraform.tfvars

```hcl
project_name         = "my-app"
environment          = "production"
aws_region           = "us-east-1"
github_org           = "my-company"
github_repo          = "my-app"
github_branch        = "main"
max_session_duration = 3600

policy_arns = [
  "arn:aws:iam::aws:policy/AmazonS3FullAccess",
  "arn:aws:iam::aws:policy/AmazonECR-FullAccess"
]
```

### GitHub Actions Workflow

After applying, add this to your workflow (`.github/workflows/*.yml`):

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

permissions:
  id-token: write   # Required for OIDC
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/my-app-production-github-actions
          aws-region: us-east-1

      - name: Verify Identity
        run: aws sts get-caller-identity
```

## Outputs

| Output | Description |
|--------|-------------|
| `oidc_provider_arn` | IAM OIDC identity provider ARN |
| `role_arn` | IAM role ARN for GitHub Actions |
| `role_name` | IAM role name |
| `github_actions_config_snippet` | Ready-to-use workflow snippet |

## Security Considerations

- **No long-lived credentials** — OIDC tokens are short-lived and scoped
- **Branch restriction** — Trust policy limits which branch can assume the role
- **Privilege escalation deny** — Inline policy prevents creating users/roles/keys
- **Audience validation** — Only `sts.amazonaws.com` audience is accepted
- **Repository scoping** — Only the specified org/repo can assume the role
- Use `*` for `github_branch` only if you need all branches to deploy (not recommended for production)

## Important Notes

- If your AWS account already has a GitHub OIDC provider, this will fail. Import the existing provider or remove the `aws_iam_openid_connect_provider` resource.
- The `policy_arns` default uses `ReadOnlyAccess` — change this for deployments that need write access.
- Consider creating separate roles per environment with different permissions.
