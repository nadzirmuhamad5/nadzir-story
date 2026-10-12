// ---------------------------------------------------------------------------
// Helper server untuk API AI Nadzir Story (JANGAN diimpor dari client).
// ---------------------------------------------------------------------------

import fs from "fs/promises";
import path from "path";

export const ASSETS_DIR = path.join(process.cwd(), "db", "assets");

/** Simpan base64 (tanpa prefix data:) menjadi file di db/assets, kembalikan URL-nya. */
export async function saveBase64Asset(b64: string, filename: string): Promise<string> {
  await fs.mkdir(ASSETS_DIR, { recursive: true });
  await fs.writeFile(path.join(ASSETS_DIR, filename), Buffer.from(b64, "base64"));
  return `/api/assets/${filename}`;
}

/** Unduh file dari URL remote ke db/assets, kembalikan URL lokalnya. */
export async function downloadAsset(url: string, filename: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal mengunduh aset (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(ASSETS_DIR, { recursive: true });
  await fs.writeFile(path.join(ASSETS_DIR, filename), buf);
  return `/api/assets/${filename}`;
}

/** Ambil file gambar lokal (URL /api/assets/xxx) sebagai data URI base64. */
export async function localAssetAsDataUri(url: string): Promise<string | null> {
  try {
    const name = path.basename(url.split("?")[0] ?? "");
    if (!name) return null;
    const buf = await fs.readFile(path.join(ASSETS_DIR, name));
    const ext = path.extname(name).toLowerCase();
    const mime =
      ext === ".webp"
        ? "image/webp"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Ekstrak JSON dari balasan LLM (toleran terhadap markdown fence / teks lain).
 */
export function extractJson<T = unknown>(raw: string): T | null {
  let t = raw.trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/** Suffix prompt gaya visual (Inggris) dari id gaya. */
export function styleEnOf(id: string): string {
  const map: Record<string, string> = {
    cinematic:
      "cinematic film still, photorealistic, dramatic natural lighting, shallow depth of field, 35mm film grain",
    noir: "dark moody cinematic still, high contrast chiaroscuro lighting, film noir atmosphere, deep shadows",
    anime: "anime illustration, cel shaded, vibrant colors, detailed background art, studio quality",
    "cartoon3d":
      "3D animated movie still, pixar style, soft global illumination, expressive characters, polished render",
    comic: "graphic novel illustration, bold ink lines, halftone shading, dynamic composition",
    watercolor:
      "watercolor painting, soft pastel palette, paper texture, gentle brush strokes, storybook illustration",
    retro: "retro 1980s film photograph, warm faded colors, analog grain, vintage lens flare",
    fantasy:
      "epic fantasy concept art, volumetric light, rich saturated colors, highly detailed matte painting",
  };
  return map[id] ?? map["cinematic"];
}
