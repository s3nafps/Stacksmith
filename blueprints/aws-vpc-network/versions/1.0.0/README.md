# AWS VPC Network — v1.0.0

## Overview

This blueprint creates a production-ready AWS VPC with:

- **VPC** — Configurable CIDR block with DNS support and hostnames enabled
- **Public Subnets** — 2 subnets across Availability Zones with auto-assign public IPs
- **Private Subnets** — 2 subnets across Availability Zones (no public IPs)
- **Internet Gateway** — Provides internet access for public subnets
- **NAT Gateway** — Enables outbound-only internet access for private subnets
- **Route Tables** — Separate routing for public (IGW) and private (NAT) subnets
- **Network ACLs** — Subnet-level firewall rules for public and private tiers
- **Default Security Group** — Restrictive (no inbound/outbound) to enforce explicit SG creation
- **VPC Flow Logs** — Captures all traffic metadata to CloudWatch Logs

## Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                           VPC (10.0.0.0/16)                          │
│                                                                       │
│  ┌─────────────────────────┐  ┌─────────────────────────┐            │
│  │  Public Subnet AZ-1     │  │  Public Subnet AZ-2     │            │
│  │  10.0.1.0/24            │  │  10.0.2.0/24            │            │
│  │  ┌──────────────────┐   │  │                         │            │
│  │  │  NAT Gateway     │   │  │                         │            │
│  │  └──────────────────┘   │  │                         │            │
│  └────────────┬────────────┘  └─────────────────────────┘            │
│               │                                                       │
│  ┌────────────▼────────────┐  ┌─────────────────────────┐            │
│  │  Private Subnet AZ-1   │  │  Private Subnet AZ-2    │            │
│  │  10.0.10.0/24           │  │  10.0.20.0/24           │            │
│  └─────────────────────────┘  └─────────────────────────┘            │
│                                                                       │
│  ┌─────────────────────────┐                                          │
│  │  Internet Gateway       │────► Internet                            │
│  └─────────────────────────┘                                          │
│                                                                       │
│  ┌─────────────────────────┐                                          │
│  │  VPC Flow Logs          │────► CloudWatch Logs                     │
│  └─────────────────────────┘                                          │
└───────────────────────────────────────────────────────────────────────┘
```

## Usage

### Variables

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `project_name` | string | — | Yes | Unique project name |
| `environment` | string | `dev` | Yes | Environment: `dev`, `staging`, `production` |
| `aws_region` | string | `us-east-1` | Yes | AWS region |
| `vpc_cidr` | string | `10.0.0.0/16` | Yes | VPC CIDR block |
| `public_subnet_cidrs` | list(string) | `["10.0.1.0/24", "10.0.2.0/24"]` | Yes | Public subnet CIDRs |
| `private_subnet_cidrs` | list(string) | `["10.0.10.0/24", "10.0.20.0/24"]` | Yes | Private subnet CIDRs |
| `enable_nat_gateway` | bool | `true` | No | Enable NAT Gateway |
| `single_nat_gateway` | bool | `true` | No | Use single NAT Gateway (cost saving) |
| `enable_flow_logs` | bool | `true` | No | Enable VPC Flow Logs |

### Example terraform.tfvars

```hcl
project_name         = "my-app"
environment          = "production"
aws_region           = "us-east-1"
vpc_cidr             = "10.0.0.0/16"
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24"]
enable_nat_gateway   = true
single_nat_gateway   = false  # One NAT per AZ for production HA
enable_flow_logs     = true
```

## Outputs

| Output | Description |
|--------|-------------|
| `vpc_id` | VPC ID |
| `vpc_cidr_block` | VPC CIDR block |
| `public_subnet_ids` | List of public subnet IDs |
| `private_subnet_ids` | List of private subnet IDs |
| `internet_gateway_id` | Internet Gateway ID |
| `nat_gateway_ids` | NAT Gateway IDs (if enabled) |
| `public_route_table_id` | Public route table ID |
| `private_route_table_ids` | Private route table IDs |

## Cost Optimization

- **Single NAT Gateway** (`single_nat_gateway = true`): ~$32/month + data processing. Suitable for dev/staging.
- **Per-AZ NAT Gateways** (`single_nat_gateway = false`): ~$64/month + data processing. Recommended for production HA.
- **No NAT Gateway** (`enable_nat_gateway = false`): $0. Private subnets will have no internet access.

## Security Considerations

- Default security group blocks all traffic — create explicit security groups for workloads
- Private subnets have no direct inbound internet access
- Network ACLs on private subnets restrict inbound to VPC CIDR + ephemeral return ports
- Flow Logs capture all accepted and rejected traffic for security auditing
- Consider enabling VPC endpoints for AWS service access without internet routing
