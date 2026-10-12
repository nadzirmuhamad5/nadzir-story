import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/** GET /api/projects/:id — detail lengkap (karakter + adegan). */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const project = await db.project.findUnique({
      where: { id },
      include: {
        characters: { orderBy: { createdAt: "asc" } },
        scenes: { orderBy: { order: "asc" } },
      },
    });
    if (!project) {
      return NextResponse.json({ error: "Proyek tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    console.error("GET /api/projects/:id", error);
    return NextResponse.json({ error: "Gagal memuat proyek" }, { status: 500 });
  }
}

/** PATCH /api/projects/:id — perbarui meta/naskah. */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const data: Record<string, string> = {};
    for (const key of ["title", "genre", "style", "premise", "logline", "story"] as const) {
      if (typeof body[key] === "string") data[key] = body[key] as string;
    }
    const project = await db.project.update({
      where: { id },
      data,
      include: { characters: { orderBy: { createdAt: "asc" } }, scenes: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({ project });
  } catch (error) {
    console.error("PATCH /api/projects/:id", error);
    return NextResponse.json({ error: "Gagal menyimpan proyek" }, { status: 500 });
  }
}

/** DELETE /api/projects/:id — hapus proyek + seluruh isinya. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await db.project.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/projects/:id", error);
    return NextResponse.json({ error: "Gagal menghapus proyek" }, { status: 500 });
  }
}
