variable "project_name" {
  description = "A unique name for the project, used in resource naming and tagging."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$", var.project_name))
    error_message = "Project name must be lowercase alphanumeric with hyphens, 2-63 characters."
  }
}

variable "environment" {
  description = "The deployment environment (e.g., dev, staging, production)."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}

variable "aws_region" {
  description = "The AWS region to deploy resources into."
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "Optional custom domain name for the static site (e.g., www.example.com)."
  type        = string
  default     = ""
}

variable "enable_versioning" {
  description = "Enable versioning on the S3 bucket to protect against accidental deletions."
  type        = bool
  default     = true
}

variable "index_document" {
  description = "The default index document for the website."
  type        = string
  default     = "index.html"
}

variable "error_document" {
  description = "The custom error document for the website."
  type        = string
  default     = "error.html"
}

variable "tags" {
  description = "Additional tags to apply to all resources."
  type        = map(string)
  default     = {}
}
