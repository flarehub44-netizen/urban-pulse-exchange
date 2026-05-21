import { toast } from "sonner";

export function buildAppUrl(path: string, search?: Record<string, string | undefined>) {
  if (typeof window === "undefined") return path;
  const url = new URL(path, window.location.origin);
  if (search) {
    for (const [k, v] of Object.entries(search)) {
      if (v) url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

export async function copyShareUrl(path: string, search?: Record<string, string | undefined>) {
  const url = buildAppUrl(path, search);
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  } catch {
    toast.message("Copie o link", { description: url });
  }
}
