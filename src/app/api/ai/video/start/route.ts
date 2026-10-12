import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

import { db } from "@/lib/db";
import { localAssetAsDataUri } from "@/lib/nadzir-server";

/**
 * POST /api/ai/video/start — mulai tugas video AI untuk satu adegan.
 * Memakai gambar adegan sebagai frame pertama bila ada (image-to-video),
 * kalau tidak ada jatuh ke text-to-video.
 * body: { sceneId: string, prompt?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { sceneId, prompt } = (await req.json()) as { sceneId?: string; prompt?: string };
    if (!sceneId) {
      return NextResponse.json({ error: "sceneId wajib diisi" }, { status: 400 });
    }
    const scene = await db.scene.findUnique({ where: { id: sceneId } });
    if (!scene) {
      return NextResponse.json({ error: "Adegan tidak ditemukan" }, { status: 404 });
    }

    const zai = await ZAI.create();
    const params: Record<string, unknown> = {
      prompt:
        (prompt ?? "").trim() ||
        scene.videoPrompt.trim() ||
        "Cinematic subtle camera movement, the scene comes alive naturally, smooth motion",
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
      data: { videoTaskId: task.id, status: "video-processing" },
    });
    return NextResponse.json({ taskId: task.id });
  } catch (error) {
    console.error("POST /api/ai/video/start", error);
    return NextResponse.json({ error: "Gagal memulai pembuatan video — coba lagi" }, { status: 500 });
  }
}
