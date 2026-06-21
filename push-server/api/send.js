import webpush from "web-push";

const {
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  PUSH_SERVER_SECRET
} = process.env;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:djfjjd@gmail.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      message: "method-not-allowed"
    });
  }

  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");

  if (!PUSH_SERVER_SECRET || token !== PUSH_SERVER_SECRET) {
    return res.status(401).json({
      ok: false,
      message: "unauthorized"
    });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return res.status(500).json({
      ok: false,
      message: "vapid-not-configured"
    });
  }

  try {
    const { subscription, payload } = req.body || {};

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        ok: false,
        message: "subscription-required"
      });
    }

    const messagePayload = JSON.stringify(payload || {
      title: "RentFlow 알림",
      body: "새 알림이 있습니다.",
      url: "/app",
      tag: "rentflow-notification"
    });

    const result = await webpush.sendNotification(
      subscription,
      messagePayload
    );

    return res.status(200).json({
      ok: true,
      message: "sent",
      statusCode: result.statusCode,
      headers: result.headers,
      endpointPrefix60: subscription.endpoint.slice(0, 60),
      provider: subscription.endpoint.includes("web.push.apple.com")
        ? "apple"
        : subscription.endpoint.includes("fcm.googleapis.com")
        ? "fcm"
        : "unknown"
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "send-failed",
      error: error.message,
      statusCode: error.statusCode || 0,
      body: error.body || "",
      stack: error.stack || ""
    });
  }
}
