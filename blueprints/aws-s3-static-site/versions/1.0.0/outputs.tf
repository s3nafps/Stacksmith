output "website_bucket_name" {
  description = "The name of the S3 bucket hosting the static website."
  value       = aws_s3_bucket.website.id
}

output "website_bucket_arn" {
  description = "The ARN of the S3 website bucket."
  value       = aws_s3_bucket.website.arn
}

output "website_endpoint" {
  description = "The S3 website endpoint URL."
  value       = aws_s3_bucket_website_configuration.website.website_endpoint
}

output "logging_bucket_name" {
  description = "The name of the S3 access logging bucket."
  value       = aws_s3_bucket.logging.id
}
