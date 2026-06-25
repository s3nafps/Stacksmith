output "cluster_name" {
  description = "EKS cluster name."
  value       = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  description = "EKS API endpoint."
  value       = aws_eks_cluster.main.endpoint
}

output "node_group_name" {
  description = "Managed node group name."
  value       = aws_eks_node_group.main.node_group_name
}

output "cluster_security_group_id" {
  description = "Cluster security group ID."
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}
