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
