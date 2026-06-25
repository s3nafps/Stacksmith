output "website_bucket_name" {
  description = "The name of the S3 bucket hosting the static website."
  value       = aws_s3_bucket.website.id
}

output "website_bucket_arn" {
  description = "The ARN of the S3 website bucket."
  value       = aws_s3_bucket.website.arn
}

output "cloudfront_distribution_id" {
  description = "The ID of the CloudFront distribution."
  value       = aws_cloudfront_distribution.website.id
}

output "cloudfront_distribution_domain" {
  description = "The domain name of the CloudFront distribution."
  value       = aws_cloudfront_distribution.website.domain_name
}

output "cloudfront_distribution_arn" {
  description = "The ARN of the CloudFront distribution."
  value       = aws_cloudfront_distribution.website.arn
}

output "website_url" {
  description = "The primary URL to access the website (CloudFront domain or custom domain)."
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.website.domain_name}"
}

output "logging_bucket_name" {
  description = "The name of the S3 access logging bucket."
  value       = aws_s3_bucket.logging.id
}
