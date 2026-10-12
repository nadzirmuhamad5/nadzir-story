import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

import { db } from "@/lib/db";
import { extractJson, styleEnOf } from "@/lib/nadzir-server";

const SYSTEM_SPLITTER = `Kamu sutradara & storyboard artist profesional.
Tugas: memecah naskah cerita menjadi 6-10 adegan untuk produksi video pendek.
Untuk setiap adegan berikan:
- "title": judul adegan singkat dalam Bahasa Indonesia (maks 6 kata)
- "narration": narasi/dialog adegan dalam Bahasa Indonesia (60-120 kata)
- "imagePrompt": deskripsi visual dalam BAHASA INGGRIS (30-60 kata) — subjek, latar, cahaya, komposisi, warna; TANPA teks/tulisan di gambar
- "videoPrompt": deskripsi gerakan dalam BAHASA INGGRIS (15-35 kata) untuk klip video 5 detik — gerakan kamera & aksi
Balas HANYA dengan JSON valid TANPA markdown, bentuk:
{"scenes":[{"title":"...","narration":"...","imagePrompt":"...","videoPrompt":"..."}]}`;

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
      return NextResponse.json({ error: "Naskah masih kosong — generate cerita dulu" }, { status: 400 });
    }

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: SYSTEM_SPLITTER },
        {
          role: "user",
          content: `Judul: ${project.title}\nGenre: ${project.genre}\nGaya visual: ${styleEnOf(project.style)}\n\nNASKAH:\n${project.story}`,
        },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = extractJson<{
      scenes?: { title?: string; narration?: string; imagePrompt?: string; videoPrompt?: string }[];
    }>(raw);
    const incoming = parsed?.scenes;
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return NextResponse.json(
        { error: "AI tidak mengembalikan adegan yang valid — coba sekali lagi" },
        { status: 502 },
      );
    }

    const scenes = await db.$transaction(async (tx) => {
      await tx.scene.deleteMany({ where: { projectId } });
      let order = 0;
      const created: Awaited<ReturnType<typeof tx.scene.create>>["id"][] = [];
      for (const s of incoming.slice(0, 12)) {
        const scene = await tx.scene.create({
          data: {
            projectId,
            order: order++,
            title: (s.title ?? "").trim() || `Adegan ${order}`,
            narration: (s.narration ?? "").trim(),
            imagePrompt: (s.imagePrompt ?? "").trim(),
            videoPrompt: (s.videoPrompt ?? "").trim(),
          },
        });
        created.push(scene.id);
      }
      return tx.scene.findMany({ where: { projectId }, orderBy: { order: "asc" } });
    });

    return NextResponse.json({ scenes });
  } catch (error) {
    console.error("POST /api/ai/scenes", error);
    return NextResponse.json({ error: "Gagal memecah cerita menjadi adegan — coba lagi" }, { status: 500 });
  }
}
