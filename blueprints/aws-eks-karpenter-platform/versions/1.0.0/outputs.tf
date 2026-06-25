output "cluster_name" {
  description = "EKS cluster name."
  value       = aws_eks_cluster.main.name
}

output "interruption_queue_name" {
  description = "SQS queue name for Karpenter interruption handling."
  value       = aws_sqs_queue.karpenter_interruption.name
}

output "karpenter_controller_policy_arn" {
  description = "IAM policy ARN for a Karpenter controller role."
  value       = aws_iam_policy.karpenter_controller.arn
}

output "karpenter_nodepool_manifest" {
  description = "Rendered Karpenter EC2NodeClass and NodePool manifest."
  value       = local.karpenter_nodepool_manifest
}
