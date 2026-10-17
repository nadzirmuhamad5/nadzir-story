// ---------------------------------------------------------------------------
// Integrasi Gemini media (Nano Banana gambar, Veo video) — BACKEND ONLY.
// Mirror dari integrasi desktop Nadzir Story, versi REST API resmi Google
// Generative Language (v1beta) dengan kunci milik pengguna.
// JANGAN diimpor dari client.
// ---------------------------------------------------------------------------

import { db } from "@/lib/db";
import { saveBase64Asset } from "@/lib/nadzir-server";

const GL_BASE = "https://generativelanguage.googleapis.com/v1beta";

const GEMINI_KEY_SETTING = "gemini_api_key";

/** Ambil kunci Google AI Studio milik pengguna dari tabel Setting (boleh null). */
export async function getGeminiKey(): Promise<string | null> {
  const row = await db.setting.findUnique({ where: { key: GEMINI_KEY_SETTING } });
  const value = row?.value.trim();
  return value ? value : null;
}

/** Simpan / hapus (string kosong) kunci Gemini. */
export async function setGeminiKey(key: string): Promise<void> {
  const value = key.trim();
  if (!value) {
    await db.setting.deleteMany({ where: { key: GEMINI_KEY_SETTING } });
    return;
  }
  await db.setting.upsert({
    where: { key: GEMINI_KEY_SETTING },
    create: { key: GEMINI_KEY_SETTING, value },
    update: { key: GEMINI_KEY_SETTING, value },
  });
}

/** Terjemahkan error API ke pesan yang bisa dipahami (sama seperti versi desktop). */
function friendly(e: unknown): Error {
  const msg = (e as Error)?.message ?? String(e);
  if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED|401|403/i.test(msg))
    return new Error("Kunci Gemini ditolak. Periksa kunci di Pengaturan.");
  if (/RESOURCE_EXHAUSTED|429/i.test(msg))
    return new Error("Kuota Gemini habis atau terlalu banyak permintaan. Coba lagi sebentar.");
  if (/not found|404/i.test(msg))
    return new Error(`Model Gemini tidak tersedia untuk kunci ini: ${msg}`);
  if (/safety|blocked|PROHIBITED_CONTENT/i.test(msg))
    return new Error("Ditolak moderasi Gemini. Ubah prompt lalu coba lagi.");
  return new Error(`Gemini gagal: ${msg}`);
}

async function glFetch(path: string, init: RequestInit, key: string): Promise<Response> {
  const res = await fetch(`${GL_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "x-goog-api-key": key, ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? detail;
    } catch {
      // biarkan detail default
    }
    throw new Error(detail);
  }
  return res;
}

// ------------------------------------------------------------------ gambar

export type GeminiImageRequest = {
  api: string; // mis. "gemini-3-pro-image-preview"
  prompt: string;
  aspectRatio: string; // "16:9" | "1:1"
  imageSize?: string | null; // "1K" | "2K" | "4K" (hanya model yang mendukung)
};

/** Gambarkan satu gambar dengan model image-out Gemini; kembalikan base64 murni. */
export async function geminiGenerateImage(
  key: string,
  req: GeminiImageRequest,
): Promise<{ b64: string; mime: string }> {
  try {
    const res = await glFetch(
      `/models/${req.api}:generateContent`,
      {
        method: "POST",
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: req.prompt }] }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: {
              aspectRatio: req.aspectRatio,
              ...(req.imageSize ? { imageSize: req.imageSize } : {}),
            },
          },
        }),
      },
      key,
    );
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[];
    };
    const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part?.inlineData?.data) throw new Error("Gemini tidak mengirim gambar");
    return { b64: part.inlineData.data, mime: part.inlineData.mimeType ?? "image/png" };
  } catch (e) {
    throw friendly(e);
  }
}

// ------------------------------------------------------------------ video

export type GeminiVideoRequest = {
  api: string; // mis. "veo-3.1-generate-preview"
  prompt: string;
  imageB64?: string | null; // frame pertama (image-to-video) bila ada
  imageMime?: string | null;
  aspectRatio?: string;
  resolution?: string | null; // "720p" | "1080p"
  durationSeconds?: number;
  generateAudio?: boolean;
};

/** Mulai pekerjaan Veo; kembalikan nama operasi long-running untuk polling. */
export async function geminiStartVideo(key: string, req: GeminiVideoRequest): Promise<string> {
  try {
    const res = await glFetch(
      `/models/${req.api}:predictLongRunning`,
      {
        method: "POST",
        body: JSON.stringify({
          instances: [
            {
              prompt: req.prompt,
              ...(req.imageB64
                ? { image: { bytesBase64Encoded: req.imageB64, mimeType: req.imageMime ?? "image/png" } }
                : {}),
            },
          ],
          parameters: {
            aspectRatio: req.aspectRatio ?? "16:9",
            ...(req.resolution ? { resolution: req.resolution } : {}),
            durationSeconds: req.durationSeconds ?? 8,
            ...(req.generateAudio === false ? { generateAudio: false } : {}),
          },
        }),
      },
      key,
    );
    const data = (await res.json()) as { name?: string };
    if (!data.name) throw new Error("Gemini tidak mengirim operasi video");
    return data.name;
  } catch (e) {
    throw friendly(e);
  }
}

export type GeminiVideoPoll =
  | { state: "PROCESSING" }
  | { state: "SUCCESS"; b64: string }
  | { state: "FAIL"; message: string };

/** Poll satu kali operasi Veo; bila selesai langsung unduh MP4-nya. */
export async function geminiPollVideo(key: string, operationName: string): Promise<GeminiVideoPoll> {
  try {
    const res = await glFetch(`/${operationName}`, { method: "GET" }, key);
    const op = (await res.json()) as {
      done?: boolean;
      error?: { message?: string } | null;
      response?: {
        generatedVideos?: { video?: { uri?: string } }[];
        generateVideoResponse?: { generatedSamples?: { video?: { uri?: string } }[] };
      } | null;
    };
    if (op.error?.message) return { state: "FAIL", message: `Gemini gagal membuat video: ${op.error.message}` };
    if (!op.done) return { state: "PROCESSING" };
    const uri =
      op.response?.generatedVideos?.[0]?.video?.uri ??
      op.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ??
      null;
    if (!uri) return { state: "FAIL", message: "Gemini selesai tanpa file video" };
    const dl = await fetch(uri.includes("alt=media") ? uri : `${uri}${uri.includes("?") ? "&" : "?"}alt=media`, {
      headers: { "x-goog-api-key": key },
    });
    if (!dl.ok) throw new Error(`Gagal mengunduh video Gemini (HTTP ${dl.status})`);
    return { state: "SUCCESS", b64: Buffer.from(await dl.arrayBuffer()).toString("base64") };
  } catch (e) {
    return { state: "FAIL", message: friendly(e).message };
  }
}

/** Simpan hasil video Gemini ke db/assets, kembalikan URL lokal. */
export async function saveGeminiVideo(b64: string, filename: string): Promise<string> {
  return saveBase64Asset(b64, filename);
}
