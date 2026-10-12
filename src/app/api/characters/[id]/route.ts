import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/characters/:id — sunting karakter. */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const data: Record<string, string> = {};
    if (typeof body.name === "string") data.name = body.name;
    if (typeof body.description === "string") data.description = body.description;
    const character = await db.character.update({ where: { id }, data });
    return NextResponse.json({ character });
  } catch (error) {
    console.error("PATCH /api/characters/:id", error);
    return NextResponse.json({ error: "Gagal menyimpan karakter" }, { status: 500 });
  }
}

/** DELETE /api/characters/:id — hapus karakter. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await db.character.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/characters/:id", error);
    return NextResponse.json({ error: "Gagal menghapus karakter" }, { status: 500 });
  }
}
