output "cluster_name" {
  description = "EKS cluster name."
  value       = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  description = "EKS API endpoint."
  value       = aws_eks_cluster.main.endpoint
}

output "fargate_profile_names" {
  description = "Fargate profile names."
  value       = [for profile in aws_eks_fargate_profile.namespace : profile.fargate_profile_name]
}

output "pod_execution_role_arn" {
  description = "IAM role used by Fargate pods."
  value       = aws_iam_role.fargate_pod_execution.arn
}
