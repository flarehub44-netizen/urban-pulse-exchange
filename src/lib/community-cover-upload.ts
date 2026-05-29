import { supabase } from "@/integrations/supabase/client";
import { extForImageMime, sanitizeImageForUpload } from "@/lib/image-upload-guard";

const BUCKET = "community-covers";

export async function uploadCommunityCover(file: File, userId: string): Promise<string> {
  const sanitized = await sanitizeImageForUpload(file);

  const ext = extForImageMime(sanitized.type);
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, sanitized, {
    cacheControl: "3600",
    upsert: false,
    contentType: sanitized.type,
  });
  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new Error("cover_url_failed");
  return data.publicUrl;
}
