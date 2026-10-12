import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { extractJson, llmComplete, styleEnOf } from "@/lib/nadzir-server";

// Format teks berlabel (bukan JSON) — jauh lebih tahan banting untuk cerita
// panjang yang mengandung dialog berkutip dan paragraf multi-baris.
const SYSTEM_WRITER = `Kamu penulis skenario film pendek profesional berbahasa Indonesia.
Tulis cerita utuh 500-800 kata berdasarkan premis, genre, dan gaya visual yang diberikan.
Aturan:
- Cerita dibagi menjadi 6-10 paragraf; setiap paragraf = satu adegan visual yang jelas (lokasi, waktu, tokoh, aksi).
- Sertakan dialog singkat yang natural di dalam paragraf bila menghidupkan adegan.
- Akhir cerita memuaskan dan sinematik.
Format balasan WAJIB persis seperti ini (teks biasa, TANPA markdown, TANPA JSON, tanpa tambahan kata apa pun sebelum/sesudah):
JUDUL: judul menarik maksimal 60 karakter
LOGLINE: satu kalimat logline
CERITA:
isi cerita dengan paragraf dipisahkan baris kosong`;

type Sections = { title?: string; logline?: string; story?: string };

/** Parse balasan format JUDUL/LOGLINE/CERITA; toleran jika marker hilang. */
function parseSections(raw: string): Sections {
  const t = raw
    .trim()
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const title = /^JUDUL:\s*(.+)$/im.exec(t)?.[1]?.trim();
  const logline = /^LOGLINE:\s*(.+)$/im.exec(t)?.[1]?.trim();

  const ceritaMatch = /^CERITA:\s*$/im.exec(t);
  if (ceritaMatch?.index !== undefined) {
    return {
      title,
      logline,
      story: t.slice(ceritaMatch.index + ceritaMatch[0].length).trim() || undefined,
    };
  }
  // tanpa marker CERITA: setelah LOGLINE dianggap isi cerita
  if (logline) {
    const rest = t.slice(t.indexOf(logline) + logline.length).trim();
    if (rest) return { title, logline, story: rest };
  }
  // model abaikan format total: seluruh teks dianggap cerita
  return { title, logline, story: t.length > 400 ? t : undefined };
}

const valid = (s?: string) => typeof s === "string" && s.trim().length >= 100;

/** POST /api/ai/story — tulis cerita lengkap dari premis proyek. */
export async function POST(req: NextRequest) {
  try {
    const { projectId, premise } = (await req.json()) as { projectId?: string; premise?: string };
    if (!projectId) {
      return NextResponse.json({ error: "projectId wajib diisi" }, { status: 400 });
    }
    const existing = await db.project.findUnique({ where: { id: projectId } });
    if (!existing) {
      return NextResponse.json({ error: "Proyek tidak ditemukan" }, { status: 404 });
    }
    // simpan premis terbaru dari klien (jaga-jaga autosave belum selesai)
    const project =
      typeof premise === "string" && premise.trim() !== existing.premise.trim()
        ? await db.project.update({ where: { id: projectId }, data: { premise: premise.trim() } })
        : existing;
    if (!project.premise.trim()) {
      return NextResponse.json(
        { error: "Premis masih kosong — tulis dulu ide ceritanya" },
        { status: 400 },
      );
    }

    const prompt = `Premis: ${project.premise}\nGenre: ${project.genre}\nGaya visual: ${styleEnOf(project.style)}\n\nTulis ceritanya sekarang.`;

    // 2 percobaan: model kadang tidak mengikuti format
    let sections: Sections | null = null;
    for (let attempt = 0; attempt < 2 && !sections; attempt++) {
      const raw = await llmComplete(SYSTEM_WRITER, prompt);
      sections = parseSections(raw);
      if (valid(sections.story)) break;
      // fallback: mungkin model tetap balas JSON
      const json = extractJson<Sections>(raw);
      if (json && valid(json.story)) sections = json;
      else sections = null;
    }
    if (!sections || !valid(sections.story)) {
      return NextResponse.json(
        { error: "AI tidak mengembalikan cerita yang valid — coba sekali lagi" },
        { status: 502 },
      );
    }

    const project2 = await db.project.update({
      where: { id: projectId },
      data: {
        title: sections.title ? sections.title.slice(0, 90) : project.title,
        logline: sections.logline?.trim() || project.logline,
        story: sections.story.trim(),
      },
      include: { characters: { orderBy: { createdAt: "asc" } }, scenes: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({ project: project2 });
  } catch (error) {
    console.error("POST /api/ai/story", error);
    return NextResponse.json({ error: "Gagal membuat cerita — coba lagi" }, { status: 500 });
  }
}
