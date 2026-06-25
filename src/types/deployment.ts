import { z } from 'zod';

export const DeploymentConfigSchema = z.object({
  blueprintSlug: z.string().min(1),
  blueprintVersion: z.string(),
  repositoryId: z.union([z.string(), z.number()]).optional(),
  targetDir: z.string().min(1).default('infrastructure'),
  environmentName: z.string().min(1).default('production'),
  toolPreference: z.enum(['terraform', 'opentofu']).default('terraform'),
  inputs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  workspaceId: z.string().optional(),
});

export type DeploymentConfig = z.infer<typeof DeploymentConfigSchema>;

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface FileManifest {
  blueprintSlug: string;
  blueprintVersion: string;
  generatorVersion: string;
  deploymentId: string;
  generatedAt: string;
  managedFiles: string[];
}

export interface ValidationResult {
  status: 'passed' | 'failed' | 'error' | 'skipped';
  commands: CommandResult[];
  warnings: string[];
  errors: string[];
  securityFindings: SecurityFinding[];
  durationMs: number;
}

export interface CommandResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface SecurityFinding {
  severity: 'low' | 'medium' | 'high' | 'critical';
  rule: string;
  message: string;
  file?: string;
  line?: number;
}
