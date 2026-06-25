provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(
      {
        Project     = var.project_name
        Environment = var.environment
        ManagedBy   = "terraform"
        Blueprint   = "aws-rds-postgres"
        Version     = "1.0.0"
      },
      var.tags
    )
  }
}

# ──────────────────────────────────────────────────────────────────────────────
# Database Network & Security
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_db_subnet_group" "db" {
  name        = "${var.project_name}-${var.environment}-db-subnet-group"
  description = "Database subnet group for private subnets"
  subnet_ids  = var.subnet_ids

  tags = {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  }
}

resource "aws_security_group" "db" {
  name        = "${var.project_name}-${var.environment}-db-sg"
  description = "Allows database traffic from allowed security groups"
  vpc_id      = var.vpc_id

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-db-sg"
  }
}

# Inbound rules for each explicitly allowed security group
resource "aws_security_group_rule" "ingress_sgs" {
  count = length(var.allowed_security_group_ids)

  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.db.id
  source_security_group_id = var.allowed_security_group_ids[count.index]
  description              = "Allow PostgreSQL access from security group"
}

# ──────────────────────────────────────────────────────────────────────────────
# Master Credentials Management via AWS Secrets Manager
# ──────────────────────────────────────────────────────────────────────────────

resource "random_password" "master" {
  length  = 24
  special = false # Avoid special characters to prevent URI encoding issues
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${var.project_name}-${var.environment}-db-credentials"
  description             = "Database credentials for Aurora cluster"
  recovery_window_in_days = 0 # Force deletion immediately on destroy
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    engine   = "postgres"
    host     = aws_rds_cluster.db.endpoint
    port     = 5432
    username = "dbadmin"
    password = random_password.master.result
    database = var.database_name
  })
}

# ──────────────────────────────────────────────────────────────────────────────
# Aurora Serverless v2 Cluster
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_rds_cluster" "db" {
  cluster_identifier = "${var.project_name}-${var.environment}-db-cluster"
  engine             = "aurora-postgresql"
  engine_mode        = "provisioned" # Provisioned mode is required for Serverless v2 instances
  engine_version     = "16.1"
  database_name      = var.database_name
  master_username    = "dbadmin"
  master_password    = random_password.master.result

  db_subnet_group_name   = aws_db_subnet_group.db.name
  vpc_security_group_ids = [aws_security_group.db.id]

  backup_retention_period   = var.backup_retention_period
  preferred_backup_window   = "03:00-04:00"
  skip_final_snapshot       = true
  final_snapshot_identifier = "${var.project_name}-${var.environment}-db-cluster-final"

  storage_encrypted = true

  serverless_v2_scaling_configuration {
    min_capacity = var.min_capacity
    max_capacity = var.max_capacity
  }
}

resource "aws_rds_cluster_instance" "db_instances" {
  count = 2 # Deploy 2 instances across availability zones for High Availability

  identifier         = "${var.project_name}-${var.environment}-db-instance-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.db.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.db.engine
  engine_version     = aws_rds_cluster.db.engine_version
  db_subnet_group_name = aws_db_subnet_group.db.name

  tags = {
    Name = "${var.project_name}-${var.environment}-db-instance-${count.index + 1}"
  }
}
