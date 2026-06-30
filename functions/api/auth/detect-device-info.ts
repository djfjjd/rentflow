import { detectDeviceInfo } from "../../../lib/device-detection";

export const onRequest: PagesFunction = async ({ request }) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    deviceOwnerType?: string;
    device_owner_type?: string;
    officePcType?: string;
    office_pc_type?: string;
  };
  const info = detectDeviceInfo({
    userAgent: request.headers.get("User-Agent") || "",
    platform: request.headers.get("Sec-CH-UA-Platform") || "",
    deviceOwnerType: body.deviceOwnerType || body.device_owner_type,
    officePcType: body.officePcType || body.office_pc_type,
    name: body.name,
  });
  return Response.json({ ok: true, ...info });
};
