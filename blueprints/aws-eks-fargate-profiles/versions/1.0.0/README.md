# AWS EKS Fargate Profiles

Serverless EKS baseline for teams that want Kubernetes scheduling without EC2 node management.

Create Kubernetes namespaces matching `workload_namespaces` after provisioning; matching pods will schedule onto Fargate.
