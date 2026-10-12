import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

import { ASSETS_DIR } from "@/lib/nadzir-server";

const ALLOWED = /^[a-zA-Z0-9._-]+$/;
const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

/** GET /api/assets/:name — sajikan hasil gambar/video AI dari db/assets. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    if (!ALLOWED.test(name) || name.includes("..")) {
      return NextResponse.json({ error: "Nama file tidak valid" }, { status: 400 });
    }
    const data = await fs.readFile(path.join(ASSETS_DIR, name));
    const ext = path.extname(name).toLowerCase();
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }
}
