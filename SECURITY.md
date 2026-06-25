# Security Policy

## Reporting Vulnerabilities

Please use GitHub private vulnerability reporting when available. Do not open a public security issue.

Include:

- Affected commit or version
- Reproduction steps
- Impact and affected data
- Logs with secrets removed
- Whether demo/mock mode was enabled

## Supported Versions

Until the first release, only the default branch is supported.

## Security Architecture

Stacksmith generates Terraform files and pull requests. It must not apply customer infrastructure, host Terraform state, store permanent cloud credentials, or execute arbitrary custom Terraform on the web server. Custom blueprint validation is disabled until a real sandbox is implemented.

Demo authentication, mock GitHub, runner simulation, and mock billing are development-only unless a dedicated demo deployment explicitly opts in.
