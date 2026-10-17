import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

import { db } from "@/lib/db";
import { getGeminiKey, geminiPollVideo, saveGeminiVideo } from "@/lib/gemini-server";
import { HfError, getHfKey, hfPollOnce } from "@/lib/higgsfield-server";
import { downloadAsset } from "@/lib/nadzir-server";

/**
 * GET /api/ai/video/status?sceneId=... — cek status render video adegan.
 * Jalur ditentukan scene.videoProvider: "gemini" (operasi Veo milik pengguna),
 * "higgsfield" (pekerjaan Higgsfield milik pengguna), atau bawaan Z.AI.
 * Bila SUCCESS, video disimpan lokal lalu URL-nya disimpan di adegan.
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

    // ------------------------------------------------------------ Gemini Veo
    if (scene.videoProvider === "gemini") {
      const key = await getGeminiKey();
      if (!key) {
        await db.scene.update({
          where: { id: sceneId },
          data: { status: "video-failed", videoTaskId: null, videoProvider: null },
        });
        return NextResponse.json({ status: "FAIL" });
      }
      const poll = await geminiPollVideo(key, scene.videoTaskId);
      if (poll.state === "PROCESSING") {
        return NextResponse.json({ status: "PROCESSING" });
      }
      if (poll.state === "FAIL") {
        await db.scene.update({
          where: { id: sceneId },
          data: { status: "video-failed", videoTaskId: null, videoProvider: null },
        });
        return NextResponse.json({ status: "FAIL", message: poll.message });
      }
      const videoUrl = await saveGeminiVideo(poll.b64, `video-${scene.id}-${Date.now()}.mp4`);
      await db.scene.update({
        where: { id: sceneId },
        data: { videoUrl, status: "video-ready", videoTaskId: null, videoProvider: null },
      });
      return NextResponse.json({ status: "SUCCESS", videoUrl });
    }

    // ------------------------------------------------------ Higgsfield
    if (scene.videoProvider === "higgsfield") {
      const key = await getHfKey();
      if (!key) {
        await db.scene.update({
          where: { id: sceneId },
          data: { status: "video-failed", videoTaskId: null, videoProvider: null },
        });
        return NextResponse.json({ status: "FAIL" });
      }
      let poll;
      try {
        poll = await hfPollOnce(scene.videoTaskId, key);
      } catch (e) {
        // error sementara (jaringan / 5xx / konkurensi) jangan langsung gagalkan adegan
        if (e instanceof HfError && e.retryable) {
          return NextResponse.json({ status: "PROCESSING" });
        }
        await db.scene.update({
          where: { id: sceneId },
          data: { status: "video-failed", videoTaskId: null, videoProvider: null },
        });
        return NextResponse.json({ status: "FAIL", message: (e as Error).message });
      }
      if (poll.state === "PROCESSING") {
        return NextResponse.json({ status: "PROCESSING" });
      }
      if (poll.state === "FAIL") {
        await db.scene.update({
          where: { id: sceneId },
          data: { status: "video-failed", videoTaskId: null, videoProvider: null },
        });
        return NextResponse.json({ status: "FAIL", message: poll.message });
      }
      if (!poll.videoUrl) {
        await db.scene.update({
          where: { id: sceneId },
          data: { status: "video-failed", videoTaskId: null, videoProvider: null },
        });
        return NextResponse.json({ status: "FAIL", message: "Higgsfield selesai tanpa file video" });
      }
      const videoUrl = await downloadAsset(poll.videoUrl, `video-${scene.id}-${Date.now()}.mp4`);
      await db.scene.update({
        where: { id: sceneId },
        data: { videoUrl, status: "video-ready", videoTaskId: null, videoProvider: null },
      });
      return NextResponse.json({ status: "SUCCESS", videoUrl });
    }

    // -------------------------------------------------------- Z.AI bawaan
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
