import { noStoreHeaders, safeText } from "../_d1-utils";

type Env = {
  GOOGLE_DRIVE_FOLDER_ID?: string;
};

export function onRequestGet({ env }: { env: Env }) {
  const folderId = safeText(env.GOOGLE_DRIVE_FOLDER_ID).trim();

  if (!folderId) {
    return Response.json(
      { error: "GOOGLE_DRIVE_FOLDER_ID is not configured" },
      { status: 500, headers: noStoreHeaders() },
    );
  }

  return Response.redirect(
    `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}?usp=drive_link`,
    302,
  );
}
