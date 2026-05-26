import { supabase } from "@/integrations/supabase/client";

const BUCKET = "community-covers";
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function uploadCommunityCover(file: File, userId: string): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("invalid_cover_type");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("invalid_cover_size");
  }

  const ext = extForMime(file.type);
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new Error("cover_url_failed");
  return data.publicUrl;
}
