export interface IFakeBrowserEnvironment {
  screenWidth: number;
  screenHeight: number;
  screenAvailWidth: number;
  screenAvailHeight: number;
  innerWidth: number;
  innerHeight: number;
  devicePixelRatio: number;
  language: string;
  languages: string[];
  webdriver: boolean;
  hardwareConcurrency: number;
  deviceMemory: number;
  connectionEffectiveType: string;
  notificationsPermission: string;
}
