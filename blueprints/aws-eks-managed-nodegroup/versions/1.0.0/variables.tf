variable "project_name" {
  description = "Lowercase project name used for resource names."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,40}[a-z0-9]$", var.project_name))
    error_message = "Project name must be lowercase alphanumeric with hyphens."
  }
}

variable "environment" {
  description = "Deployment environment."
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region for the cluster."
  type        = string
  default     = "us-east-1"
}

variable "cluster_version" {
  description = "EKS Kubernetes version."
  type        = string
  default     = "1.30"
}

variable "subnet_ids" {
  description = "Private subnet IDs for EKS and worker nodes."
  type        = list(string)
}

variable "endpoint_public_access" {
  description = "Whether the Kubernetes API endpoint is public."
  type        = bool
  default     = false
}

variable "public_access_cidrs" {
  description = "CIDRs allowed to reach the public API endpoint."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "node_instance_types" {
  description = "EC2 instance types for the managed node group."
  type        = list(string)
  default     = ["t3.medium"]
}

variable "desired_size" {
  description = "Desired node group size."
  type        = number
  default     = 2
}

variable "min_size" {
  description = "Minimum node group size."
  type        = number
  default     = 1
}

variable "max_size" {
  description = "Maximum node group size."
  type        = number
  default     = 4
}

variable "tags" {
  description = "Additional tags applied to resources."
  type        = map(string)
  default     = {}
}
