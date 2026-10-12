import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/scenes/:id — sunting teks adegan. */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const data: Record<string, string | number> = {};
    for (const key of ["title", "narration", "imagePrompt", "videoPrompt"] as const) {
      if (typeof body[key] === "string") data[key] = body[key] as string;
    }
    if (typeof body.order === "number") data.order = body.order;
    const scene = await db.scene.update({ where: { id }, data });
    return NextResponse.json({ scene });
  } catch (error) {
    console.error("PATCH /api/scenes/:id", error);
    return NextResponse.json({ error: "Gagal menyimpan adegan" }, { status: 500 });
  }
}

/** DELETE /api/scenes/:id — hapus adegan. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await db.scene.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/scenes/:id", error);
    return NextResponse.json({ error: "Gagal menghapus adegan" }, { status: 500 });
  }
}
