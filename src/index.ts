import { subtle } from 'crypto';
import { API, CheckboxCaptchaSolver, SliderCaptchaSolver } from './core';
import { VKCaptchaSolverError } from './core/errors';
import { IApiOptions, ICaptchaCheckParams } from './types';

export class CaptchaSolver {
  private api: API;
  private knownCaptchaTypes = ['slider', 'checkbox'];

  constructor(apiOptions?: IApiOptions) {
    this.api = new API(apiOptions);
  }

  public async solve(redirectUri: string) {
    const initial = await this.api.getInitialParams(redirectUri);

    if (!this.knownCaptchaTypes.includes(initial.data.show_captcha_type)) {
      throw new VKCaptchaSolverError('Unknown captcha type.');
    }

    const settings = await this.api.getSettings(initial.data);
    const hash = await this.generatePoW(initial.powInput, initial.difficulty);

    let checkParams: ICaptchaCheckParams = {
      domain: initial.data.domain,
      session_token: initial.data.session_token,
      hash,
      answer: 'e30=',
      accelerometer: [],
      cursor: [],
      gyroscope: [],
      motion: [],
      taps: [],
    };
    if (initial.data.show_captcha_type === 'checkbox') {
      await this.api.componentDone(initial.data);

      const solver = new CheckboxCaptchaSolver();
      const params = await solver.solve(settings.bridge_sensors_list);
      checkParams = { ...checkParams, ...params };
    } else {
      const content = await this.api.getContent(initial.data);
      await this.api.componentDone(initial.data);

      const sliderSolver = new SliderCaptchaSolver();
      const params = await sliderSolver.solve(content);
      checkParams = {
        ...checkParams,
        answer: Buffer.from(JSON.stringify({ value: params.selectedSwaps })).toString('base64'),
      };
    }

    const response = await this.api.check(checkParams);
    await this.api.endSession(initial.data);

    return response.success_token;
  }

  private async computeHashWithNonce(input: string, nonce: number) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input + nonce);
    const hashBuffer = await subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  private async generatePoW(input: string, difficulty: number) {
    let nonce = 0;
    let hash = '';

    while (!hash.startsWith('0'.repeat(difficulty))) {
      nonce++;
      hash = await this.computeHashWithNonce(input, nonce);
    }

    return hash;
  }
}
