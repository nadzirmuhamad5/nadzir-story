import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { extractJson, llmComplete, styleEnOf } from "@/lib/nadzir-server";

// Format blok berlabel (bukan JSON) — narasi adegan sering memuat dialog
// berkutip sehingga JSON rentan rusak. JSON tetap dipakai sebagai fallback.
const SYSTEM_SPLITTER = `Kamu sutradara & storyboard artist profesional.
Tugas: memecah naskah cerita menjadi 6-10 adegan untuk produksi video pendek.
Untuk setiap adegan:
- JUDUL: judul adegan singkat dalam Bahasa Indonesia (maks 6 kata)
- NARASI: narasi/dialog adegan dalam Bahasa Indonesia (60-120 kata)
- IMAGE: deskripsi visual dalam BAHASA INGGRIS (30-60 kata) — subjek, latar, cahaya, komposisi, warna; TANPA teks/tulisan di gambar
- VIDEO: deskripsi gerakan dalam BAHASA INGGRIS (15-35 kata) untuk klip video 5 detik — gerakan kamera & aksi
Balas dengan teks biasa (TANPA markdown, TANPA JSON, tanpa teks pembuka/penutup) dengan format PERSIS:
### ADEGAN 1
JUDUL: ...
NARASI: ...
IMAGE: ...
VIDEO: ...

### ADEGAN 2
JUDUL: ...
NARASI: ...
IMAGE: ...
VIDEO: ...`;

type ParsedScene = {
  title: string;
  narration: string;
  imagePrompt: string;
  videoPrompt: string;
};

/** Parse balasan format "### ADEGAN n" berlabel; tiap label satu blok baris. */
function parseSceneBlocks(raw: string): ParsedScene[] {
  const t = raw
    .trim()
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  if (!t) return [];
  const blocks = t.split(/^\s*#{2,4}\s*ADEGAN\s*\d*[^\n]*$/gim);
  const out: ParsedScene[] = [];
  for (const block of blocks) {
    if (!block.trim()) continue;
    const grab = (label: string) =>
      new RegExp(
        `^${label}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:JUDUL|NARASI|IMAGE|GAMBAR|VIDEO)\\s*:|$)`,
        "im",
      )
        .exec(block)?.[1]
        ?.replace(/\s+/g, " ")
        .trim() ?? "";
    const narration = grab("NARASI");
    const imagePrompt = grab("(?:IMAGE|GAMBAR)");
    if (!narration && !imagePrompt) continue; // blok kosong / teks pembuka
    out.push({
      title: grab("JUDUL"),
      narration,
      imagePrompt,
      videoPrompt: grab("VIDEO"),
    });
  }
  return out;
}

const clean = (s: string | undefined) => (s ?? "").trim();

/** POST /api/ai/scenes — pecah naskah proyek menjadi adegan (mengganti adegan lama). */
export async function POST(req: NextRequest) {
  try {
    const { projectId, story } = (await req.json()) as { projectId?: string; story?: string };
    if (!projectId) {
      return NextResponse.json({ error: "projectId wajib diisi" }, { status: 400 });
    }
    const existing = await db.project.findUnique({ where: { id: projectId } });
    if (!existing) {
      return NextResponse.json({ error: "Proyek tidak ditemukan" }, { status: 404 });
    }
    // simpan naskah terbaru dari klien (jaga-jaga autosave belum selesai)
    const project =
      typeof story === "string" && story.trim() !== existing.story.trim()
        ? await db.project.update({ where: { id: projectId }, data: { story } })
        : existing;
    if (!project.story.trim()) {
      return NextResponse.json(
        { error: "Naskah masih kosong — generate cerita dulu" },
        { status: 400 },
      );
    }

    const prompt = `Judul: ${project.title}\nGenre: ${project.genre}\nGaya visual: ${styleEnOf(project.style)}\n\nNASKAH:\n${project.story}`;

    // 2 percobaan: format blok dulu, JSON sebagai jaring pengaman
    let incoming: ParsedScene[] = [];
    for (let attempt = 0; attempt < 2 && incoming.length === 0; attempt++) {
      const raw = await llmComplete(SYSTEM_SPLITTER, prompt);
      incoming = parseSceneBlocks(raw);
      if (incoming.length > 0) break;
      const json = extractJson<{
        scenes?: { title?: string; narration?: string; imagePrompt?: string; videoPrompt?: string }[];
      }>(raw);
      if (Array.isArray(json?.scenes) && json.scenes.length > 0) {
        incoming = json.scenes.map((s) => ({
          title: clean(s.title),
          narration: clean(s.narration),
          imagePrompt: clean(s.imagePrompt),
          videoPrompt: clean(s.videoPrompt),
        }));
      }
    }
    incoming = incoming.filter((s) => s.narration || s.imagePrompt);
    if (incoming.length === 0) {
      return NextResponse.json(
        { error: "AI tidak mengembalikan adegan yang valid — coba sekali lagi" },
        { status: 502 },
      );
    }

    const scenes = await db.$transaction(async (tx) => {
      await tx.scene.deleteMany({ where: { projectId } });
      let order = 0;
      for (const s of incoming.slice(0, 12)) {
        await tx.scene.create({
          data: {
            projectId,
            order: order++,
            title: s.title || `Adegan ${order}`,
            narration: s.narration,
            imagePrompt: s.imagePrompt,
            videoPrompt: s.videoPrompt,
          },
        });
      }
      return tx.scene.findMany({ where: { projectId }, orderBy: { order: "asc" } });
    });

    return NextResponse.json({ scenes });
  } catch (error) {
    console.error("POST /api/ai/scenes", error);
    return NextResponse.json({ error: "Gagal memecah cerita menjadi adegan — coba lagi" }, { status: 500 });
  }
}
