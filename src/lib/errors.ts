export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly internalId: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.internalId = crypto.randomUUID().slice(0, 8);
  }
}

export class ValidationError extends AppError {
  public readonly details: Record<string, string[]>;

  constructor(message: string, details: Record<string, string[]> = {}) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier: string) {
    super(`${resource} not found: ${identifier}`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  public readonly conflicts: string[];

  constructor(message: string, conflicts: string[] = []) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
    this.conflicts = conflicts;
  }
}

/**
 * Converts an error to a safe API response.
 * Strips internal details in production.
 */
export function toErrorResponse(error: unknown): {
  error: { message: string; code: string; id?: string; details?: Record<string, string[]> };
  status: number;
} {
  if (error instanceof AppError) {
    const response: {
      error: { message: string; code: string; id: string; details?: Record<string, string[]> };
      status: number;
    } = {
      error: {
        message: error.message,
        code: error.code,
        id: error.internalId,
      },
      status: error.statusCode,
    };

    if (error instanceof ValidationError) {
      response.error.details = error.details;
    }

    return response;
  }

  // Unknown errors - log internally, return generic message
  const internalId = crypto.randomUUID().slice(0, 8);
  console.error(`[${internalId}] Unhandled error:`, error);

  return {
    error: {
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      id: internalId,
    },
    status: 500,
  };
}
