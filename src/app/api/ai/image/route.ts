import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

import { db } from "@/lib/db";
import { getGeminiKey, geminiGenerateImage } from "@/lib/gemini-server";
import {
  extFromUrl,
  getHfKey,
  hfGenerateImageWait,
  hfImageBody,
  hfModelOf,
} from "@/lib/higgsfield-server";
import { downloadAsset, saveBase64Asset, styleEnOf } from "@/lib/nadzir-server";

/**
 * POST /api/ai/image — generate gambar AI untuk adegan (16:9) atau karakter (1:1).
 * body: { kind: "scene" | "character", id: string, prompt?: string, model?: string }
 * model "gemini:<api>" memakai kunci Google AI Studio milik pengguna;
 * model "hf:<endpoint>" memakai kunci Higgsfield milik pengguna;
 * tanpa model memakai Z.AI bawaan.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { kind?: string; id?: string; prompt?: string; model?: string };
    if (!body.id || (body.kind !== "scene" && body.kind !== "character")) {
      return NextResponse.json({ error: "kind & id wajib diisi" }, { status: 400 });
    }
    const model = typeof body.model === "string" ? body.model : "";
    const useGemini = model.startsWith("gemini:");
    const useHf = model.startsWith("hf:");

    let prompt = (body.prompt ?? "").trim();
    let aspectRatio = "1:1";
    let filenameBase = `img-${body.id}-${Date.now()}`;

    if (body.kind === "scene") {
      const scene = await db.scene.findUnique({ where: { id: body.id }, include: { project: true } });
      if (!scene) return NextResponse.json({ error: "Adegan tidak ditemukan" }, { status: 404 });
      aspectRatio = "16:9";
      filenameBase = `scene-${scene.id}-${Date.now()}`;
      if (!prompt) {
        prompt = scene.imagePrompt.trim() || scene.narration.slice(0, 400).trim();
      }
      if (!prompt) {
        return NextResponse.json(
          { error: "Adegan ini belum punya prompt — isi prompt gambarnya dulu" },
          { status: 400 },
        );
      }
      prompt = `${prompt}. Visual style: ${styleEnOf(scene.project.style)}. No text, no watermark.`;
    } else {
      const character = await db.character.findUnique({ where: { id: body.id } });
      if (!character) return NextResponse.json({ error: "Karakter tidak ditemukan" }, { status: 404 });
      filenameBase = `character-${character.id}-${Date.now()}`;
      if (!prompt) {
        prompt = character.description.trim() || character.name;
      }
      if (!prompt) {
        return NextResponse.json(
          { error: "Isi dulu deskripsi karakternya agar potret sesuai" },
          { status: 400 },
        );
      }
      prompt = `${prompt}. Character reference portrait, upper body, clean simple background, highly detailed, consistent design, no text, no watermark.`;
    }

    let savedUrl: string | null = null;
    let b64: string | undefined;

    if (useHf) {
      const key = await getHfKey();
      if (!key) {
        return NextResponse.json(
          { error: "Model Higgsfield butuh kunci API — pasang dulu di Pengaturan" },
          { status: 400 },
        );
      }
      const m = hfModelOf(model.slice("hf:".length));
      if (!m || m.kind !== "image") {
        return NextResponse.json({ error: "Model Higgsfield tidak dikenal" }, { status: 400 });
      }
      const aspect = body.kind === "scene" ? "16:9" : "1:1";
      const hfBody = hfImageBody(m, prompt, aspect);
      const { imageUrl } = await hfGenerateImageWait(m.id, hfBody, key);
      savedUrl = await downloadAsset(imageUrl, `${filenameBase}${extFromUrl(imageUrl)}`);
    } else if (useGemini) {
      const key = await getGeminiKey();
      if (!key) {
        return NextResponse.json(
          { error: "Model Gemini butuh kunci Google AI Studio — pasang dulu di Pengaturan" },
          { status: 400 },
        );
      }
      const api = model.slice("gemini:".length);
      const imageSize = api === "gemini-3-pro-image-preview" ? "2K" : null;
      const img = await geminiGenerateImage(key, { api, prompt, aspectRatio, imageSize });
      b64 = img.b64;
    } else {
      const size = body.kind === "scene" ? "1344x768" : "1024x1024";
      const zai = await ZAI.create();
      const response = (await zai.images.generations.create({ prompt, size })) as {
        data?: { base64?: string }[];
      };
      b64 = response.data?.[0]?.base64;
    }

    const url = savedUrl ?? (b64 ? await saveBase64Asset(b64, `${filenameBase}.png`) : null);
    if (!url) {
      return NextResponse.json({ error: "AI tidak mengembalikan gambar — coba lagi" }, { status: 502 });
    }

    if (body.kind === "scene") {
      const scene = await db.scene.update({
        where: { id: body.id },
        data: { imageUrl: url, status: "draft" },
      });
      return NextResponse.json({ scene, url });
    }
    const character = await db.character.update({
      where: { id: body.id },
      data: { imageUrl: url },
    });
    return NextResponse.json({ character, url });
  } catch (error) {
    console.error("POST /api/ai/image", error);
    const message = (error as Error)?.message ?? "Gagal membuat gambar — coba lagi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
