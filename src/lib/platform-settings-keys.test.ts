import { describe, expect, it } from "vitest";
import { adminUpdateSettingSchema } from "@/lib/platform-settings-keys";
import { httpsUrlSchema } from "@/lib/url-validation";

describe("adminUpdateSettingSchema", () => {
  it("accepts known boolean keys", () => {
    const res = adminUpdateSettingSchema.safeParse({
      key: "casino_enabled",
      value: true,
    });
    expect(res.success).toBe(true);
  });

  it("rejects unknown keys", () => {
    const res = adminUpdateSettingSchema.safeParse({
      key: "cpf_hmac_secret",
      value: "leak",
    });
    expect(res.success).toBe(false);
  });

  it("rejects wrong value type for numeric keys", () => {
    const res = adminUpdateSettingSchema.safeParse({
      key: "max_stake",
      value: "not-a-number",
    });
    expect(res.success).toBe(false);
  });
});

describe("httpsUrlSchema", () => {
  it("accepts https URLs", () => {
    expect(httpsUrlSchema.safeParse("https://example.com/img.png").success).toBe(true);
  });

  it("rejects javascript URLs", () => {
    expect(httpsUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });

  it("rejects http URLs", () => {
    expect(httpsUrlSchema.safeParse("http://example.com/img.png").success).toBe(false);
  });
});
