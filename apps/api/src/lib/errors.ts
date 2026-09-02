export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function appErrorHandler(error: unknown): {
  statusCode: number;
  body: { error: { code: string; message: string; details?: unknown } };
} {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
    };
  }
  return {
    statusCode: 500,
    body: { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
  };
}
