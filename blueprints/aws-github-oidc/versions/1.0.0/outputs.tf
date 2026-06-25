output "oidc_provider_arn" {
  description = "The ARN of the IAM OIDC identity provider."
  value       = aws_iam_openid_connect_provider.github.arn
}

output "role_arn" {
  description = "The ARN of the IAM role for GitHub Actions."
  value       = aws_iam_role.github_actions.arn
}

output "role_name" {
  description = "The name of the IAM role."
  value       = aws_iam_role.github_actions.name
}

output "github_actions_config_snippet" {
  description = "Sample GitHub Actions workflow snippet for using the OIDC role."
  value       = <<-EOT
    # Add this to your GitHub Actions workflow (.github/workflows/*.yml):
    #
    # permissions:
    #   id-token: write
    #   contents: read
    #
    # steps:
    #   - name: Configure AWS Credentials
    #     uses: aws-actions/configure-aws-credentials@v4
    #     with:
    #       role-to-assume: ${aws_iam_role.github_actions.arn}
    #       aws-region: ${var.aws_region}
  EOT
}
