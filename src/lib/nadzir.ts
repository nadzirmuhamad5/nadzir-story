// ---------------------------------------------------------------------------
// Tipe & helper bersama untuk Nadzir Story Web Studio (aman untuk client)
// ---------------------------------------------------------------------------

export type ProjectSummary = {
  id: string;
  title: string;
  genre: string;
  style: string;
  logline: string;
  updatedAt: string;
  sceneCount: number;
  imageCount: number;
  videoCount: number;
  coverUrl: string | null;
};

export type CharacterData = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
};

export type SceneData = {
  id: string;
  order: number;
  title: string;
  narration: string;
  imagePrompt: string;
  videoPrompt: string;
  imageUrl: string | null;
  videoUrl: string | null;
  videoTaskId: string | null;
  videoProvider: string | null; // null = Z.AI bawaan; "gemini" = Veo; "higgsfield" = HF
  status: string; // draft | video-processing | video-ready | video-failed
};

export type ProjectDetail = {
  id: string;
  title: string;
  genre: string;
  style: string;
  premise: string;
  logline: string;
  story: string;
  updatedAt: string;
  characters: CharacterData[];
  scenes: SceneData[];
};

// ---------------------------------------------------------------------------

export const GENRES = [
  "Drama",
  "Komedi",
  "Horor",
  "Fantasi",
  "Aksi & Petualangan",
  "Sci-Fi",
  "Misteri & Thriller",
  "Romansa",
  "Dokumenter",
  "Fabel Anak",
] as const;

export type StyleOption = { id: string; label: string; en: string };

export const STYLES: StyleOption[] = [
  {
    id: "cinematic",
    label: "Cinematic Realistis",
    en: "cinematic film still, photorealistic, dramatic natural lighting, shallow depth of field, 35mm film grain",
  },
  {
    id: "noir",
    label: "Sinematik Gelap",
    en: "dark moody cinematic still, high contrast chiaroscuro lighting, film noir atmosphere, deep shadows",
  },
  {
    id: "anime",
    label: "Anime 2D",
    en: "anime illustration, cel shaded, vibrant colors, detailed background art, studio quality",
  },
  {
    id: "cartoon3d",
    label: "Kartun 3D",
    en: "3D animated movie still, pixar style, soft global illumination, expressive characters, polished render",
  },
  {
    id: "comic",
    label: "Komik / Graphic Novel",
    en: "graphic novel illustration, bold ink lines, halftone shading, dynamic composition",
  },
  {
    id: "watercolor",
    label: "Cat Air Ceria",
    en: "watercolor painting, soft pastel palette, paper texture, gentle brush strokes, storybook illustration",
  },
  {
    id: "retro",
    label: "Retro Film 80-an",
    en: "retro 1980s film photograph, warm faded colors, analog grain, vintage lens flare",
  },
  {
    id: "fantasy",
    label: "Fantasi Epik",
    en: "epic fantasy concept art, volumetric light, rich saturated colors, highly detailed matte painting",
  },
];

export function styleLabelOf(id: string): string {
  return STYLES.find((s) => s.id === id)?.label ?? "Cinematic Realistis";
}

// ---------------------------------------------------------------------------
// Katalog model media (Z.AI bawaan + Gemini & Higgsfield milik pengguna)
// ---------------------------------------------------------------------------

export type MediaProvider = "zai" | "gemini" | "higgsfield";

export type MediaModelOption = {
  id: string; // "bawaan", "gemini:<api>", atau "hf:<endpoint>"
  provider: MediaProvider;
  label: string;
  kind: "image" | "video";
};

/** Model bawaan (Z.AI via SDK aplikasi) — gratis, tanpa kunci. */
export const BAWAAN_IMAGE: MediaModelOption = {
  id: "bawaan",
  provider: "zai",
  label: "Z.AI (bawaan)",
  kind: "image",
};
export const BAWAAN_VIDEO: MediaModelOption = {
  id: "bawaan",
  provider: "zai",
  label: "Z.AI (bawaan)",
  kind: "video",
};

// Gemini image & video (kunci Google AI Studio milik pengguna)
const GEMINI_IMAGE: MediaModelOption[] = [
  { id: "gemini:gemini-3-pro-image-preview", provider: "gemini", label: "Nano Banana Pro (Gemini, 4K)", kind: "image" },
  { id: "gemini:gemini-2.5-flash-image", provider: "gemini", label: "Nano Banana (Gemini, cepat)", kind: "image" },
];
const GEMINI_VIDEO: MediaModelOption[] = [
  { id: "gemini:veo-3.1-generate-preview", provider: "gemini", label: "Veo 3.1 (Gemini)", kind: "video" },
  { id: "gemini:veo-3.1-fast-generate-preview", provider: "gemini", label: "Veo 3.1 Fast (Gemini)", kind: "video" },
  { id: "gemini:veo-3.0-generate-001", provider: "gemini", label: "Veo 3 (Gemini)", kind: "video" },
];

// Higgsfield (kunci API KEY_ID:KEY_SECRET milik pengguna; endpoint dari katalog desktop)
const HF_IMAGE_ENDPOINTS: [string, string][] = [
  ["higgsfield-ai/soul/v2/standard", "Soul 2"],
  ["higgsfield-ai/soul/cinema", "Soul Cinema"],
  ["higgsfield-ai/soul/standard", "Soul"],
  ["marketing-studio/image/sunburst", "GPT Image 2.5 · Sunburst"],
  ["marketing-studio/image/flare", "GPT Image 2.5 · Flare"],
  ["marketing-studio/image", "Marketing Studio 2.0"],
  ["xai/grok-imagine-image-2.0", "Grok Image 2.0"],
  ["recraft/v4.1/pro/text-to-image", "Recraft V4.1 Pro"],
  ["recraft/v4.1/utility/pro/text-to-image", "Recraft V4.1 Utility Pro"],
  ["ideogram/v4.0", "Ideogram 4.0"],
  ["alibaba/qwen-image-3/text-to-image", "Qwen Image 3"],
  ["z-image/turbo", "Z-Image Turbo"],
];
const HF_VIDEO_ENDPOINTS: [string, string][] = [
  ["kling-video/v3.0/std/image-to-video", "Kling 3.0 · Standard"],
  ["kling-video/v3.0/pro/image-to-video", "Kling 3.0 · Pro"],
  ["kling-video/v3.0-turbo/image-to-video", "Kling 3.0 · Turbo"],
  ["kling-video/v3.0/4k/image-to-video", "Kling 3.0 · 4K"],
  ["kling-video/v2.6/pro/image-to-video", "Kling 2.6 · Pro"],
  ["bytedance/seedance-2.5/image-to-video", "Seedance 2.5"],
  ["alibaba/wan-3.0/image-to-video", "Wan 3.0"],
  ["minimax/hailuo-2.3/standard/image-to-video", "Hailuo 2.3 · Standard"],
  ["pixverse/v6/image-to-video", "PixVerse V6"],
  ["lightricks/ltx-2.5/image-to-video/pro", "LTX-2.5 · Pro"],
  ["lightricks/ltx-2.5/image-to-video/fast", "LTX-2.5 · Fast"],
  ["xai/grok-imagine-video/v1.5/reference-to-video", "Grok Imagine Video 1.5"],
  ["kling-video/omni/image-reference", "Kling Omni · Image Reference"],
  ["higgsfield/cinema-studio/4.0", "Cinema Studio 4.0"],
];

const hf = (endpoint: string, name: string, kind: "image" | "video"): MediaModelOption => ({
  id: `hf:${endpoint}`,
  provider: "higgsfield",
  label: `${name} (Higgsfield)`,
  kind,
});

export const IMAGE_MODELS: MediaModelOption[] = [
  BAWAAN_IMAGE,
  ...GEMINI_IMAGE,
  ...HF_IMAGE_ENDPOINTS.map(([e, n]) => hf(e, n, "image")),
];

export const VIDEO_MODELS: MediaModelOption[] = [
  BAWAAN_VIDEO,
  ...GEMINI_VIDEO,
  ...HF_VIDEO_ENDPOINTS.map(([e, n]) => hf(e, n, "video")),
];

export function imageModelOf(id: string): MediaModelOption {
  return IMAGE_MODELS.find((m) => m.id === id) ?? IMAGE_MODELS[0];
}

export function videoModelOf(id: string): MediaModelOption {
  return VIDEO_MODELS.find((m) => m.id === id) ?? VIDEO_MODELS[0];
}

/**
 * Nilai Scene.videoProvider untuk model terpilih: null = bawaan Z.AI,
 * "gemini" = Veo milik pengguna, "higgsfield" = pekerjaan Higgsfield.
 */
export function videoProviderFlagOf(modelId: string): string | null {
  const m = videoModelOf(modelId);
  return m.provider === "zai" ? null : m.provider;
}

export type HfKeyTestInfo = { ok: boolean; message: string };

export type SettingsInfo = {
  geminiKeySet: boolean;
  geminiKeyHint: string | null;
  higgsfieldKeySet: boolean;
  higgsfieldKeyHint: string | null;
  higgsfieldTest?: HfKeyTestInfo | null;
};

export function styleEnOf(id: string): string {
  return STYLES.find((s) => s.id === id)?.en ?? STYLES[0].en;
}

// ---------------------------------------------------------------------------

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const message =
      (body as { error?: string } | null)?.error ?? `Permintaan gagal (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
