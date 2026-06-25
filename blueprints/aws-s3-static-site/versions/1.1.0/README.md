# Secure S3 Static Website with CloudFront — v1.1.0

## Overview

This blueprint creates a production-ready S3 static website fronted by a CloudFront CDN distribution:

- **S3 Website Bucket** — Private bucket (no public access) with AES-256 encryption and versioning
- **CloudFront Distribution** — Global CDN with HTTP-to-HTTPS redirection, compression, and SPA error handling
- **Origin Access Identity** — Restricts S3 access to CloudFront only
- **ACM Certificate** — Optional TLS certificate for custom domains (DNS validation)
- **S3 Logging Bucket** — Captures both S3 and CloudFront access logs with 90-day lifecycle
- **SPA Support** — Custom error responses route 403/404 errors back to index.html

## What Changed from v1.0.0

- **Added CloudFront distribution** with Origin Access Identity
- **S3 bucket is now private** — no public bucket policy; all access goes through CloudFront
- **HTTPS everywhere** — automatic HTTP-to-HTTPS redirection
- **Optional ACM certificate** — DNS-validated TLS for custom domains
- **CloudFront access logging** — separate log prefix for CDN access logs
- **SPA routing support** — 403/404 errors return index.html for client-side routing

## Architecture

```
┌─────────────┐    HTTPS     ┌─────────────────────┐    OAI     ┌──────────────────────┐
│   Browser   │ ───────────► │  CloudFront CDN     │ ─────────► │  S3 Website Bucket   │
└─────────────┘              │  - TLS 1.2+         │            │  (private)           │
                             │  - Compression      │            │  - AES-256 encrypted │
                             │  - Edge caching     │            │  - Versioning on     │
                             └─────────┬───────────┘            └──────────────────────┘
                                       │ logs
                             ┌─────────▼───────────┐
                             │  S3 Logging Bucket   │
                             │  (private, 90d TTL)  │
                             └──────────────────────┘
                                                      ┌──────────────────────┐
                                                      │  ACM Certificate     │
                                                      │  (if custom domain)  │
                                                      └──────────────────────┘
```

## Usage

### Variables

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `project_name` | string | — | Yes | Unique project name (lowercase, hyphens allowed) |
| `environment` | string | `dev` | Yes | Environment: `dev`, `staging`, or `production` |
| `aws_region` | string | `us-east-1` | Yes | AWS region for S3 bucket deployment |
| `domain_name` | string | `""` | No | Custom domain for CloudFront (triggers ACM cert creation) |
| `enable_versioning` | bool | `true` | No | Enable S3 bucket versioning |
| `index_document` | string | `index.html` | No | Default index document |
| `error_document` | string | `error.html` | No | Custom error document |
| `cloudfront_price_class` | string | `PriceClass_100` | No | CloudFront edge coverage |
| `tags` | map(string) | `{}` | No | Additional resource tags |

### Example terraform.tfvars

```hcl
project_name           = "my-website"
environment            = "production"
aws_region             = "us-east-1"
domain_name            = "www.example.com"
cloudfront_price_class = "PriceClass_200"

tags = {
  team        = "frontend"
  cost-center = "marketing"
}
```

### Custom Domain Setup

When `domain_name` is provided:

1. An ACM certificate is created in `us-east-1` (required by CloudFront)
2. DNS validation records are output — add these to your DNS provider
3. CloudFront uses the validated certificate for HTTPS

### Deploying Content

```bash
# Upload files
aws s3 sync ./dist s3://my-website-production-site --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"
```

## Outputs

| Output | Description |
|--------|-------------|
| `website_bucket_name` | Name of the S3 website bucket |
| `website_bucket_arn` | ARN of the S3 website bucket |
| `cloudfront_distribution_id` | CloudFront distribution ID |
| `cloudfront_distribution_domain` | CloudFront domain name |
| `cloudfront_distribution_arn` | CloudFront distribution ARN |
| `website_url` | Primary website URL (custom domain or CloudFront) |
| `logging_bucket_name` | Name of the logging bucket |

## Security Considerations

- S3 bucket blocks all public access — content is only served via CloudFront OAI
- CloudFront enforces HTTPS with TLS 1.2 minimum
- Access logs capture both S3 and CloudFront traffic
- ACM certificate uses DNS validation (no email required)
- Consider adding WAF rules for production workloads
