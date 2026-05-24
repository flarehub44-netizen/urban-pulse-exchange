/**
 * Client-side preset definitions for camera providers.
 * The authoritative validation runs server-side in the
 * `admin_create_camera_upstream` SQL function.
 */
export type CameraProvider = "der-sp" | "cet-sp" | "motiva" | "custom";

export type CameraKind = "hls" | "image";

export type ProviderPreset = {
  id: CameraProvider;
  label: string;
  description: string;
  defaultKind: CameraKind;
  /** Returns null if URL matches preset host, else an error message. */
  validate: (url: string) => string | null;
  placeholder: string;
};

function host(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export const CAMERA_PROVIDERS: ProviderPreset[] = [
  {
    id: "der-sp",
    label: "DER-SP",
    description: "Departamento de Estradas de Rodagem · SP-055, SP-125, etc.",
    defaultKind: "hls",
    placeholder: "https://34.104.32.249.nip.io/SP055-KM083/stream.m3u8",
    validate: (u) => {
      const h = host(u);
      if (!h) return "URL inválida";
      if (!h.endsWith(".nip.io")) return "DER-SP exige host *.nip.io";
      return null;
    },
  },
  {
    id: "cet-sp",
    label: "CET-SP",
    description: "Companhia de Engenharia de Tráfego · São Paulo capital (snapshot JPG)",
    defaultKind: "image",
    placeholder: "https://cameras.cetsp.com.br/Cams/23/2.jpg",
    validate: (u) => {
      const h = host(u);
      if (!h) return "URL inválida";
      if (h !== "cameras.cetsp.com.br" && h !== "cetsp.com.br" && h !== "www.cetsp.com.br")
        return "CET-SP exige host cameras.cetsp.com.br";
      return null;
    },
  },
  {
    id: "motiva",
    label: "Motiva",
    description: "Rodovias Motiva (ex-CCR) · BR-116, BR-101, etc.",
    defaultKind: "hls",
    placeholder: "https://d3b8201cy0qzzb.cloudfront.net/.../index_1.m3u8",
    validate: (u) => {
      const h = host(u);
      if (!h) return "URL inválida";
      if (!h.endsWith(".cloudfront.net")) return "Motiva exige host *.cloudfront.net";
      return null;
    },
  },
  {
    id: "custom",
    label: "Outro (custom)",
    description: "Qualquer URL HTTPS — sem headers de provedor",
    defaultKind: "hls",
    placeholder: "https://exemplo.com/stream.m3u8",
    validate: (u) => {
      try {
        const parsed = new URL(u);
        if (parsed.protocol !== "https:") return "URL deve ser HTTPS";
        return null;
      } catch {
        return "URL inválida";
      }
    },
  },
];

export function getProvider(id: CameraProvider): ProviderPreset {
  return CAMERA_PROVIDERS.find((p) => p.id === id) ?? CAMERA_PROVIDERS[3];
}
