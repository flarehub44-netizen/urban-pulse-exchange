export async function shareWin(opts: {
  text: string;
  url: string;
}): Promise<"shared" | "copied" | "failed"> {
  if (typeof navigator === "undefined") return "failed";

  if (navigator.share) {
    try {
      await navigator.share({ title: "ViaX — Previsões Urbanas", text: opts.text, url: opts.url });
      return "shared";
    } catch {
      // user cancelled or API unavailable
    }
  }

  try {
    await navigator.clipboard.writeText(`${opts.text} ${opts.url}`);
    return "copied";
  } catch {
    return "failed";
  }
}
