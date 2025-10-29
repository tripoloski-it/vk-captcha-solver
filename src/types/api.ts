import { ICaptchaBaseResponse } from './captcha';

export interface IApiOptions {
  readonly version?: string;
  readonly baseUrl?: string;
  readonly headers?: Record<string, string>;
}

export interface IApiError {
  readonly error_code?: number;
  readonly error_msg?: string;
  readonly status?: string;
  readonly request_params: Array<Record<string, unknown>>;
}

export interface IApiSuccessResponse<T> {
  readonly success: true;
  readonly response: T;
}

export interface IApiErroredResponse {
  readonly success: false;
  readonly error: IApiError;
}

export type IApiResponse<T> =
  | IApiSuccessResponse<T>
  | (IApiErroredResponse & Partial<ICaptchaBaseResponse>);
