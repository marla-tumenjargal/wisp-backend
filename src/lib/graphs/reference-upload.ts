import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function uploadGraphReference(options: {
  userId: string;
  graphId: string;
  file: File | Blob;
  mimeType: string;
  ext?: string;
}): Promise<{ publicUrl: string; path: string }> {
  if (!ALLOWED.has(options.mimeType)) {
    throw new Error("Reference must be a JPEG, PNG, WebP, or GIF");
  }

  const buffer = Buffer.from(await options.file.arrayBuffer());
  if (buffer.byteLength > 8 * 1024 * 1024) {
    throw new Error("Reference image must be under 8MB");
  }

  const ext =
    options.ext ||
    (options.mimeType === "image/png"
      ? "png"
      : options.mimeType === "image/webp"
        ? "webp"
        : options.mimeType === "image/gif"
          ? "gif"
          : "jpg");

  const path = `${options.userId}/${options.graphId}/reference.${ext}`;
  const admin = createAdminClient();

  const { error } = await admin.storage
    .from("graph-references")
    .upload(path, buffer, {
      contentType: options.mimeType,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = admin.storage.from("graph-references").getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}
