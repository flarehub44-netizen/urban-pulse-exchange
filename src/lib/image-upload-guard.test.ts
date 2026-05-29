import { describe, expect, it } from "vitest";
import {
  assertClientImageLimits,
  assertImageMagicBytes,
  detectImageMimeFromMagic,
  IMAGE_UPLOAD_MAX_BYTES,
} from "@/lib/image-upload-guard";

/** Minimal valid 1×1 PNG (89 bytes). */
const PNG_1X1 = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);

const JPEG_HEADER = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

const WEBP_HEADER = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

describe("detectImageMimeFromMagic", () => {
  it("detects PNG", () => {
    expect(detectImageMimeFromMagic(PNG_1X1)).toBe("image/png");
  });

  it("detects JPEG", () => {
    expect(detectImageMimeFromMagic(JPEG_HEADER)).toBe("image/jpeg");
  });

  it("detects WebP", () => {
    expect(detectImageMimeFromMagic(WEBP_HEADER)).toBe("image/webp");
  });

  it("returns null for unknown bytes", () => {
    expect(detectImageMimeFromMagic(new Uint8Array([0x00, 0x01, 0x02]))).toBeNull();
  });
});

describe("assertImageMagicBytes", () => {
  it("accepts matching PNG declaration", () => {
    expect(() => assertImageMagicBytes(PNG_1X1, "image/png")).not.toThrow();
  });

  it("rejects MIME mismatch (polyglot / spoofed type)", () => {
    expect(() => assertImageMagicBytes(JPEG_HEADER, "image/png")).toThrow("invalid_cover_content");
    expect(() => assertImageMagicBytes(PNG_1X1, "text/plain")).toThrow("invalid_cover_content");
  });
});

describe("assertClientImageLimits", () => {
  it("rejects disallowed MIME", () => {
    const file = new File([PNG_1X1], "x.svg", { type: "image/svg+xml" });
    expect(() => assertClientImageLimits(file)).toThrow("invalid_cover_type");
  });

  it("rejects oversize file", () => {
    const big = new Uint8Array(IMAGE_UPLOAD_MAX_BYTES + 1);
    const file = new File([big], "big.jpg", { type: "image/jpeg" });
    expect(() => assertClientImageLimits(file)).toThrow("invalid_cover_size");
  });

  it("accepts allowed type within size", () => {
    const file = new File([PNG_1X1], "ok.png", { type: "image/png" });
    expect(() => assertClientImageLimits(file)).not.toThrow();
  });
});
