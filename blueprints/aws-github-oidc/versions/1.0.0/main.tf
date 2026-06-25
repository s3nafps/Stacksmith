# ──────────────────────────────────────────────────────────────────────────────
# Provider Configuration
# ──────────────────────────────────────────────────────────────────────────────

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Blueprint   = "aws-github-oidc"
      Version     = "1.0.0"
    }
  }
}

# ──────────────────────────────────────────────────────────────────────────────
# Data Sources
# ──────────────────────────────────────────────────────────────────────────────

data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

# ──────────────────────────────────────────────────────────────────────────────
# Locals
# ──────────────────────────────────────────────────────────────────────────────

locals {
  oidc_provider_url = "token.actions.githubusercontent.com"
  role_name         = var.role_name != "" ? var.role_name : "${var.project_name}-${var.environment}-github-actions"

  # Build the subject claim for the trust policy
  # When branch is "*", allow any ref; otherwise, restrict to specific branch
  oidc_subject = var.github_branch == "*" ? "repo:${var.github_org}/${var.github_repo}:*" : "repo:${var.github_org}/${var.github_repo}:ref:refs/heads/${var.github_branch}"
}

# ──────────────────────────────────────────────────────────────────────────────
# IAM OIDC Identity Provider for GitHub Actions
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_iam_openid_connect_provider" "github" {
  url = "https://${local.oidc_provider_url}"

  client_id_list = ["sts.amazonaws.com"]

  # GitHub's OIDC thumbprint — AWS validates this against the OIDC provider's TLS cert
  # As of 2023+, AWS manages thumbprint validation for known providers,
  # but the field is still required by the API
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  tags = {
    Name = "${var.project_name}-${var.environment}-github-oidc"
  }
}

# ──────────────────────────────────────────────────────────────────────────────
# IAM Role with GitHub Actions Trust Policy
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_iam_role" "github_actions" {
  name                 = local.role_name
  max_session_duration = var.max_session_duration
  description          = "IAM role for GitHub Actions OIDC - ${var.github_org}/${var.github_repo}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${local.oidc_provider_url}:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "${local.oidc_provider_url}:sub" = local.oidc_subject
          }
        }
      }
    ]
  })

  tags = {
    Name       = local.role_name
    GitHubOrg  = var.github_org
    GitHubRepo = var.github_repo
  }
}

# ──────────────────────────────────────────────────────────────────────────────
# Attach Managed Policies
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_iam_role_policy_attachment" "github_actions" {
  count = length(var.policy_arns)

  role       = aws_iam_role.github_actions.name
  policy_arn = var.policy_arns[count.index]
}

# ──────────────────────────────────────────────────────────────────────────────
# Deny policy to prevent privilege escalation
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_iam_role_policy" "deny_privilege_escalation" {
  name = "${local.role_name}-deny-escalation"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyPrivilegeEscalation"
        Effect = "Deny"
        Action = [
          "iam:CreateUser",
          "iam:CreateRole",
          "iam:AttachRolePolicy",
          "iam:AttachUserPolicy",
          "iam:PutRolePolicy",
          "iam:PutUserPolicy",
          "iam:CreateAccessKey",
          "iam:CreateLoginProfile",
          "iam:UpdateAssumeRolePolicy",
          "iam:AddUserToGroup",
          "iam:CreateGroup",
          "iam:AttachGroupPolicy",
          "iam:PutGroupPolicy"
        ]
        Resource = "*"
      }
    ]
  })
}
