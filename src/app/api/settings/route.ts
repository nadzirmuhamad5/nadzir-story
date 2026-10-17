import { NextRequest, NextResponse } from "next/server";

import { getGeminiKey, setGeminiKey } from "@/lib/gemini-server";

/** GET /api/settings — info kunci penyedia (ter-masker, kunci penuh tidak pernah dikirim). */
export async function GET() {
  try {
    const key = await getGeminiKey();
    return NextResponse.json({
      geminiKeySet: !!key,
      geminiKeyHint: key ? `••••${key.slice(-4)}` : null,
    });
  } catch (error) {
    console.error("GET /api/settings", error);
    return NextResponse.json({ error: "Gagal membaca pengaturan" }, { status: 500 });
  }
}

/** POST /api/settings — simpan kunci. Kirim string kosong untuk menghapus. */
export async function POST(req: NextRequest) {
  try {
    const { geminiKey } = (await req.json()) as { geminiKey?: string };
    if (typeof geminiKey !== "string") {
      return NextResponse.json({ error: "geminiKey wajib diisi" }, { status: 400 });
    }
    const trimmed = geminiKey.trim();
    if (trimmed && !/^AIza[0-9A-Za-z_-]{30,}$/.test(trimmed)) {
      return NextResponse.json(
        { error: "Format kunci tidak dikenal — kunci Google AI Studio biasanya diawali AIza…" },
        { status: 400 },
      );
    }
    await setGeminiKey(trimmed);
    const key = await getGeminiKey();
    return NextResponse.json({
      geminiKeySet: !!key,
      geminiKeyHint: key ? `••••${key.slice(-4)}` : null,
    });
  } catch (error) {
    console.error("POST /api/settings", error);
    return NextResponse.json({ error: "Gagal menyimpan pengaturan" }, { status: 500 });
  }
}
