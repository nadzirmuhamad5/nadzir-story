// ---------------------------------------------------------------------------
// Integrasi Higgsfield (Soul, Kling, Seedance, Wan, Hailuo, dst) — BACKEND ONLY.
// Mirror integrasi desktop Nadzir Story: submit -> poll -> unduh, dengan kunci
// KEY_ID:KEY_SECRET milik pengguna (disimpan di tabel Setting).
// Katalog & request body dibangun dari higgsfield-catalog.json (skema resmi
// docs.higgsfield.ai), jadi model baru cukup tambah entri katalog.
// JANGAN diimpor dari client.
// ---------------------------------------------------------------------------

import { randomUUID } from "crypto";

import catalog from "./higgsfield-catalog.json";
import { db } from "@/lib/db";

const BASE = "https://api.higgsfield.ai";

const HF_KEY_SETTING = "higgsfield_api_key";

/** Ambil kunci Higgsfield milik pengguna dari tabel Setting (boleh null). */
export async function getHfKey(): Promise<string | null> {
  const row = await db.setting.findUnique({ where: { key: HF_KEY_SETTING } });
  const value = row?.value.trim();
  return value ? value : null;
}

/** Simpan / hapus (string kosong) kunci Higgsfield. */
export async function setHfKey(key: string): Promise<void> {
  const value = key.trim();
  if (!value) {
    await db.setting.deleteMany({ where: { key: HF_KEY_SETTING } });
    return;
  }
  await db.setting.upsert({
    where: { key: HF_KEY_SETTING },
    create: { key: HF_KEY_SETTING, value },
    update: { key: HF_KEY_SETTING, value },
  });
}

// ------------------------------------------------------------------ skema model

export type HfFieldSchema = {
  type?: string;
  enum?: (string | number)[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  maxLength?: number;
};

export type HfModelSpec = {
  id: string;
  name: string;
  family: string;
  kind: "image" | "video";
  /** Ke mana gambar klip (video) masuk dalam request. */
  input: { field: string | null; mode: "none" | "first-frame" | "reference"; max: number };
  required: string[];
  props: Record<string, HfFieldSchema>;
  durations: { values?: number[]; min?: number; max?: number } | null;
  tags: string[];
};

const MODELS = (catalog as { models: HfModelSpec[] }).models;

/** Model Higgsfield berdasarkan endpoint (mis. "kling-video/v3.0/std/image-to-video"). */
export function hfModelOf(id: string): HfModelSpec | null {
  return MODELS.find((m) => m.id === id) ?? null;
}

// ------------------------------------------------------------------ error & http

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Error Higgsfield dengan status HTTP + tanda bisa-diretry (concurrency/5xx). */
export class HfError extends Error {
  status: number;
  retryable: boolean;

  constructor(status: number, detail: string) {
    super(describeHfError(status, detail));
    this.status = status;
    this.retryable = (status === 400 && /concurrent/i.test(detail)) || status >= 500;
  }
}

function describeHfError(status: number, detail: string): string {
  if (status === 401)
    return 'Kunci Higgsfield tidak valid. Tempel ulang hasil tombol "Copy API key" dari console Higgsfield di Pengaturan.';
  if (status === 403)
    return "Kredit Higgsfield tidak cukup. Isi ulang di dashboard Higgsfield.";
  if (status === 400 && /concurrent/i.test(detail))
    return "Terlalu banyak proses bersamaan di Higgsfield.";
  if (status === 404 || status === 423 || status === 503)
    return `Model ini belum bisa dipakai akun Higgsfield kamu (${detail}).`;
  if (status >= 500) return `Server Higgsfield sedang bermasalah (${status}).`;
  return `Higgsfield menolak permintaan: ${detail}`;
}

async function hfFetch<T>(
  path: string,
  init: RequestInit & { cred?: string } = {},
): Promise<T> {
  const cred = init.cred ?? (await getHfKey());
  const url = path.startsWith("http") ? path : `${BASE}/${path.replace(/^\//, "")}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Key ${cred ?? ""}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      detail = (await res.text()).slice(0, 400);
    } catch {
      // biarkan detail default
    }
    throw new HfError(res.status, detail);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

/** Kirim pekerjaan generasi; diretry otomatis saat kena limit konkurensi akun. */
export async function hfSubmit(
  endpoint: string,
  body: Record<string, unknown>,
  cred?: string,
): Promise<string> {
  const idem = randomUUID();
  for (let attempt = 0; ; attempt++) {
    try {
      const out = await hfFetch<{ request_id: string }>(
        endpoint,
        {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Idempotency-Key": idem },
        },
      );
      if (!out.request_id) throw new Error("Higgsfield tidak mengirim request_id");
      return out.request_id;
    } catch (e) {
      if (e instanceof HfError && e.retryable && attempt < 3) {
        await sleep(4000 + attempt * 3000);
        continue;
      }
      throw e;
    }
  }
}

// ------------------------------------------------------------------ polling

export type HfStatus = "queued" | "in_progress" | "completed" | "failed" | "nsfw" | "canceled";

export type HfPoll =
  | { state: "PROCESSING" }
  | { state: "SUCCESS"; imageUrl: string | null; videoUrl: string | null }
  | { state: "FAIL"; message: string };

/** Poll satu kali status request; error dilempar agar pemanggil bisa membedakan. */
export async function hfPollOnce(requestId: string, cred?: string): Promise<HfPoll> {
  const r = await hfFetch<{
    status: HfStatus;
    images?: { url: string }[];
    video?: { url: string };
    error?: string;
  }>(`requests/${requestId}/status`, { method: "GET", cred });
  if (r.status === "completed")
    return { state: "SUCCESS", imageUrl: r.images?.[0]?.url ?? null, videoUrl: r.video?.url ?? null };
  if (r.status === "failed")
    return { state: "FAIL", message: `Higgsfield gagal membuat hasil: ${r.error ?? "tanpa keterangan"}` };
  if (r.status === "nsfw")
    return { state: "FAIL", message: "Ditolak moderasi Higgsfield. Ubah prompt lalu coba lagi." };
  if (r.status === "canceled") return { state: "FAIL", message: "Permintaan dibatalkan." };
  return { state: "PROCESSING" };
}

/** Submit gambar lalu tunggu sampai selesai (biasanya 10-90 detik, maks 6 menit). */
export async function hfGenerateImageWait(
  endpoint: string,
  body: Record<string, unknown>,
  cred?: string,
): Promise<{ imageUrl: string }> {
  const requestId = await hfSubmit(endpoint, body, cred);
  const started = Date.now();
  const timeoutMs = 6 * 60 * 1000;
  let delay = 2000;
  let failures = 0;
  for (;;) {
    if (Date.now() - started > timeoutMs)
      throw new Error("Higgsfield terlalu lama merespons. Coba lagi nanti.");
    let poll: HfPoll;
    try {
      poll = await hfPollOnce(requestId, cred);
      failures = 0;
    } catch (e) {
      if (e instanceof HfError && !e.retryable) throw e;
      if (++failures > 6) throw e;
      await sleep(delay);
      continue;
    }
    if (poll.state === "SUCCESS") {
      if (!poll.imageUrl) throw new Error("Higgsfield selesai tanpa gambar");
      return { imageUrl: poll.imageUrl };
    }
    if (poll.state === "FAIL") throw new Error(poll.message);
    await sleep(delay + Math.random() * 500);
    delay = Math.min(8000, delay * 1.5);
  }
}

// ------------------------------------------------------------------ unggah referensi

/** Unggah data URI gambar lokal lewat presigned URL; kembalikan URL publiknya. */
export async function hfUploadImage(dataUri: string, cred?: string): Promise<string> {
  const [head, b64] = dataUri.split(",");
  const mime = head?.slice(5).split(";")[0] ?? "image/png";
  const slot = await hfFetch<{ public_url: string; upload_url: string; upload_headers?: Record<string, string> }>(
    "files/generate-upload-url",
    { method: "POST", body: JSON.stringify({ content_type: mime }) },
  );
  const put = await fetch(slot.upload_url, {
    method: "PUT",
    headers: slot.upload_headers ?? { "Content-Type": mime },
    body: Buffer.from(b64 ?? "", "base64"),
  });
  if (!put.ok) throw new Error(`Gagal mengunggah referensi ke Higgsfield (HTTP ${put.status})`);
  return slot.public_url;
}

/** Ekstensi file dari URL hasil Higgsfield (untuk nama aset lokal). */
export function extFromUrl(url: string): string {
  const clean = url.split("?")[0] ?? "";
  if (/\.jpe?g$/i.test(clean)) return ".jpg";
  if (/\.webp$/i.test(clean)) return ".webp";
  return ".png";
}

// ------------------------------------------------------------------ uji kunci

export type HfKeyTest = { ok: boolean; message: string };

/**
 * Uji kunci dengan panggilan estimate (panggilan termurah yang didokumentasikan
 * API) — sama seperti versi desktop, sekaligus menampilkan info kredit.
 */
export async function hfTestKey(cred: string): Promise<HfKeyTest> {
  try {
    const out = await hfFetch<{ credits?: string | number }>(
      "estimate/higgsfield-ai/soul/v2/standard",
      {
        method: "POST",
        body: JSON.stringify({ prompt: "test", aspect_ratio: "16:9", resolution: "720p", batch_size: 1 }),
        cred,
      },
    );
    const n = Number(out.credits);
    // API mengirim "1.500" (format desimal Indonesia) -> tampilkan gaya Indonesia
    const credits = Number.isFinite(n)
      ? (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10).toLocaleString("id-ID")
      : null;
    return { ok: true, message: credits ? `Terhubung · 1 gambar Soul ≈ ${credits} kredit` : "Terhubung" };
  } catch (e) {
    if (e instanceof HfError && e.status === 401 && !cred.includes(":")) {
      return {
        ok: false,
        message:
          'Kunci ditolak. Kunci Higgsfield berformat KEY_ID:KEY_SECRET. Pakai tombol "Copy API key" di console, atau gabungkan Key ID dan Secret dengan titik dua.',
      };
    }
    return { ok: false, message: (e as Error).message };
  }
}

// ------------------------------------------------------------------ pembangun body

function pick(s: HfFieldSchema | undefined, prefer: (string | number)[]): string | number | undefined {
  if (!s?.enum?.length) return undefined;
  for (const p of prefer) if (s.enum.includes(p)) return p;
  return s.default as string | number | undefined;
}

function clip(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const space = cut.lastIndexOf(" ");
  return (space > limit * 0.8 ? cut.slice(0, space) : cut).trim();
}

function promptLimit(m: HfModelSpec): number {
  return m.props.prompt?.maxLength ?? (m.kind === "video" ? 2500 : 4000);
}

/** Durasi video terpendek yang menutup kebutuhan, atau yang paling dekat. */
function fitDuration(m: HfModelSpec, seconds: number): number | null {
  const d = m.durations;
  if (!d) return null;
  const want = Math.max(1, Math.ceil(seconds));
  if (d.values?.length) {
    const values = [...d.values].sort((a, b) => a - b);
    return values.find((v) => v >= want) ?? values[values.length - 1] ?? null;
  }
  if (typeof d.min === "number" && typeof d.max === "number")
    return Math.min(d.max, Math.max(d.min, want));
  return null;
}

function resolutionFor(m: HfModelSpec): string | number | undefined {
  // web studio tidak memilih resolusi manual: 2K untuk gambar (ruang kamera),
  // 1080p untuk video, atau yang paling dekat ditawarkan model.
  return pick(m.props.resolution, m.kind === "image" ? ["2k", "2K", "1080p", "1k"] : ["1080p", "2K", "2k", "720p"]);
}

/** Field yang dibagi semua model + mematikan fitur ekstra yang tak dipakai. */
function common(m: HfModelSpec, prompt: string, aspect: string): Record<string, unknown> {
  const p = m.props;
  const body: Record<string, unknown> = { prompt: clip(prompt, promptLimit(m)) };
  if (p.aspect_ratio) {
    const values = p.aspect_ratio.enum;
    if (!values || values.includes(aspect)) body.aspect_ratio = aspect;
  }
  const res = resolutionFor(m);
  if (res !== undefined) body.resolution = res;
  if (p.quality?.enum) body.quality = p.quality.enum.includes("high") ? "high" : p.quality.enum[p.quality.enum.length - 1];
  if (p.mode?.enum) body.mode = pick(p.mode, []);
  if (p.batch_size) body.batch_size = 1;
  if (p.num_images) body.num_images = 1;
  // cerita sudah menjelaskan tiap shot — biar tidak didrift-kan ulang:
  if (p.enhance_prompt) body.enhance_prompt = false;
  if (p.prompt_extend) body.prompt_extend = false;
  // narasi & musik ditambahkan di editor; matikan suara bila model punya saklarnya
  if (p.sound?.enum?.includes("off")) body.sound = "off";
  if (p.generate_audio) body.generate_audio = false;
  return body;
}

function checkRequired(m: HfModelSpec, body: Record<string, unknown>): Record<string, unknown> {
  const missing = m.required.filter((f) => body[f] === undefined);
  if (missing.length)
    throw new HfError(400, `Model ${m.name} butuh ${missing.join(", ")}, yang belum tersedia. Pilih model lain.`);
  return body;
}

export function hfImageBody(
  m: HfModelSpec,
  prompt: string,
  aspect: string,
  refs: string[] = [],
): Record<string, unknown> {
  const body = common(m, prompt, aspect);
  if (m.input.max > 0 && refs.length && m.input.field) body[m.input.field] = refs.slice(0, m.input.max);
  return checkRequired(m, body);
}

/** Dikatakan di setiap prompt video: klip senyap, musik dari editor. */
const NO_MUSIC = "Silent clip: no background music, no soundtrack, no singing or humming.";

export function hfVideoBody(
  m: HfModelSpec,
  prompt: string,
  imageUrl: string | null,
  seconds: number,
  aspect: string,
): Record<string, unknown> {
  const trimmed = prompt.trim();
  const full = `${clip(trimmed, promptLimit(m) - NO_MUSIC.length - 1)} ${NO_MUSIC}`;
  const body = common(m, full, aspect);
  const duration = fitDuration(m, seconds);
  if (duration != null) body.duration = duration;
  if (m.input.field && imageUrl)
    body[m.input.field] = m.input.mode === "reference" ? [imageUrl] : imageUrl;
  return checkRequired(m, body);
}
