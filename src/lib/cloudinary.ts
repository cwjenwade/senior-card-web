import crypto from "node:crypto";

type CloudinaryUploadResult = {
  imageUrl: string;
  imageKey: string;
  provider: "cloudinary";
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export function isCloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

function buildSignature(params: Record<string, string>, apiSecret: string) {
  const payload = Object.entries(params)
    .filter(([, value]) => value.length > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return crypto.createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

export async function uploadCardImageToCloudinary(file: File) {
  const cloudName = requireEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = requireEnv("CLOUDINARY_API_KEY");
  const apiSecret = requireEnv("CLOUDINARY_API_SECRET");
  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || "jenny/cards";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const params = {
    folder,
    timestamp,
  };
  const signature = buildSignature(params, apiSecret);

  const formData = new FormData();
  formData.set("file", file);
  formData.set("api_key", apiKey);
  formData.set("timestamp", timestamp);
  formData.set("folder", folder);
  formData.set("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Cloudinary upload failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    secure_url?: string;
    public_id?: string;
  };

  if (!payload.secure_url || !payload.public_id) {
    throw new Error("Cloudinary upload response missing secure_url or public_id");
  }

  return {
    imageUrl: payload.secure_url,
    imageKey: payload.public_id,
    provider: "cloudinary",
  } satisfies CloudinaryUploadResult;
}
