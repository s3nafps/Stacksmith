import { execFile } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import type {
  GeneratedFile,
  ValidationResult,
  CommandResult,
} from '@/types/deployment';

export interface ValidationInput {
  files: GeneratedFile[];
  toolPreference: 'terraform' | 'opentofu';
  deploymentId: string;
}

export interface InfrastructureValidator {
  validate(input: ValidationInput): Promise<ValidationResult>;
}

const COMMAND_TIMEOUT_MS = 60_000;

async function runCommand(
  command: string,
  args: string[],
  cwd: string
): Promise<CommandResult> {
  const startTime = Date.now();

  return new Promise<CommandResult>((resolve) => {
    const child = execFile(
      command,
      args,
      {
        cwd,
        timeout: COMMAND_TIMEOUT_MS,
        maxBuffer: 1024 * 1024, // 1MB
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        const durationMs = Date.now() - startTime;
        const exitCode =
          error && 'code' in error ? (error.code as number) ?? 1 : 0;
        resolve({
          command: `${command} ${args.join(' ')}`,
          exitCode,
          stdout: String(stdout),
          stderr: String(stderr),
          durationMs,
        });
      }
    );

    // Handle edge case where child process cannot be spawned
    child.on('error', () => {
      /* handled by execFile callback */
    });
  });
}

async function toolExists(tool: string): Promise<boolean> {
  const result = await runCommand(tool, ['--version'], os.tmpdir());
  return result.exitCode === 0;
}

export class TerraformValidator implements InfrastructureValidator {
  async validate(input: ValidationInput): Promise<ValidationResult> {
    const startTime = Date.now();
    const commands: CommandResult[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // Create temp directory
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), `infrapack-validate-${input.deploymentId}-`)
    );

    try {
      // Write all files to temp directory
      for (const file of input.files) {
        const filePath = path.join(tmpDir, file.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content, 'utf-8');
      }

      // Find the working directory (first directory that contains .tf files)
      const tfDir = await findTfDirectory(tmpDir);
      if (!tfDir) {
        return {
          status: 'skipped',
          commands: [],
          warnings: ['No .tf files found in generated output'],
          errors: [],
          securityFindings: [],
          durationMs: Date.now() - startTime,
        };
      }

      // Determine which tool to use
      let tool: string;
      const preferredTool =
        input.toolPreference === 'opentofu' ? 'tofu' : 'terraform';
      const fallbackTool =
        input.toolPreference === 'opentofu' ? 'terraform' : 'tofu';

      if (await toolExists(preferredTool)) {
        tool = preferredTool;
      } else if (await toolExists(fallbackTool)) {
        tool = fallbackTool;
        warnings.push(
          `Preferred tool "${preferredTool}" not found, falling back to "${fallbackTool}"`
        );
      } else {
        return {
          status: 'skipped',
          commands: [],
          warnings: [
            'Neither terraform nor tofu is available. Validation skipped.',
          ],
          errors: [],
          securityFindings: [],
          durationMs: Date.now() - startTime,
        };
      }

      // Run: fmt -check
      const fmtResult = await runCommand(tool, ['fmt', '-check', '-diff'], tfDir);
      commands.push(fmtResult);
      if (fmtResult.exitCode !== 0) {
        warnings.push('Terraform formatting issues detected');
      }

      // Run: init -backend=false
      const initResult = await runCommand(
        tool,
        ['init', '-backend=false', '-input=false', '-no-color'],
        tfDir
      );
      commands.push(initResult);
      if (initResult.exitCode !== 0) {
        errors.push(`${tool} init failed: ${initResult.stderr}`);
        return {
          status: 'failed',
          commands,
          warnings,
          errors,
          securityFindings: [],
          durationMs: Date.now() - startTime,
        };
      }

      // Run: validate
      const validateResult = await runCommand(
        tool,
        ['validate', '-no-color'],
        tfDir
      );
      commands.push(validateResult);
      if (validateResult.exitCode !== 0) {
        errors.push(`${tool} validate failed: ${validateResult.stderr}`);
        return {
          status: 'failed',
          commands,
          warnings,
          errors,
          securityFindings: [],
          durationMs: Date.now() - startTime,
        };
      }

      const finalStatus = errors.length > 0 ? 'failed' : 'passed';
      return {
        status: finalStatus,
        commands,
        warnings,
        errors,
        securityFindings: [],
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      errors.push(
        `Validation error: ${err instanceof Error ? err.message : String(err)}`
      );
      return {
        status: 'error',
        commands,
        warnings,
        errors,
        securityFindings: [],
        durationMs: Date.now() - startTime,
      };
    } finally {
      // Clean up temp directory
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        console.warn(`[validator] Failed to clean up temp dir: ${tmpDir}`);
      }
    }
  }
}

async function findTfDirectory(baseDir: string): Promise<string | null> {
  // Check the baseDir itself first
  const entries = await fs.readdir(baseDir, { withFileTypes: true });

  const hasTf = entries.some(
    (e) => e.isFile() && e.name.endsWith('.tf')
  );
  if (hasTf) return baseDir;

  // Check one level of subdirectories
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const subDir = path.join(baseDir, entry.name);
    const subEntries = await fs.readdir(subDir);
    if (subEntries.some((e) => e.endsWith('.tf'))) {
      return subDir;
    }
  }

  return null;
}
