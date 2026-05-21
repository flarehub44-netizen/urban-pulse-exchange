import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "";

interface E {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: E[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/dashboard", changefreq: "hourly", priority: "0.9" },
          { path: "/markets", changefreq: "hourly", priority: "0.9" },
          { path: "/live", changefreq: "hourly", priority: "0.8" },
          { path: "/ranking", changefreq: "daily", priority: "0.7" },
          { path: "/feed", changefreq: "hourly", priority: "0.6" },
          { path: "/urbanmind", changefreq: "daily", priority: "0.7" },
          { path: "/wallet", changefreq: "daily", priority: "0.5" },
          { path: "/profile", changefreq: "daily", priority: "0.5" },
        ];
        const urls = entries.map(
          (e) =>
            `  <url><loc>${BASE_URL}${e.path}</loc>${e.changefreq ? `<changefreq>${e.changefreq}</changefreq>` : ""}${e.priority ? `<priority>${e.priority}</priority>` : ""}</url>`,
        );
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
