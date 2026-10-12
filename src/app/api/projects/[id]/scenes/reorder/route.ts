import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/** POST /api/projects/:id/scenes/reorder — susun ulang urutan adegan. */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await req.json()) as { ids?: string[] };
    const ids = body.ids ?? [];
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Daftar ids wajib diisi" }, { status: 400 });
    }
    await db.$transaction(
      ids.map((sceneId, index) =>
        db.scene.updateMany({ where: { id: sceneId, projectId: id }, data: { order: index } }),
      ),
    );
    const scenes = await db.scene.findMany({ where: { projectId: id }, orderBy: { order: "asc" } });
    return NextResponse.json({ scenes });
  } catch (error) {
    console.error("POST /api/projects/:id/scenes/reorder", error);
    return NextResponse.json({ error: "Gagal menyusun ulang adegan" }, { status: 500 });
  }
}
