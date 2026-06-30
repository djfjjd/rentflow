export type DeviceType = "mobile" | "tablet" | "desktop";

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
