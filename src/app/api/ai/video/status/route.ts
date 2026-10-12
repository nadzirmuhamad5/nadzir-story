import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

import { db } from "@/lib/db";
import { downloadAsset } from "@/lib/nadzir-server";

/**
 * GET /api/ai/video/status?sceneId=... — cek status render video adegan.
 * Bila SUCCESS, video diunduh ke server lokal lalu URL-nya disimpan di adegan.
 */
export async function GET(req: NextRequest) {
  try {
    const sceneId = req.nextUrl.searchParams.get("sceneId");
    if (!sceneId) {
      return NextResponse.json({ error: "sceneId wajib diisi" }, { status: 400 });
    }
    const scene = await db.scene.findUnique({ where: { id: sceneId } });
    if (!scene) {
      return NextResponse.json({ error: "Adegan tidak ditemukan" }, { status: 404 });
    }
    if (!scene.videoTaskId) {
      return NextResponse.json({ error: "Adegan ini tidak sedang merender video" }, { status: 400 });
    }

    const zai = await ZAI.create();
    const result = (await zai.async.result.query(scene.videoTaskId)) as {
      task_status?: string;
      video_result?: { url?: string }[];
      video_url?: string;
      url?: string;
      video?: string;
    };

    if (result.task_status === "SUCCESS") {
      const remote =
        result.video_result?.[0]?.url ?? result.video_url ?? result.url ?? result.video ?? null;
      if (!remote) {
        await db.scene.update({ where: { id: sceneId }, data: { status: "video-failed", videoTaskId: null } });
        return NextResponse.json({ status: "FAIL" });
      }
      const videoUrl = await downloadAsset(remote, `video-${scene.id}-${Date.now()}.mp4`);
      await db.scene.update({
        where: { id: sceneId },
        data: { videoUrl, status: "video-ready", videoTaskId: null },
      });
      return NextResponse.json({ status: "SUCCESS", videoUrl });
    }

    if (result.task_status === "FAIL") {
      await db.scene.update({
        where: { id: sceneId },
        data: { status: "video-failed", videoTaskId: null },
      });
      return NextResponse.json({ status: "FAIL" });
    }

    return NextResponse.json({ status: result.task_status ?? "PROCESSING" });
  } catch (error) {
    console.error("GET /api/ai/video/status", error);
    return NextResponse.json({ error: "Gagal memeriksa status video" }, { status: 500 });
  }
}
