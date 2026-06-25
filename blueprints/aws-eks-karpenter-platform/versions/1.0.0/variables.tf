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
  description = "Private subnet IDs for EKS and nodes."
  type        = list(string)
}

variable "bootstrap_instance_types" {
  description = "Instance types for the small managed bootstrap node group."
  type        = list(string)
  default     = ["t3.medium"]
}

variable "karpenter_instance_families" {
  description = "Instance families allowed in the generated NodePool manifest."
  type        = list(string)
  default     = ["m6i", "m7i", "c6i", "c7i"]
}

variable "karpenter_capacity_types" {
  description = "Capacity types for the generated NodePool manifest."
  type        = list(string)
  default     = ["spot", "on-demand"]
}

variable "tags" {
  description = "Additional tags applied to resources."
  type        = map(string)
  default     = {}
}
