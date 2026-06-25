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
        Version     = "1.0.0"
      },
      var.tags
    )
  }
}

# ──────────────────────────────────────────────────────────────────────────────
# Locals
# ──────────────────────────────────────────────────────────────────────────────

locals {
  bucket_name  = "${var.project_name}-${var.environment}-site"
  logging_name = "${var.project_name}-${var.environment}-site-logs"
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

# ──────────────────────────────────────────────────────────────────────────────
# S3 Website Bucket
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "website" {
  bucket        = local.bucket_name
  force_destroy = false

  tags = {
    Name    = local.bucket_name
    Purpose = "static-website"
  }
}

resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  index_document {
    suffix = var.index_document
  }

  error_document {
    key = var.error_document
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

# ──────────────────────────────────────────────────────────────────────────────
# Public Access & Bucket Policy (static website hosting)
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = true
  block_public_policy     = false
  ignore_public_acls      = true
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "website" {
  depends_on = [aws_s3_bucket_public_access_block.website]

  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.website.arn}/*"
      }
    ]
  })
}

# ──────────────────────────────────────────────────────────────────────────────
# S3 Bucket Ownership Controls
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket_ownership_controls" "website" {
  bucket = aws_s3_bucket.website.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_ownership_controls" "logging" {
  bucket = aws_s3_bucket.logging.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}
