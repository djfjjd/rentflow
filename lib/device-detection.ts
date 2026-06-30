export type DeviceType = "mobile" | "tablet" | "desktop";
import { officePcLabel } from "./office-pc-policy";

export function detectDeviceType(userAgent: string): DeviceType {
  const ua = userAgent || "";
  if (/iPad|Tablet|Kindle|Silk/i.test(ua)) return "tablet";
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return "tablet";
  if (/iPhone|iPod/i.test(ua)) return "mobile";
  if (/Android.*Mobile|Mobile.*Android/i.test(ua)) return "mobile";
  if (/Macintosh/i.test(ua) && /Mobile/i.test(ua)) return "tablet";
  return "desktop";
}

export function deviceTypeLabel(type: string) {
  if (type === "mobile") return "모바일";
  if (type === "tablet") return "태블릿";
  return "데스크탑";
}

export function isDesktopDevice(type: string) {
  return type === "desktop";
}

export type DetectedDeviceInfoInput = {
  userAgent: string;
  platform?: string;
  deviceOwnerType?: string;
  officePcType?: string;
  name?: string;
};

export function detectDeviceInfo(input: DetectedDeviceInfoInput) {
  const userAgent = input.userAgent || "";
  const os = detectOs(userAgent, input.platform || "");
  const browser = detectBrowser(userAgent);
  const deviceType = detectDeviceType(userAgent);
  const baseModel = detectDeviceModel(userAgent, os);
  const officeName = input.deviceOwnerType === "office_pc" ? officePcLabel(input.officePcType || "") : "";
  const cleanName = String(input.name || "").trim();
  const deviceName = officeName && officeName !== "-"
    ? officeName
    : cleanName && /iPhone|iPad|Galaxy|Android/i.test(baseModel)
      ? `${cleanName}님의 ${baseModel.split(" / ")[0]}`
      : baseModel.split(" / ")[0] || deviceTypeLabel(deviceType);

  return {
    deviceName,
    deviceAlias: deviceName,
    deviceModel: `${baseModel} / ${browser}`.replace(/\s+\/\s+$/, ""),
    deviceType,
    os,
    browser,
  };
}

export function detectBrowser(userAgent: string) {
  const ua = userAgent || "";
  if (/Edg\//i.test(ua)) return "Edge";
  if (/CriOS|Chrome\//i.test(ua)) return "Chrome";
  if (/FxiOS|Firefox\//i.test(ua)) return "Firefox";
  if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
  if (/Safari\//i.test(ua) && !/Chrome|CriOS|Android/i.test(ua)) return "Safari";
  return "알 수 없음";
}

export function detectOs(userAgent: string, platform = "") {
  const ua = userAgent || "";
  const source = `${platform} ${ua}`;
  const iosVersion = ua.match(/(?:iPhone OS|CPU OS)\s([\d_]+)/i)?.[1]?.replaceAll("_", ".");
  if (/iPhone|iPad|iPod/i.test(source)) return iosVersion ? `iOS ${iosVersion}` : "iOS";
  const androidVersion = ua.match(/Android\s([\d.]+)/i)?.[1];
  if (/Android/i.test(source)) return androidVersion ? `Android ${androidVersion}` : "Android";
  if (/Windows NT 10/i.test(source)) return "Windows 11";
  if (/Windows/i.test(source)) return "Windows";
  if (/Mac OS X/i.test(source)) return "macOS";
  if (/Linux/i.test(source)) return "Linux";
  return "알 수 없음";
}

export function detectDeviceModel(userAgent: string, os: string) {
  const ua = userAgent || "";
  if (/iPhone/i.test(ua)) return /iPhone17|iPhone18/i.test(ua) ? `iPhone 16 Pro / ${os}` : `iPhone / ${os}`;
  if (/iPad/i.test(ua)) return `iPad / ${os}`;
  if (/SM-S92|Galaxy S24/i.test(ua)) return `Galaxy S24 / ${os}`;
  const androidModel = ua.match(/Android[^;)]*;\s*([^;)]+)\)/i)?.[1]?.trim();
  if (androidModel) return `${androidModel} / ${os}`;
  if (/Macintosh|Mac OS/i.test(ua)) return `MacBook Air M1 / ${os}`;
  if (/Windows/i.test(ua)) return os;
  if (/Linux/i.test(ua)) return os;
  return `${deviceTypeLabel(detectDeviceType(ua))} / ${os}`;
}
