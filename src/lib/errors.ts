export class NocoDBRequestError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = 'NocoDBRequestError';
    this.status = status;
    this.data = data;
  }
}

export class NocoDBValidationError extends Error {
  issues: unknown[];

  constructor(message: string, issues: unknown[]) {
    super(message);
    this.name = 'NocoDBValidationError';
    this.issues = issues;
  }
}
