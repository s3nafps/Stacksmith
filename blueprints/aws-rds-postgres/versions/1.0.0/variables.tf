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
  description = "The AWS region to deploy the database into."
  type        = string
  default     = "us-east-1"
}

variable "vpc_id" {
  description = "The ID of the VPC where database resources will reside."
  type        = string
}

variable "subnet_ids" {
  description = "List of private subnet IDs for the database subnet group."
  type        = list(string)
}

variable "database_name" {
  description = "The name of the default database to create in the cluster."
  type        = string
  default     = "appdb"

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.database_name))
    error_message = "Database name must begin with a letter and contain only alphanumeric characters and underscores."
  }
}

variable "min_capacity" {
  description = "The minimum Aurora Capacity Units (ACUs) to scale down to."
  type        = number
  default     = 0.5
}

variable "max_capacity" {
  description = "The maximum Aurora Capacity Units (ACUs) to scale up to."
  type        = number
  default     = 2.0
}

variable "backup_retention_period" {
  description = "The number of days to retain automated database backups."
  type        = number
  default     = 7
}

variable "allowed_security_group_ids" {
  description = "List of security group IDs permitted to connect to the database."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Additional tags to apply to all resources."
  type        = map(string)
  default     = {}
}
