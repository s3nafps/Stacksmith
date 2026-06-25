# AWS RDS Aurora Serverless v2 PostgreSQL

Deploys a production-grade, highly available Amazon Aurora Serverless v2 database running PostgreSQL in private subnets, security-hardened and integrated with Secrets Manager.

## Architecture

- **Aurora Cluster**: PostgreSQL-compatible database cluster leveraging Serverless v2 (ACUs) capacity scaling.
- **HA Instances**: Deploys two scaling reader/writer database instances across multiple Availability Zones.
- **Subnet Group**: Dedicated subnet group wrapping private subnets only.
- **Credentials Secrets Manager**: Generates a strong random master password and stores the connection parameters securely in AWS Secrets Manager (no plain-text passwords in code).
- **Access Firewall**: Locked down security group that allows inbound connections exclusively from specified subnets or allowed security group resources (like Fargate services).
