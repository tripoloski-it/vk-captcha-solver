import { ICaptchaSensorData, ICaptchaSettings, IMouseTraceParams } from '../types';
import { getRandomInt } from '../utils';

export class CheckboxCaptchaSolver {
  private maxSensorsDataSizeKb = 900;

  public async solve(
    sensorsList: ICaptchaSettings['bridge_sensors_list'],
    mouseTraceParams?: IMouseTraceParams,
  ) {
    let cursor = this.generateMouseTrace(mouseTraceParams);

    const maxBytes = this.maxSensorsDataSizeKb * 1024;
    const avgBytesPerPoint = 20;

    let maxPoints = Math.floor(maxBytes / avgBytesPerPoint);

    if (cursor.length > maxPoints) {
      cursor = cursor.slice(0, maxPoints);
    }

    // @ts-ignore
    let sensors: Record<ICaptchaSettings['bridge_sensors_list'][number], ICaptchaSensorData[]> = {};

    for (const sensor of sensorsList) {
      sensors[sensor] = sensor === 'cursor' ? cursor : [];
    }

    return sensors;
  }

  private generateMouseTrace(params: IMouseTraceParams = {}): ICaptchaSensorData[] {
    const points: ICaptchaSensorData[] = [];
    let { from, to, intervalMs = 500, durationMs = getRandomInt(2000, 15_000) } = params;

    from ??= {
      x: getRandomInt(1080 / 2, 1080),
      y: getRandomInt(720 / 2, 720),
    };
    to ??= {
      x: getRandomInt(from.x - 300, from.x + 300),
      y: getRandomInt(from.y - 300, from.y + 300),
    };

    const totalSteps = Math.floor(durationMs / intervalMs);
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    for (let step = 0; step < totalSteps; step++) {
      const t = Math.min(1, step / totalSteps);

      const easedT = t * (2 - t);

      const noiseX = (Math.random() - 0.5) * 6;
      const noiseY = (Math.random() - 0.5) * 6;

      const x = Math.round(from.x + dx * easedT + noiseX);
      const y = Math.round(from.y + dy * easedT + noiseY);

      points.push({ x, y });
    }

    return points;
  }
}
