import { subtle } from 'crypto';
import { API, CheckboxCaptchaSolver, SliderCaptchaSolver } from './core';
import { VKCaptchaSolverError } from './core/errors';
import { IApiOptions, ICaptchaCheckParams } from './types';
import {
  generateFakeDesktopEnvironment,
  generateFakeFingerprintFromEnvironment,
  getRandomFloat,
  getRandomInt,
} from './utils';

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
    const rtt = getRandomInt(40, 60);
    const downlink = getRandomFloat(3, 5);
    const device = generateFakeDesktopEnvironment();

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
      connectionRtt: Array.from({ length: 5 }, () => rtt),
      connectionDownlink: Array.from({ length: 5 }, () => downlink),
      debug_info: '8b9092c2b38acd31ab388f70d97d82f8dccf50233aa8dfeac2cbd1fb16c08474',
      browser_fp: generateFakeFingerprintFromEnvironment(device),
    };
    if (initial.data.show_captcha_type === 'checkbox') {
      await this.api.componentDone({
        ...initial.data,
        device,
        browser_fp: '',
      });

      const solver = new CheckboxCaptchaSolver();
      const params = await solver.solve(settings.bridge_sensors_list);
      checkParams = { ...checkParams, ...params };
    } else {
      const content = await this.api.getContent(initial.data);
      await this.api.componentDone({
        ...initial.data,
        device,
        browser_fp: '',
      });

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

new CaptchaSolver({
  headers: {
    Cookie:
      'remixlang=0; remixstlid=9059353928166811458_nIzSfhdbErhzVWXKky4lGD4RInylRQ7jdRqFfMLSv90; remixua=43%7C-1%7C180%7C2875305996; remixstid=1263054831_AjbBkDlXQ57xFs1p38Z3v48q7PqysMRSzO6ZTDWGkcH; remixdark_color_scheme=1; remixcolor_scheme_mode=auto; remixdt=0; remixsf=1; remixuacck=35bc9e2f4b8d3d8284; remixuas=MThkYmI3OTJiYjMyMmVkYTk3MTkwYjhl; remixsuc=1%3A; remixnttpid=vk1.a.YTyMN6lU-YgbRjm-5pH3CsVpenwMhRqBOo2EBs4HgdF61Nut6x71dM86R_C0HsijjS3XaaTBiAAM2tpquRdbDiBOlQ_QfmKw7z62KGrVqllFHqD6-oB4ElacGzSMtqBa5E_bG06nbBwGEzDNXfUgjiEMPf5eg5E7kMIS9FsNljkDVzAjEgTxUB1-K-hneHP5; remixdmgr=fb4c1ebd2903dd39e6214b4914d68c741ece2129246cdb82a9bfe1b6ffd92258; prcl=bb357538ca4216; remixpuad=Q7yyfSmDyr7ePacGMSdplAGitGKDesgmIhZM9hgUmkQ; remixsid=1_MUxl1Pb7Xd14v8QpIoFmPLuMEm3rJxUsACQE9RsVNCAr_lwYsBb5zlcze-g1W0e_oQyMY4uCfXEC031VF42f_g; remixcurr_audio=null; remixmaudio=null; adblock=0; httoken=voNOQqbtwTX2NBm-J1kjCRt4gyqqH-sCLeuL6wus0URS3n6ljJZt--lp2g7enxO8Y1y_VBLMbn02izjN06_HCDinKYZYAIUxbuXmfegPa8fOq_LkbleUKO3tHQGMlnQK_kg',
  },
})
  .solve(
    'https://id.vk.ru/not_robot_captcha?domain=vk.com&session_token=eyJhbGciOiJBMjU2R0NNS1ciLCJlbmMiOiJBMjU2R0NNIiwiaXYiOiJyeHE2UTQtZlM1ZGY1S0hGIiwia2lkIjoiZjhmNzBmMjctYmQ5ZS00YmIyLTkwN2ItZGZjYjhlMDcxMGMzIiwidGFnIjoiRlRsa3VBbXoyMFpMZEhHOVJ6X1UxZyIsInppcCI6IkRFRiJ9.-0NvuCi8a9uB3FiDtTbi1che4Aai5FWhwZXnLmQ6V1M.wlJFvVPTVuVrFX16.xcX4YyT3C8cepe0vRFsUJhoZGCDoS7yYyflqpQm5jcaZ7L2bQTxViiCGvO8MMAR_0hEoC-jRymaYvmSprNy4TMEGBLqOrjf039L6tAqZohVvjL2OPH1JXkVCbGq1CVdZV-0wdEwItgKfkdtLqS9jBn8Tnk91fJTJXHe6p_xir8zUmVWgdG3aIhjB1L-bSRNfBy7ty5L0FHdI-dfM205uP9gkGGlPFg-g-ZW3GBYAofQANB8-QDrsPe8Ut3lqfhN6uLqfGe2hIEW06pQ3YrQOZQwsPPbbVvVwfAdq_MEhGmoeWI6qITnmJM6beesfZu1inUIdmdzjeYzcOIZXfmz5IRdY0P7vzhn7AFGkVOhxh_QAQW5JJr7O7uZ85YlSrOhEGiotSZi3VpyaL2P1fg5i-PO6QLm2ail1Am4v1B7fMbwXS_tsNAdBXuzyLUdVolIpz5OzgJBmqSi4Mp8d3WLJ7knketUsPvlcYMAa2xhSO94e3VHKZFtN4Sx63RjtDdLgpoyQ_nVwqHIbjMtamRQ20x19RNy_kbTbfMFsB-9gXKmNTUkWLJH-zPAQmcnUC4ynIGKNfx098vYgRma9lR_HjhWBR07XtjrCBrKt3O9Gn41aK9s2_GSarknmb3E_nB_z67OXQaHwLevuYudKcE7_32bMvqrprgbjtbQL1L-_CAhoMuC0-daWxhdff0jb57HmVRC83l1_AoGds-_kBDIuKje4t5TYYbI-7rUMFX2PB814MAlsREwdeSa8aw-NRe2XBMY8brs_KeIIsa5j13pics5G2ldktmAyvJozaAE6Bzp09sxW22yQlrtr1vJcwWRoC8Px6SuvMsrHNdVnTRRyi0gIKyKo-ttofKbku5uM6dTdqAeux-VS3JjSMcmMg6yubaKco7dRmnAgdjg053D_UIWAJthwF_raRbroi-q4Xdd1n-adwaVcSDsEuNLFr01ymmqGLrBM2sgq9QzZB9ljM-vQVUnu461L4VEEH6MioV-1rsObkaxfgkybhnq-t1419pUf_55eCik6uToP-GKo-yzfQ0BqXt3lUGeyZHzrDYQHyJ-wL-JrmriR6hSU7I-TN4dgTw4xCOMS6dOSx5hAoXhU7uN5cOHx2g.LtW5-m28c7QfzlCQ5GfkdA&variant=popup&blank=1',
  )
  .then(success_token => {
    console.log('Success:', success_token);
  })
  .catch(console.error);
