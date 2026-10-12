import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/** POST /api/projects/:id/scenes — tambah adegan manual. */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const project = await db.project.findUnique({ where: { id }, select: { id: true } });
    if (!project) {
      return NextResponse.json({ error: "Proyek tidak ditemukan" }, { status: 404 });
    }
    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      narration?: string;
      imagePrompt?: string;
      videoPrompt?: string;
    };
    const last = await db.scene.findFirst({
      where: { projectId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const scene = await db.scene.create({
      data: {
        projectId: id,
        order: (last?.order ?? -1) + 1,
        title: (body.title ?? "").trim() || "Adegan Baru",
        narration: body.narration ?? "",
        imagePrompt: body.imagePrompt ?? "",
        videoPrompt: body.videoPrompt ?? "",
      },
    });
    return NextResponse.json({ scene });
  } catch (error) {
    console.error("POST /api/projects/:id/scenes", error);
    return NextResponse.json({ error: "Gagal menambah adegan" }, { status: 500 });
  }
}
