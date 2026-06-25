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
  description = "The AWS region to deploy the ECS service into."
  type        = string
  default     = "us-east-1"
}

variable "vpc_id" {
  description = "The ID of the VPC where resources will be deployed."
  type        = string
}

variable "subnet_ids" {
  description = "List of private subnet IDs for ECS tasks."
  type        = list(string)
}

variable "alb_subnet_ids" {
  description = "List of public subnet IDs for the ALB."
  type        = list(string)
}

variable "container_image" {
  description = "The Docker image to deploy."
  type        = string
  default     = "nginx:alpine"
}

variable "container_port" {
  description = "The port the container listens on."
  type        = number
  default     = 80
}

variable "cpu" {
  description = "The number of CPU units to allocate for the ECS task (e.g. 256, 512, 1024)."
  type        = number
  default     = 256
}

variable "memory" {
  description = "The amount of memory in MB to allocate for the ECS task (e.g. 512, 1024, 2048)."
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "The desired number of running container instances."
  type        = number
  default     = 2
}

variable "domain_name" {
  description = "Optional custom domain name for routing traffic via Route 53."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Additional tags to apply to all resources."
  type        = map(string)
  default     = {}
}
