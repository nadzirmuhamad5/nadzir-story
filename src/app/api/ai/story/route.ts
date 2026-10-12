import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

import { db } from "@/lib/db";
import { extractJson, styleEnOf } from "@/lib/nadzir-server";

const SYSTEM_WRITER = `Kamu penulis skenario film pendek profesional berbahasa Indonesia.
Tulis cerita utuh 500-800 kata berdasarkan premis, genre, dan gaya visual yang diberikan.
Aturan:
- Cerita dibagi menjadi 6-10 paragraf; setiap paragraf = satu adegan visual yang jelas (lokasi, waktu, tokoh, aksi).
- Sertakan dialog singkat yang natural di dalam paragraf bila menghidupkan adegan.
- Akhir cerita memuaskan dan sinematik.
- Balas HANYA dengan JSON valid TANPA markdown dan tanpa teks lain, dengan bentuk:
{"title":"judul menarik maksimal 60 karakter","logline":"satu kalimat logline","story":"isi cerita dengan paragraf dipisahkan \\n\\n"}`;

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
      return NextResponse.json({ error: "Premis masih kosong — tulis dulu ide ceritanya" }, { status: 400 });
    }

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: SYSTEM_WRITER },
        {
          role: "user",
          content: `Premis: ${project.premise}\nGenre: ${project.genre}\nGaya visual: ${styleEnOf(project.style)}\n\nTulis ceritanya sekarang.`,
        },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = extractJson<{ title?: string; logline?: string; story?: string }>(raw);
    if (!parsed?.story || typeof parsed.story !== "string" || parsed.story.trim().length < 100) {
      return NextResponse.json(
        { error: "AI tidak mengembalikan cerita yang valid — coba sekali lagi" },
        { status: 502 },
      );
    }

    const project2 = await db.project.update({
      where: { id: projectId },
      data: {
        title: parsed.title?.trim() ? parsed.title.trim().slice(0, 90) : project.title,
        logline: parsed.logline?.trim() ?? project.logline,
        story: parsed.story.trim(),
      },
      include: { characters: { orderBy: { createdAt: "asc" } }, scenes: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({ project: project2 });
  } catch (error) {
    console.error("POST /api/ai/story", error);
    return NextResponse.json({ error: "Gagal membuat cerita — coba lagi" }, { status: 500 });
  }
}
