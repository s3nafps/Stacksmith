# ──────────────────────────────────────────────────────────────────────────────
# Provider Configuration
# ──────────────────────────────────────────────────────────────────────────────

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(
      {
        Project     = var.project_name
        Environment = var.environment
        ManagedBy   = "terraform"
        Blueprint   = "aws-s3-static-site"
        Version     = "1.1.0"
      },
      var.tags
    )
  }
}

# ACM certificates for CloudFront must be in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = merge(
      {
        Project     = var.project_name
        Environment = var.environment
        ManagedBy   = "terraform"
        Blueprint   = "aws-s3-static-site"
        Version     = "1.1.0"
      },
      var.tags
    )
  }
}

# ──────────────────────────────────────────────────────────────────────────────
# Locals
# ──────────────────────────────────────────────────────────────────────────────

locals {
  bucket_name    = "${var.project_name}-${var.environment}-site"
  logging_name   = "${var.project_name}-${var.environment}-site-logs"
  has_domain     = var.domain_name != ""
  s3_origin_id   = "S3-${local.bucket_name}"
}

# ──────────────────────────────────────────────────────────────────────────────
# S3 Logging Bucket
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "logging" {
  bucket        = local.logging_name
  force_destroy = false

  tags = {
    Name    = local.logging_name
    Purpose = "access-logging"
  }
}

resource "aws_s3_bucket_public_access_block" "logging" {
  bucket = aws_s3_bucket.logging.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logging" {
  bucket = aws_s3_bucket.logging.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_versioning" "logging" {
  bucket = aws_s3_bucket.logging.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "logging" {
  bucket = aws_s3_bucket.logging.id

  rule {
    id     = "expire-old-logs"
    status = "Enabled"

    expiration {
      days = 90
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_s3_bucket_ownership_controls" "logging" {
  bucket = aws_s3_bucket.logging.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

# ACL for CloudFront logging — requires ownership controls set first
resource "aws_s3_bucket_acl" "logging" {
  depends_on = [aws_s3_bucket_ownership_controls.logging]

  bucket = aws_s3_bucket.logging.id
  acl    = "log-delivery-write"
}

# ──────────────────────────────────────────────────────────────────────────────
# S3 Website Bucket (Private — served via CloudFront OAI)
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "website" {
  bucket        = local.bucket_name
  force_destroy = false

  tags = {
    Name    = local.bucket_name
    Purpose = "static-website"
  }
}

resource "aws_s3_bucket_versioning" "website" {
  bucket = aws_s3_bucket.website.id

  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_logging" "website" {
  bucket = aws_s3_bucket.website.id

  target_bucket = aws_s3_bucket.logging.id
  target_prefix = "s3-access-logs/"
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "website" {
  bucket = aws_s3_bucket.website.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# ──────────────────────────────────────────────────────────────────────────────
# CloudFront Origin Access Identity
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_cloudfront_origin_access_identity" "website" {
  comment = "OAI for ${local.bucket_name}"
}

# Bucket policy grants CloudFront OAI read access (replaces public read)
resource "aws_s3_bucket_policy" "website" {
  depends_on = [aws_s3_bucket_public_access_block.website]

  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "CloudFrontReadAccess"
        Effect    = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.website.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.website.arn}/*"
      }
    ]
  })
}

# ──────────────────────────────────────────────────────────────────────────────
# ACM Certificate (only when custom domain is provided)
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_acm_certificate" "website" {
  count = local.has_domain ? 1 : 0

  provider = aws.us_east_1

  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-cert"
  }
}

# ──────────────────────────────────────────────────────────────────────────────
# CloudFront Distribution
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = var.index_document
  comment             = "${var.project_name} ${var.environment} static site"
  price_class         = var.cloudfront_price_class
  wait_for_deployment = true

  aliases = local.has_domain ? [var.domain_name] : []

  origin {
    domain_name = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id   = local.s3_origin_id

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.website.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = local.s3_origin_id
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  # Custom error responses for SPA routing
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/${var.index_document}"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/${var.error_document}"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Use ACM cert if custom domain is provided, otherwise default CloudFront cert
  dynamic "viewer_certificate" {
    for_each = local.has_domain ? [1] : []
    content {
      acm_certificate_arn      = aws_acm_certificate.website[0].arn
      ssl_support_method       = "sni-only"
      minimum_protocol_version = "TLSv1.2_2021"
    }
  }

  dynamic "viewer_certificate" {
    for_each = local.has_domain ? [] : [1]
    content {
      cloudfront_default_certificate = true
    }
  }

  logging_config {
    include_cookies = false
    bucket          = aws_s3_bucket.logging.bucket_domain_name
    prefix          = "cloudfront-logs/"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-cdn"
  }
}
