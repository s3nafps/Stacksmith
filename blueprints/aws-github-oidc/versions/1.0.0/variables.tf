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
  description = "The AWS region to deploy IAM resources into. IAM is global but the provider requires a region."
  type        = string
  default     = "us-east-1"
}

variable "github_org" {
  description = "The GitHub organization or user account name."
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9][a-zA-Z0-9-]*$", var.github_org))
    error_message = "GitHub organization must be a valid GitHub username/org (alphanumeric with hyphens)."
  }
}

variable "github_repo" {
  description = "The GitHub repository name. Used to scope the IAM trust policy."
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9._-]+$", var.github_repo))
    error_message = "GitHub repo name must contain only alphanumeric characters, dots, hyphens, and underscores."
  }
}

variable "github_branch" {
  description = "The Git branch to restrict role assumption to. Use '*' to allow any branch."
  type        = string
  default     = "main"
}

variable "role_name" {
  description = "Custom name for the IAM role. If empty, a name is generated from the project name."
  type        = string
  default     = ""
}

variable "policy_arns" {
  description = "List of IAM managed policy ARNs to attach to the role."
  type        = list(string)
  default     = ["arn:aws:iam::aws:policy/ReadOnlyAccess"]

  validation {
    condition     = length(var.policy_arns) > 0
    error_message = "At least one policy ARN must be provided."
  }
}

variable "max_session_duration" {
  description = "Maximum session duration in seconds for the IAM role (900-43200)."
  type        = number
  default     = 3600

  validation {
    condition     = var.max_session_duration >= 900 && var.max_session_duration <= 43200
    error_message = "Max session duration must be between 900 and 43200 seconds."
  }
}
