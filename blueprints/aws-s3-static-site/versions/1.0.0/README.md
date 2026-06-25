# Secure S3 Static Website — v1.0.0

## Overview

This blueprint creates a production-ready S3 static website hosting setup with:

- **S3 Website Bucket** — Configured for static website hosting with customizable index and error documents
- **S3 Logging Bucket** — Captures S3 access logs with 90-day lifecycle expiration
- **Server-Side Encryption** — AES-256 encryption on all buckets
- **Versioning** — Enabled by default to protect against accidental deletions
- **Public Read Policy** — Bucket policy allows public `s3:GetObject` for website content

## Architecture

```
┌─────────────┐     HTTP      ┌──────────────────────┐
│   Browser   │ ────────────► │  S3 Website Bucket   │
└─────────────┘               │  (public read)       │
                              │  - AES-256 encrypted │
                              │  - Versioning on     │
                              └──────────┬───────────┘
                                         │ access logs
                              ┌──────────▼───────────┐
                              │  S3 Logging Bucket   │
                              │  (private, 90d TTL)  │
                              └──────────────────────┘
```

## Usage

### Variables

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `project_name` | string | — | Yes | Unique project name (lowercase, hyphens allowed) |
| `environment` | string | `dev` | Yes | Environment: `dev`, `staging`, or `production` |
| `aws_region` | string | `us-east-1` | Yes | AWS region for deployment |
| `domain_name` | string | `""` | No | Custom domain (unused in v1.0.0, reserved for v1.1.0) |
| `enable_versioning` | bool | `true` | No | Enable S3 bucket versioning |
| `index_document` | string | `index.html` | No | Default index document |
| `error_document` | string | `error.html` | No | Custom error document |
| `tags` | map(string) | `{}` | No | Additional resource tags |

### Example terraform.tfvars

```hcl
project_name     = "my-website"
environment      = "production"
aws_region       = "us-east-1"
enable_versioning = true
index_document   = "index.html"
error_document   = "404.html"

tags = {
  team        = "frontend"
  cost-center = "marketing"
}
```

### Deploying Content

After applying the Terraform configuration, upload your static site files:

```bash
aws s3 sync ./dist s3://my-website-production-site --delete
```

## Outputs

| Output | Description |
|--------|-------------|
| `website_bucket_name` | Name of the S3 website bucket |
| `website_bucket_arn` | ARN of the S3 website bucket |
| `website_endpoint` | S3 website endpoint URL |
| `logging_bucket_name` | Name of the logging bucket |

## Upgrading to v1.1.0

Version 1.1.0 adds a CloudFront distribution for HTTPS, caching, and global edge delivery. The upgrade replaces the public S3 bucket policy with CloudFront Origin Access Identity.

## Security Considerations

- The website bucket allows public `s3:GetObject` access — only upload files intended for public consumption
- The logging bucket blocks all public access
- Consider upgrading to v1.1.0 for HTTPS support via CloudFront
- Versioning protects against accidental deletions but increases storage costs
