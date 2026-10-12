import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/** POST /api/projects/:id/characters — tambah karakter. */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const project = await db.project.findUnique({ where: { id }, select: { id: true } });
    if (!project) {
      return NextResponse.json({ error: "Proyek tidak ditemukan" }, { status: 404 });
    }
    const body = (await req.json()) as { name?: string; description?: string };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Nama karakter wajib diisi" }, { status: 400 });
    }
    const character = await db.character.create({
      data: {
        projectId: id,
        name: body.name.trim(),
        description: (body.description ?? "").trim(),
      },
    });
    return NextResponse.json({ character });
  } catch (error) {
    console.error("POST /api/projects/:id/characters", error);
    return NextResponse.json({ error: "Gagal menambah karakter" }, { status: 500 });
  }
}
