# Blueprint Guide

Blueprints live under `blueprints/<slug>/`.

```text
blueprints/aws-example/
  blueprint.json
  versions/
    1.0.0/
      main.tf
      variables.tf
      outputs.tf
      versions.tf
      README.md
```

## `blueprint.json`

```json
{
  "slug": "aws-example",
  "name": "AWS Example",
  "description": "Small example blueprint.",
  "provider": "aws",
  "category": "example",
  "difficulty": "beginner",
  "tags": ["aws"],
  "versions": [
    {
      "version": "1.0.0",
      "sourceDir": "versions/1.0.0",
      "inputs": [
        {
          "name": "name",
          "label": "Name",
          "type": "text",
          "required": true
        },
        {
          "name": "admin_password",
          "label": "Admin password",
          "type": "sensitive",
          "required": true
        }
      ],
      "outputs": [
        {
          "name": "resource_id",
          "description": "Created resource identifier."
        }
      ]
    }
  ]
}
```

Supported input types include `text`, `number`, `boolean`, `select`, `region`, `cidr`, and `sensitive`. Mark secrets as `sensitive`; Stacksmith will not write them to `terraform.tfvars` or generated READMEs.

## Rules

- Pin provider version constraints in `versions.tf`.
- Prefer Terraform variables over template placeholders.
- Never template sensitive values into files.
- Keep generated output deterministic.
- Include clear README usage and cost notes.
- Document Terraform/OpenTofu compatibility.
- Add changelog notes for version changes.
- Preserve upgrade compatibility where practical.

## Prohibited Patterns

- Hard-coded secrets.
- Public resources without explicit warnings.
- Wildcard IAM permissions without justification.
- Long-lived AWS access keys.
- Embedded backend credentials.
- Arbitrary executable scripts.
- Unpinned third-party module sources.
- Generated Terraform state or `.terraform/` directories.

## Testing Expectations

At minimum, load the catalog with `npm run test`. For risky blueprints, add focused tests for required inputs, sensitive inputs, generated files, and validation behavior.
