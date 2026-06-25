# AWS EKS Karpenter Platform Baseline

EKS baseline prepared for Karpenter autoscaling. Terraform creates the AWS-side cluster, bootstrap node group, interruption queue, and IAM policy. The Karpenter Kubernetes resources are emitted as an output so they can be reviewed and applied after the controller is installed.
