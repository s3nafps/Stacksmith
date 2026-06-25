output "cluster_endpoint" {
  description = "The read-write endpoint connection string of the cluster."
  value       = aws_rds_cluster.db.endpoint
}

output "cluster_reader_endpoint" {
  description = "The read-only endpoint connection string of the cluster."
  value       = aws_rds_cluster.db.reader_endpoint
}

output "database_name" {
  description = "The default database name."
  value       = var.database_name
}

output "secret_arn" {
  description = "The ARN of the Secrets Manager secret containing database connection credentials."
  value       = aws_secretsmanager_secret.db_credentials.arn
}
