# AWS ECS Fargate Web Service

This blueprint deploys a containerized web application on AWS ECS Fargate, running in private subnets, behind a public-facing Application Load Balancer (ALB).

## Architecture

- **ECS Cluster**: Dedicated logical cluster for running container workloads.
- **Task Definition**: Defines container CPU, memory allocations, environment variables, port mappings, and logging to CloudWatch.
- **ECS Service**: Deploys task instances in private subnets, managing target registration with the load balancer and scaling up/down.
- **ALB (Application Load Balancer)**: Exposes a single public HTTP entrypoint and routes traffic to the container instances.
- **Security Groups**: Hardened network configuration restricting access to the tasks exclusively from the ALB.
- **Autoscaling**: Target tracking policy scaling the service capacity dynamically based on CPU utilization.

## Prerequisites

- An existing VPC with public and private subnets across multiple availability zones.
- The public subnets will host the Application Load Balancer.
- The private subnets will host the Fargate tasks.
