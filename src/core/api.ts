import { debug as createDebug } from 'debug';
import {
  IApiOptions,
  IApiResponse,
  ICaptchaCheck,
  ICaptchaCheckParams,
  ICaptchaContent,
  ICaptchaInitialData,
  ICaptchaInitialParams,
  ICaptchaInitialParamsResponse,
  ICaptchaSettings,
} from '../types';
import { safeJSONParse } from '../utils';
import { APIError, HTTPError, VKCaptchaSolverError } from './errors';

const debug = createDebug('vk-captcha-solver:api');

export class API {
  private version: string;
  private baseUrl: string;
  private headers?: Record<string, string>;

  constructor(options?: IApiOptions) {
    this.version = options?.version || '5.199';
    this.baseUrl = options?.baseUrl || 'https://api.vk.ru';
    this.headers = options?.headers;
  }

  /** Получает страницу (iframe) с капчей, и парсит параметры */
  public async getInitialParams(url: string): Promise<ICaptchaInitialParams> {
    const fetchResponse = await fetch(url);
    const html = await fetchResponse.text();

    const [, powInput] = html.match(/const powInput\s*=\s*"([^']+)";/i) || [];
    if (typeof powInput !== 'string') {
      throw new VKCaptchaSolverError(
        `Missing required value: "powInput" not found in page content.`,
      );
    }

    const [, rawDifficulty] = html.match(/const difficulty\s*=\s*(\d+);/) || [];
    if (typeof rawDifficulty !== 'string') {
      throw new VKCaptchaSolverError(
        `Missing required value: "difficulty" not found in page content.`,
      );
    }
    const difficulty = Number(rawDifficulty);

    const matched = html.match(
      /window\.init\s*=\s*({[\s\S]*?});\s*(?=\s*window\.lang|<\/script>|$)/,
    )?.[1];

    if (!matched) {
      throw new VKCaptchaSolverError(
        `Missing required value: "window.init" not found in page content.`,
      );
    }

    const initialParams: ICaptchaInitialParamsResponse = safeJSONParse(matched);
    if (!initialParams) {
      throw new VKCaptchaSolverError('Invalid window.init data');
    }

    return {
      data: initialParams.data,
      difficulty,
      powInput,
    };
  }
  /** Получает настройки капчи */
  public async getSettings(
    params: Pick<ICaptchaInitialData, 'session_token' | 'domain'>,
  ): Promise<ICaptchaSettings> {
    const settings = await this.call<ICaptchaSettings>('captchaNotRobot.settings', {
      session_token: params.session_token,
      domain: params.domain,
    });

    return settings;
  }
  /** Получет контент капчи (Только для "slider" капчи) */
  public async getContent(
    params: Pick<
      ICaptchaInitialData,
      'session_token' | 'domain' | 'captcha_settings' | 'show_captcha_type'
    >,
  ): Promise<ICaptchaContent> {
    const settings = params.captcha_settings.find(
      setting => setting.type === params.show_captcha_type,
    )?.settings;

    const content = await this.call<ICaptchaContent>('captchaNotRobot.getContent', {
      session_token: params.session_token,
      domain: params.domain,
      captcha_settings: settings,
    });
    return content;
  }
  /** Отправляет событие "Компонент готов/загружен" */
  public async componentDone(
    params: Pick<ICaptchaInitialData, 'session_token' | 'domain'>,
  ): Promise<void> {
    await this.call('captchaNotRobot.componentDone', {
      session_token: params.session_token,
      domain: params.domain,
    });
  }
  /** Отправляет на проверку данные решенной капчи */
  public async check(params: ICaptchaCheckParams): Promise<ICaptchaCheck> {
    const check = await this.call<ICaptchaCheck>('captchaNotRobot.check', params);
    return check;
  }
  /** Отправляет событие "Сессия завершена" */
  public async endSession(params: Pick<ICaptchaInitialData, 'session_token' | 'domain'>) {
    await this.call('captchaNotRobot.endSession', {
      session_token: params.session_token,
      domain: params.domain,
    });
  }

  private async call<T extends object>(method: string, params: Record<string, any>): Promise<T> {
    const requestParams: Record<string, any> = { ...params, v: this.version };
    const serializedEntries: Array<[string, string]> = Object.entries(requestParams).map(
      ([key, value]) => {
        if (value == null) return [key, ''];
        if (value instanceof Array) return [key, value.toString()];
        if (typeof value === 'object') return [key, JSON.stringify(value)];
        return [key, String(value)];
      },
    );
    const body = new URLSearchParams(serializedEntries);
    const url = new URL(`/method/${method}`, this.baseUrl);

    debug('Request %s %o', method, requestParams);
    const fetchResponse = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...this.headers,
      },
      body,
    });

    if (!fetchResponse.ok) {
      throw new HTTPError(fetchResponse.status, fetchResponse.statusText, url.toString());
    }

    const data = (await fetchResponse.json()) as IApiResponse<T>;
    debug('Response %s %o', method, data);

    if ('error' in data) {
      throw new APIError(data.error, method);
    }

    if (
      'status' in data.response &&
      typeof data.response.status === 'string' &&
      data.response.status !== 'OK'
    ) {
      throw new APIError(
        {
          status: data.response.status,
          error_msg: 'Bad method status',
          request_params: [...body.entries()].map(([key, value]) => ({ key, value })),
        },
        method,
      );
    }

    return data.response;
  }
}

new API().endSession({ domain: '', session_token: '' }).then(console.log).catch(console.log);
