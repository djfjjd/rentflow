type R2BucketLike = {
  put: (key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }) => Promise<unknown>;
};

type UploadEnv = {
  RENTFLOW_UPLOADS?: R2BucketLike;
};

type UploadContext = {
  request: Request;
  env: UploadEnv;
};

export async function onRequestPost({ request, env }: UploadContext) {
  const formData = await request.formData();
  const file = formData.get("file");
  const metadataValue = formData.get("metadata");

  if (!(file instanceof File)) {
    return Response.json({ stored: false, error: "file is required" }, { status: 400 });
  }

  const metadata = parseMetadata(metadataValue);
  const key = buildUploadKey(metadata, file);
  const bucket = env.RENTFLOW_UPLOADS;

  if (!bucket) {
    return Response.json({
      stored: false,
      fallback: true,
      key,
      message: "RENTFLOW_UPLOADS R2 binding is not configured.",
    });
  }

  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type || "application/octet-stream",
    },
    customMetadata: toStringMetadata(metadata),
  });

  return Response.json({
    stored: true,
    key,
    url: `/uploads/${key}`,
  });
}

function parseMetadata(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return {};

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function buildUploadKey(metadata: Record<string, unknown>, file: File) {
  const uploadedAt = typeof metadata.uploadedAt === "string" ? new Date(metadata.uploadedAt) : new Date();
  const year = String(uploadedAt.getUTCFullYear());
  const month = String(uploadedAt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(uploadedAt.getUTCDate()).padStart(2, "0");
  const intakeType = sanitizeSegment(String(metadata.intakeType || "general"));
  const vehicleNumber = sanitizeSegment(String(metadata.vehicleNumber || "unknown"));
  const storedFileName = sanitizeSegment(String(metadata.storedFileName || file.name || "upload.bin"));

  return [year, month, day, intakeType, vehicleNumber, storedFileName].join("/");
}

function sanitizeSegment(value: string) {
  return value.trim().replace(/[\\/:*?"<>|#%{}^~[\]`]/g, "-") || "unknown";
}

function toStringMetadata(metadata: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value).slice(0, 1024)]),
  );
}
