import { NextRequest, NextResponse } from "next/server";

import { getGeminiKey, setGeminiKey } from "@/lib/gemini-server";
import { getHfKey, setHfKey, hfTestKey } from "@/lib/higgsfield-server";

/**
 * GET /api/settings — info kunci penyedia (ter-masker, kunci penuh tidak pernah dikirim).
 * POST /api/settings — simpan kunci. Kirim string kosong untuk menghapus.
 * Hanya field yang dikirim yang diproses ("geminiKey" / "higgsfieldKey").
 */
export async function GET() {
  try {
    const [gemini, hf] = await Promise.all([getGeminiKey(), getHfKey()]);
    return NextResponse.json({
      geminiKeySet: !!gemini,
      geminiKeyHint: gemini ? `••••${gemini.slice(-4)}` : null,
      higgsfieldKeySet: !!hf,
      higgsfieldKeyHint: hf ? `••••${hf.slice(-4)}` : null,
    });
  } catch (error) {
    console.error("GET /api/settings", error);
    return NextResponse.json({ error: "Gagal membaca pengaturan" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { geminiKey?: string; higgsfieldKey?: string };
    let hfTest: { ok: boolean; message: string } | null = null;

    if (typeof body.geminiKey === "string") {
      const trimmed = body.geminiKey.trim();
      if (trimmed && !/^AIza[0-9A-Za-z_-]{30,}$/.test(trimmed)) {
        return NextResponse.json(
          { error: "Format kunci tidak dikenal — kunci Google AI Studio biasanya diawali AIza…" },
          { status: 400 },
        );
      }
      await setGeminiKey(trimmed);
    }

    if (typeof body.higgsfieldKey === "string") {
      const trimmed = body.higgsfieldKey.trim();
      if (trimmed && !trimmed.includes(":")) {
        return NextResponse.json(
          {
            error:
              'Kunci Higgsfield berformat KEY_ID:KEY_SECRET — pakai tombol "Copy API key" di console Higgsfield.',
          },
          { status: 400 },
        );
      }
      await setHfKey(trimmed);
      const stored = await getHfKey();
      if (stored) hfTest = await hfTestKey(stored);
    }

    const [gemini, hf] = await Promise.all([getGeminiKey(), getHfKey()]);
    return NextResponse.json({
      geminiKeySet: !!gemini,
      geminiKeyHint: gemini ? `••••${gemini.slice(-4)}` : null,
      higgsfieldKeySet: !!hf,
      higgsfieldKeyHint: hf ? `••••${hf.slice(-4)}` : null,
      higgsfieldTest: hfTest,
    });
  } catch (error) {
    console.error("POST /api/settings", error);
    return NextResponse.json({ error: "Gagal menyimpan pengaturan" }, { status: 500 });
  }
}
