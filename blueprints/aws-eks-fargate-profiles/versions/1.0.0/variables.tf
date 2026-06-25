variable "project_name" {
  description = "Lowercase project name used for resource names."
  type        = string
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
  description = "Private subnet IDs for Fargate pods."
  type        = list(string)
}

variable "endpoint_public_access" {
  description = "Whether the Kubernetes API endpoint is public."
  type        = bool
  default     = false
}

variable "workload_namespaces" {
  description = "Kubernetes namespaces that should run on Fargate."
  type        = list(string)
  default     = ["apps", "jobs"]
}

variable "tags" {
  description = "Additional tags applied to resources."
  type        = map(string)
  default     = {}
}
