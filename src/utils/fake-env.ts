import { IFakeBrowserEnvironment } from '../types';
import { getRandomInt } from './number';
import { x64hash128 } from './x64hash128';

const locales = ['en-US', 'ru-RU'];
const resolutions: [number, number][] = [
  [1920, 1080],
  [1366, 768],
  [1440, 900],
  [1536, 864],
  [1280, 720],
  [2560, 1440],
  [3840, 2160],
  [1600, 900],
  [1280, 1024],
  [2048, 1152],
];
const getRandomBoolean = () => Math.random() > 0.5;
const componentsToCanonicalString = (components: Record<string, { value: unknown }>) => {
  let result = '';
  for (const componentKey of Object.keys(components).sort()) {
    const component = components[componentKey];
    const value = 'error' in component ? 'error' : JSON.stringify(component.value);
    result += `${result ? '|' : ''}${componentKey.replace(/([:|\\])/g, '\\$1')}:${value}`;
  }
  return result;
};

export const generateFakeDesktopEnvironment = (): IFakeBrowserEnvironment => {
  const [screenWidth, screenHeight] = resolutions[Math.floor(Math.random() * resolutions.length)];

  const screenAvailWidth = screenWidth;
  const screenAvailHeight = Math.floor(screenHeight * (0.93 + Math.random() * 0.06));

  const innerWidth = Math.floor(screenAvailWidth * (0.65 + Math.random() * 0.35));
  const innerHeight = Math.floor(screenAvailHeight * (0.65 + Math.random() * 0.35));

  const devicePixelRatio = [1, 1.25, 1.5, 1.75, 2][Math.floor(Math.random() * 5)];

  const language = locales[Math.floor(Math.random() * locales.length)];
  const baseLang = language.split('-')[0] || 'en';
  const languages = [...new Set([language, baseLang, 'en', 'en-US'])];

  const hardwareConcurrency = [2, 4, 6, 8, 12, 16][Math.floor(Math.random() * 6)];
  const deviceMemory = [4, 8, 16, 32][Math.floor(Math.random() * 4)];

  return {
    screenWidth,
    screenHeight,
    screenAvailWidth,
    screenAvailHeight,
    innerWidth,
    innerHeight,
    devicePixelRatio,
    language,
    languages,
    webdriver: false,
    hardwareConcurrency,
    deviceMemory,
    connectionEffectiveType: '4g',
    notificationsPermission: 'denied',
  };
};

export const generateFakeFingerprintFromEnvironment = (env: IFakeBrowserEnvironment) => {
  const getRandomHash = (len = 16) =>
    Array.from({ length: len }, () => Math.random().toString(36)[2] || '0').join('');

  const {
    screenWidth,
    screenHeight,
    screenAvailWidth,
    screenAvailHeight,
    innerWidth,
    innerHeight,
    devicePixelRatio,
    language,
    languages,
    hardwareConcurrency,
    deviceMemory,
    webdriver,
  } = env;

  const platform = hardwareConcurrency >= 8 ? 'MacIntel' : 'Win32'; // условная логика
  const pixelDepth = [24, 32][getRandomInt(0, 1)];
  const userAgent =
    platform === 'MacIntel'
      ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
  const components = {
    userAgent: { value: userAgent, duration: getRandomInt(1, 5) },
    language: { value: language, duration: 0 },
    languages: { value: languages, duration: 0 },
    colorDepth: { value: pixelDepth, duration: 0 },
    deviceMemory: { value: deviceMemory, duration: 0 },
    hardwareConcurrency: { value: hardwareConcurrency, duration: 0 },
    screenResolution: { value: [screenWidth, screenHeight], duration: 0 },
    availableScreenResolution: { value: [screenAvailWidth, screenAvailHeight], duration: 0 },
    timezone: {
      value: Intl.DateTimeFormat().resolvedOptions().timeZone,
      duration: getRandomInt(1, 3),
    },
    timezoneOffset: { value: new Date().getTimezoneOffset(), duration: 0 },
    sessionStorage: { value: getRandomBoolean(), duration: 0 },
    localStorage: { value: getRandomBoolean(), duration: 0 },
    indexedDB: { value: getRandomBoolean(), duration: 0 },
    openDatabase: { value: getRandomBoolean(), duration: 0 },
    cpuClass: { value: null, duration: 0 },
    platform: { value: platform, duration: 0 },
    plugins: {
      value: ['Chrome PDF Plugin', 'Widevine Content Decryption Module'],
      duration: getRandomInt(2, 6),
    },
    mimeTypes: {
      value: ['application/pdf', 'video/mp4', 'audio/mpeg'],
      duration: getRandomInt(1, 4),
    },
    canvas: { value: getRandomHash(32), duration: getRandomInt(3, 10) },
    webgl: { value: getRandomHash(40), duration: getRandomInt(5, 12) },
    webglVendorAndRenderer: {
      value: {
        vendor: platform === 'MacIntel' ? 'Apple Inc.' : 'Google Inc.',
        renderer: platform === 'MacIntel' ? 'Apple GPU' : 'WebKit WebGL',
      },
      duration: 0,
    },
    audio: { value: getRandomHash(24), duration: getRandomInt(4, 9) },
    fonts: {
      value: [
        'Arial',
        'Times New Roman',
        'Courier New',
        'Helvetica',
        'Verdana',
        'Georgia',
        'Trebuchet MS',
        'Palatino',
        'Garamond',
        'Comic Sans MS',
      ].filter(() => Math.random() > 0.2),
      duration: getRandomInt(8, 20),
    },
    touchSupport: { value: { maxTouchPoints: 0, touchscreen: false }, duration: 0 },
    webdriver: { value: webdriver, duration: 0 },
    pixelRatio: { value: devicePixelRatio, duration: 0 },
    screenOrientation: { value: { angle: 0, type: 'landscape-primary' }, duration: 0 },
    connectionEffectiveType: { value: env.connectionEffectiveType, duration: 0 },
    notificationsPermission: { value: env.notificationsPermission, duration: 0 },
    innerWidth: { value: innerWidth, duration: 0 },
    innerHeight: { value: innerHeight, duration: 0 },
  };

  const componentsCanonicalString = componentsToCanonicalString(components);

  return x64hash128(componentsCanonicalString);
};
