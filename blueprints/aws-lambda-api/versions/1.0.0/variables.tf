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
  description = "The AWS region to deploy the API into."
  type        = string
  default     = "us-east-1"
}

variable "runtime" {
  description = "The Lambda execution runtime environment."
  type        = string
  default     = "nodejs20.x"

  validation {
    condition     = contains(["nodejs20.x", "python3.11", "go1.x"], var.runtime)
    error_message = "Runtime must be one of nodejs20.x, python3.11, or go1.x."
  }
}

variable "handler" {
  description = "The entry point in your code."
  type        = string
  default     = "index.handler"
}

variable "memory_size" {
  description = "The memory allocated to the Lambda function in MB."
  type        = number
  default     = 128
}

variable "timeout" {
  description = "The maximum execution time in seconds."
  type        = number
  default     = 10
}

variable "environment_variables" {
  description = "Environment variables for the Lambda function."
  type        = map(string)
  default     = {}
}

variable "tags" {
  description = "Additional tags to apply to all resources."
  type        = map(string)
  default     = {}
}
