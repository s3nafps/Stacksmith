import { describe, expect, it } from 'vitest';
import { generateTfvars, renderTemplateStrict } from './template-engine';

describe('template engine', () => {
  it('renders strict placeholders', () => {
    expect(renderTemplateStrict('name = {{name}}', { name: 'api' })).toBe('name = api');
  });

  it('formats Terraform lists and maps', () => {
    const tfvars = generateTfvars({
      public_subnet_cidrs: '10.0.1.0/24,10.0.2.0/24',
      tags: 'team=platform,env=prod',
      enable_logs: true,
    });

    expect(tfvars).toContain('public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]');
    expect(tfvars).toContain('"team" = "platform"');
    expect(tfvars).toContain('enable_logs = true');
  });
});
