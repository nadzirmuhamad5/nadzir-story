import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

/** GET /api/projects — daftar proyek + ringkasan statistik. */
export async function GET() {
  try {
    const projects = await db.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        scenes: { select: { imageUrl: true, videoUrl: true, order: true }, orderBy: { order: "asc" } },
        characters: { select: { id: true } },
      },
    });

    const data = projects.map((p) => ({
      id: p.id,
      title: p.title,
      genre: p.genre,
      style: p.style,
      logline: p.logline,
      updatedAt: p.updatedAt.toISOString(),
      sceneCount: p.scenes.length,
      imageCount: p.scenes.filter((s) => s.imageUrl).length,
      videoCount: p.scenes.filter((s) => s.videoUrl).length,
      characterCount: p.characters.length,
      coverUrl: p.scenes.find((s) => s.imageUrl)?.imageUrl ?? null,
    }));

    return NextResponse.json({ projects: data });
  } catch (error) {
    console.error("GET /api/projects", error);
    return NextResponse.json({ error: "Gagal memuat daftar proyek" }, { status: 500 });
  }
}

/** POST /api/projects — buat proyek baru. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      title?: string;
      genre?: string;
      style?: string;
      premise?: string;
    };
    const project = await db.project.create({
      data: {
        title: (body.title ?? "").trim() || "Proyek Tanpa Judul",
        genre: body.genre ?? "Drama",
        style: body.style ?? "cinematic",
        premise: (body.premise ?? "").trim(),
      },
      include: { characters: true, scenes: true },
    });
    return NextResponse.json({ project });
  } catch (error) {
    console.error("POST /api/projects", error);
    return NextResponse.json({ error: "Gagal membuat proyek" }, { status: 500 });
  }
}
