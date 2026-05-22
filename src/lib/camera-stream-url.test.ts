import { describe, expect, it } from "vitest";
import { classifyStreamUrl, isAllowedStreamUrl, youtubeEmbed } from "./camera-stream-url";

describe("isAllowedStreamUrl", () => {
  it("allows HLS and snapshots", () => {
    expect(isAllowedStreamUrl("https://cdn.example.com/live/index.m3u8")).toBe(true);
    expect(isAllowedStreamUrl("https://cam.example.com/snapshot.jpg")).toBe(true);
  });

  it("rejects RTSP/RTMP", () => {
    expect(isAllowedStreamUrl("rtsp://192.168.0.1/stream")).toBe(false);
    expect(isAllowedStreamUrl("rtmp://live.example/app")).toBe(false);
  });

  it("allows empty", () => {
    expect(isAllowedStreamUrl(null)).toBe(true);
    expect(isAllowedStreamUrl("")).toBe(true);
  });
});

describe("classifyStreamUrl", () => {
  it("classifies HLS", () => {
    expect(classifyStreamUrl("https://x.com/a/index.m3u8")).toBe("hls");
  });

  it("classifies unsupported protocols", () => {
    expect(classifyStreamUrl("rtsp://x")).toBe("unsupported");
  });
});

describe("youtubeEmbed", () => {
  it("embeds watch URLs", () => {
    expect(youtubeEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toContain("embed/dQw4w9WgXcQ");
  });
});
