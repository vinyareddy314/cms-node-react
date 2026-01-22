export type UserRole = 'admin' | 'editor' | 'viewer';

export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation_error'
  | 'internal_error';

export class ApiError extends Error {
  public status: number;
  public code: ApiErrorCode;
  public details?: unknown;

  constructor(opts: { status: number; code: ApiErrorCode; message: string; details?: unknown }) {
    super(opts.message);
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
  }
}


