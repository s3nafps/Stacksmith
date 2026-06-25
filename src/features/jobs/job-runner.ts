export interface Job<T = unknown> {
  id: string;
  type: string;
  data: T;
  deploymentId: string;
}

export interface JobResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface JobRunner {
  enqueue<T>(job: Job<T>): Promise<string>;
  getStatus(jobId: string): Promise<JobStatus>;
  getResult(jobId: string): Promise<JobResult | null>;
}

export type JobHandler<T = unknown> = (data: T) => Promise<JobResult>;

/**
 * In-process job runner.
 * Executes jobs immediately and stores results in memory.
 * Suitable for development and single-instance deployments.
 */
export class InProcessJobRunner implements JobRunner {
  private statuses = new Map<string, JobStatus>();
  private results = new Map<string, JobResult>();
  private handlers = new Map<string, JobHandler>();

  /**
   * Register a handler for a given job type.
   */
  registerHandler<T>(type: string, handler: JobHandler<T>): void {
    this.handlers.set(type, handler as JobHandler);
  }

  async enqueue<T>(job: Job<T>): Promise<string> {
    this.statuses.set(job.id, 'pending');

    const handler = this.handlers.get(job.type);
    if (!handler) {
      this.statuses.set(job.id, 'failed');
      this.results.set(job.id, {
        success: false,
        error: `No handler registered for job type: ${job.type}`,
      });
      return job.id;
    }

    // Execute immediately but asynchronously
    this.statuses.set(job.id, 'running');

    // Fire and forget — caller awaits the enqueue, not the execution
    void this.executeJob(job, handler);

    return job.id;
  }

  private async executeJob<T>(job: Job<T>, handler: JobHandler): Promise<void> {
    try {
      const result = await handler(job.data);
      this.statuses.set(job.id, result.success ? 'completed' : 'failed');
      this.results.set(job.id, result);
    } catch (err) {
      this.statuses.set(job.id, 'failed');
      this.results.set(job.id, {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async getStatus(jobId: string): Promise<JobStatus> {
    return this.statuses.get(jobId) ?? 'pending';
  }

  async getResult(jobId: string): Promise<JobResult | null> {
    return this.results.get(jobId) ?? null;
  }
}

// Singleton for the application
let jobRunnerInstance: InProcessJobRunner | null = null;

export function getJobRunner(): InProcessJobRunner {
  if (!jobRunnerInstance) {
    jobRunnerInstance = new InProcessJobRunner();
  }
  return jobRunnerInstance;
}
