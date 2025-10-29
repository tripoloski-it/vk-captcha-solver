import { IApiError } from '../../types';

export class APIError extends Error {
  public code?: number;
  public status?: string;

  constructor(error: IApiError, method: string) {
    if (typeof error.status !== 'undefined') {
      super(`[Status: ${error.status}]${method ? ` (${method}) ` : ` `}${error.error_msg}`);
    } else {
      super(`[Code: ${error.error_code}]${method ? ` (${method}) ` : ` `}${error.error_msg}`);
    }

    this.name = 'APIError';
    if (error.error_code) this.code = error.error_code;
    if (error.status) this.status = error.status;
  }
}
