import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

import { db } from "@/lib/db";
import { getGeminiKey, geminiStartVideo } from "@/lib/gemini-server";
import { localAssetAsDataUri } from "@/lib/nadzir-server";

/**
 * POST /api/ai/video/start — mulai tugas video AI untuk satu adegan.
 * Memakai gambar adegan sebagai frame pertama bila ada (image-to-video),
 * kalau tidak ada jatuh ke text-to-video.
 * body: { sceneId: string, prompt?: string, model?: string }
 * model "gemini:<api>" menjalankan operasi Veo dengan kunci pengguna;
 * scene.videoProvider dicatat "gemini" agar polling tahu jalurnya.
 */
export async function POST(req: NextRequest) {
  try {
    const { sceneId, prompt, model } = (await req.json()) as {
      sceneId?: string;
      prompt?: string;
      model?: string;
    };
    if (!sceneId) {
      return NextResponse.json({ error: "sceneId wajib diisi" }, { status: 400 });
    }
    const scene = await db.scene.findUnique({ where: { id: sceneId } });
    if (!scene) {
      return NextResponse.json({ error: "Adegan tidak ditemukan" }, { status: 404 });
    }
    const finalPrompt =
      (prompt ?? "").trim() ||
      scene.videoPrompt.trim() ||
      "Cinematic subtle camera movement, the scene comes alive naturally, smooth motion";

    // ------------------------------------------------------------- Gemini Veo
    if (typeof model === "string" && model.startsWith("gemini:")) {
      const key = await getGeminiKey();
      if (!key) {
        return NextResponse.json(
          { error: "Model Gemini butuh kunci Google AI Studio — pasang dulu di Pengaturan" },
          { status: 400 },
        );
      }
      const api = model.slice("gemini:".length);
      let imageB64: string | null = null;
      let imageMime: string | null = null;
      if (scene.imageUrl) {
        const dataUri = await localAssetAsDataUri(scene.imageUrl);
        if (dataUri) {
          const [head, b64] = dataUri.split(",");
          imageMime = head?.slice(5).split(";")[0] ?? "image/png";
          imageB64 = b64 ?? null;
        }
      }
      const operationName = await geminiStartVideo(key, {
        api,
        prompt: finalPrompt,
        imageB64,
        imageMime,
        aspectRatio: "16:9",
        resolution: "1080p",
        durationSeconds: 8,
        // klip senyap lebih murah di Veo 3.1; narasi ditambahkan belakangan
        generateAudio: api === "veo-3.0-generate-001" ? undefined : false,
      });
      await db.scene.update({
        where: { id: sceneId },
        data: { videoTaskId: operationName, videoProvider: "gemini", status: "video-processing" },
      });
      return NextResponse.json({ taskId: operationName });
    }

    // ------------------------------------------------------- Nadzir AI bawaan
    const zai = await ZAI.create();
    const params: Record<string, unknown> = {
      prompt: finalPrompt,
      quality: "speed",
      duration: 5,
      fps: 30,
    };

    if (scene.imageUrl) {
      const dataUri = await localAssetAsDataUri(scene.imageUrl);
      if (dataUri) params.image_url = dataUri;
    }

    const task = (await zai.video.generations.create(params)) as { id?: string };
    if (!task.id) {
      return NextResponse.json({ error: "Server video tidak membuat tugas — coba lagi" }, { status: 502 });
    }

    await db.scene.update({
      where: { id: sceneId },
      data: { videoTaskId: task.id, videoProvider: null, status: "video-processing" },
    });
    return NextResponse.json({ taskId: task.id });
  } catch (error) {
    console.error("POST /api/ai/video/start", error);
    const message = (error as Error)?.message ?? "Gagal memulai pembuatan video — coba lagi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
