export type ICaptchaBaseResponse = { status: 'OK' | 'ERROR' };

export type ICaptchaInitialParams = ICaptchaInitialParamsResponse & {
  readonly difficulty: number;
  readonly powInput: string;
  readonly captchaScriptUrl: string;
};

export interface ICaptchaInitialParamsResponse {
  readonly data: ICaptchaInitialData;
}

export interface ICaptchaInitialData {
  readonly variant: string;
  readonly domain: string;
  readonly session_token: string;
  readonly autofocus: string;
  readonly blank: string;
  readonly is_old_client: boolean;
  readonly show_captcha_type: 'checkbox' | 'slider';
  readonly captcha_settings: ICaptchaSetting[];
  readonly platform: string;
  readonly captcha_id: string;
  readonly logo_enabled: boolean;
}

export interface ICaptchaSetting {
  readonly type: string;
  readonly settings: string;
}

export interface ICaptchaSettings extends ICaptchaBaseResponse {
  readonly sensors_delay: number;
  readonly bridge_sensors_list: ['accelerometer', 'gyroscope', 'motion', 'cursor', 'taps'];
}

export interface ICaptchaContent extends ICaptchaBaseResponse {
  readonly extension: 'jpeg' | 'png';
  readonly image: string;
  readonly steps: number[];
  readonly track: string;
}

export interface ICaptchaSensorData {
  readonly x: number;
  readonly y: number;
}

export type ICaptchaCheckParams = Pick<ICaptchaInitialData, 'domain' | 'session_token'> &
  Record<ICaptchaSettings['bridge_sensors_list'][number], ICaptchaSensorData[]> & {
    readonly hash: string;
    readonly answer?: string;
    readonly debug_info: string;
    readonly connectionDownlink: number[];
    readonly connectionRtt: number[];
    readonly browser_fp: string;
  };

export interface ICaptchaCheck extends ICaptchaBaseResponse {
  readonly redirect: string;
  readonly show_captcha_type: string;
  readonly success_token: string;
}
