/** Shared limits aligned with Supabase bucket `community-covers`. */
export const IMAGE_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_UPLOAD_MAX_WIDTH = 4096;
export const IMAGE_UPLOAD_MAX_HEIGHT = 4096;
export const IMAGE_UPLOAD_SANITIZE_QUALITY = 0.85;

export const IMAGE_UPLOAD_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ImageUploadMime = (typeof IMAGE_UPLOAD_ALLOWED_TYPES)[number];

const ALLOWED_SET = new Set<string>(IMAGE_UPLOAD_ALLOWED_TYPES);

export function extForImageMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function readFileMagicBytes(file: Blob, length = 12): Promise<Uint8Array> {
  const buf = await file.slice(0, length).arrayBuffer();
  return new Uint8Array(buf);
}

/** Detect MIME from file header only (not from `File.type`). */
export function detectImageMimeFromMagic(bytes: Uint8Array): ImageUploadMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function assertImageMagicBytes(bytes: Uint8Array, declaredMime: string): void {
  const detected = detectImageMimeFromMagic(bytes);
  if (!detected || detected !== declaredMime) {
    throw new Error("invalid_cover_content");
  }
}

export function assertClientImageLimits(file: File): void {
  if (!ALLOWED_SET.has(file.type)) {
    throw new Error("invalid_cover_type");
  }
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    throw new Error("invalid_cover_size");
  }
}

async function decodeImageBitmap(file: File, timeoutMs: number): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    return Promise.race([
      createImageBitmap(file),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("invalid_cover_content")), timeoutMs),
      ),
    ]);
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error("invalid_cover_content"));
    }, timeoutMs);

    img.onload = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("invalid_cover_content"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      createImageBitmap(canvas)
        .then(resolve)
        .catch(() => reject(new Error("invalid_cover_content")));
    };
    img.onerror = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      reject(new Error("invalid_cover_content"));
    };
    img.src = url;
  });
}

export async function assertImageDimensions(
  file: File,
  opts?: { maxWidth?: number; maxHeight?: number },
): Promise<{ width: number; height: number }> {
  const maxWidth = opts?.maxWidth ?? IMAGE_UPLOAD_MAX_WIDTH;
  const maxHeight = opts?.maxHeight ?? IMAGE_UPLOAD_MAX_HEIGHT;
  const bitmap = await decodeImageBitmap(file, 10_000);
  try {
    if (bitmap.width > maxWidth || bitmap.height > maxHeight) {
      throw new Error("invalid_cover_dimensions");
    }
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: ImageUploadMime,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

function outputMimeFor(file: File): ImageUploadMime {
  if (file.type === "image/png") return "image/png";
  if (file.type === "image/webp") return "image/webp";
  return "image/jpeg";
}

/**
 * Validate magic bytes + dimensions, then re-encode via canvas (strips EXIF/extra bytes).
 */
export async function sanitizeImageForUpload(file: File): Promise<File> {
  assertClientImageLimits(file);
  const magic = await readFileMagicBytes(file);
  assertImageMagicBytes(magic, file.type);
  await assertImageDimensions(file);

  const bitmap = await decodeImageBitmap(file, 10_000);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("invalid_cover_content");
    ctx.drawImage(bitmap, 0, 0);

    const outMime = outputMimeFor(file);
    const blob = await canvasToBlob(canvas, outMime, IMAGE_UPLOAD_SANITIZE_QUALITY);
    if (!blob) throw new Error("invalid_cover_content");
    if (blob.size > IMAGE_UPLOAD_MAX_BYTES) {
      throw new Error("invalid_cover_size");
    }

    const ext = extForImageMime(outMime);
    return new File([blob], `${crypto.randomUUID()}.${ext}`, { type: outMime });
  } finally {
    bitmap.close();
  }
}
