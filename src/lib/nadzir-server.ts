// ---------------------------------------------------------------------------
// Helper server untuk API AI Nadzir Story (JANGAN diimpor dari client).
// ---------------------------------------------------------------------------

import fs from "fs/promises";
import path from "path";

import ZAI from "z-ai-web-dev-sdk";

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
 * Perbaiki JSON rusak yang sering dihasilkan LLM untuk teks panjang:
 * newline literal di dalam string, tanda kutip dialog yang tidak di-escape,
 * dan trailing comma. State machine sederhana yang sadar posisi string.
 */
function repairJson(input: string): string {
  const out: string[] = [];
  let inStr = false;
  let esc = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i] as string;
    if (inStr) {
      if (esc) {
        out.push(ch);
        esc = false;
        continue;
      }
      if (ch === "\\") {
        out.push(ch);
        esc = true;
        continue;
      }
      if (ch === '"') {
        // kutip penutup jika karakter non-spasi berikutnya adalah struktur JSON;
        // selain itu itu kutip konten (mis. dialog) -> escape
        let j = i + 1;
        while (j < input.length && /\s/.test(input[j] as string)) j++;
        const next = input[j];
        if (next === undefined || ",:}]".includes(next)) {
          inStr = false;
          out.push(ch);
        } else {
          out.push('\\"');
        }
        continue;
      }
      if (ch === "\n") {
        out.push("\\n");
        continue;
      }
      if (ch === "\r") continue;
      if (ch === "\t") {
        out.push("\\t");
        continue;
      }
      out.push(ch);
    } else {
      if (ch === '"') inStr = true;
      out.push(ch);
    }
  }
  return out.join("").replace(/,\s*([}\]])/g, "$1");
}

/**
 * Ekstrak JSON dari balasan LLM (toleran terhadap markdown fence / teks lain /
 * JSON rusak akibat kutip dialog & newline literal).
 */
export function extractJson<T = unknown>(raw: string): T | null {
  let t = raw.trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = Math.min(
    ...[t.indexOf("{"), t.indexOf("[")].filter((n) => n !== -1),
  );
  const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (!Number.isFinite(start) || end === -1 || end <= start) return null;
  const span = t.slice(start, end + 1);
  try {
    return JSON.parse(span) as T;
  } catch {
    // coba perbaiki JSON rusak khas LLM sebelum menyerah
    try {
      return JSON.parse(repairJson(span)) as T;
    } catch {
      return null;
    }
  }
}

/** Panggil LLM untuk satu giliran tanya-jawab teks (backend only). */
export async function llmComplete(system: string, user: string): Promise<string> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: system },
      { role: "user", content: user },
    ],
    thinking: { type: "disabled" },
  });
  return completion.choices[0]?.message?.content ?? "";
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
