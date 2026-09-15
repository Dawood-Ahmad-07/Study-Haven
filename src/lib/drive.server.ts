const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";

function headers() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_DRIVE_API_KEY"];
  if (!lovableKey || !connectionKey) {
    throw new Error("Google Drive is not connected yet.");
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connectionKey,
  };
}

export type DriveUpload = {
  driveFileId: string;
  mimeType: string;
  sizeBytes: number;
  viewUrl: string;
  thumbnailUrl: string;
};

/** Uploads a base64 payload to Drive and makes it readable by anyone with the link. */
export async function uploadToDrive(params: {
  name: string;
  mimeType: string;
  base64: string;
}): Promise<DriveUpload> {
  const boundary = `lovable-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name: params.name });

  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${params.mimeType}\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n` +
    `${params.base64}\r\n` +
    `--${boundary}--`;

  const res = await fetch(`${GATEWAY}/upload/drive/v3/files?uploadType=multipart&fields=id,mimeType,size`, {
    method: "POST",
    headers: {
      ...headers(),
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Drive upload failed [${res.status}]: ${text}`);
    throw new Error(`Upload to Google Drive failed [${res.status}]: ${text}`);
  }

  const file = (await res.json()) as { id: string; mimeType?: string; size?: string };

  const permRes = await fetch(`${GATEWAY}/drive/v3/files/${file.id}/permissions`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
  if (!permRes.ok) {
    const text = await permRes.text();
    console.error(`Drive share failed [${permRes.status}]: ${text}`);
    throw new Error(
      `File uploaded but could not be made viewable [${permRes.status}]: ${text}`,
    );
  }

  return {
    driveFileId: file.id,
    mimeType: file.mimeType ?? params.mimeType,
    sizeBytes: file.size ? Number(file.size) : 0,
    viewUrl: `https://drive.google.com/file/d/${file.id}/view`,
    thumbnailUrl: `https://drive.google.com/thumbnail?id=${file.id}&sz=w1200`,
  };
}

export async function deleteFromDrive(driveFileId: string): Promise<void> {
  const res = await fetch(`${GATEWAY}/drive/v3/files/${driveFileId}`, {
    method: "DELETE",
    headers: headers(),
  });
  // 404 means it is already gone — not an error for our purposes.
  if (!res.ok && res.status !== 404) {
    console.error(`Drive delete failed [${res.status}]: ${await res.text()}`);
  }
}
