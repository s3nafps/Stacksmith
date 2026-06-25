import { z } from 'zod';

export const BlueprintInputType = z.enum([
  'text', 'number', 'boolean', 'select', 'region', 'cidr', 'domain', 'sensitive',
]);

export const BlueprintInputSchema = z.object({
  name: z.string().min(1),
  type: BlueprintInputType,
  label: z.string().min(1),
  description: z.string().optional(),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  required: z.boolean().default(true),
  placeholder: z.string().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    message: z.string().optional(),
  }).optional(),
});

export const BlueprintOutputSchema = z.object({
  name: z.string(),
  description: z.string(),
});

export const BlueprintVersionSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  changelog: z.string().optional(),
  sourceDir: z.string(),
  inputs: z.array(BlueprintInputSchema),
  outputs: z.array(BlueprintOutputSchema),
  files: z.record(z.string(), z.string()).optional(),
});


export const BlueprintMetadataSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().min(1),
  provider: z.enum(['aws']),
  category: z.string().min(1),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedDeployTime: z.string().optional(),
  tags: z.array(z.string()),
  architectureSummary: z.string().optional(),
  securityNotes: z.string().optional(),
  versions: z.array(BlueprintVersionSchema).min(1),
  ownerId: z.string().nullable().optional(),
});

export type BlueprintInput = z.infer<typeof BlueprintInputSchema>;
export type BlueprintOutput = z.infer<typeof BlueprintOutputSchema>;
export type BlueprintVersion = z.infer<typeof BlueprintVersionSchema>;
export type BlueprintMetadata = z.infer<typeof BlueprintMetadataSchema>;
export type BlueprintInputType = z.infer<typeof BlueprintInputType>;
