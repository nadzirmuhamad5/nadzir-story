"use client";

// ---------------------------------------------------------------------------
// ScenesTab — pecah cerita jadi adegan, gambar AI per adegan, video AI.
// ---------------------------------------------------------------------------

import { useState } from "react";

import Image from "next/image";
import {
  ChevronDown,
  ChevronUp,
  Clapperboard,
  ImagePlus,
  Images,
  Loader2,
  Plus,
  Trash2,
  Video,
} from "lucide-react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { IMAGE_MODELS, VIDEO_MODELS, type MediaModelOption, type SceneData } from "@/lib/nadzir";

type Props = {
  scenes: SceneData[];
  hasStory: boolean;
  splitBusy: boolean;
  imageBusy: Record<string, boolean>;
  videoBusy: Record<string, boolean>;
  imageModel: string;
  videoModel: string;
  onImageModelChange: (id: string) => void;
  onVideoModelChange: (id: string) => void;
  geminiKeySet: boolean;
  higgsfieldKeySet: boolean;
  onOpenSettings: () => void;
  onSplitScenes: () => Promise<void>;
  onAddScene: () => Promise<void>;
  onPatchScene: (id: string, fields: Record<string, unknown>) => Promise<void>;
  onDeleteScene: (id: string) => Promise<void>;
  onMoveScene: (id: string, dir: -1 | 1) => Promise<void>;
  onGenerateImage: (id: string) => Promise<void>;
  onGenerateVideo: (id: string) => Promise<void>;
};

export default function ScenesTab({
  scenes,
  hasStory,
  splitBusy,
  imageBusy,
  videoBusy,
  imageModel,
  videoModel,
  onImageModelChange,
  onVideoModelChange,
  geminiKeySet,
  higgsfieldKeySet,
  onOpenSettings,
  onSplitScenes,
  onAddScene,
  onPatchScene,
  onDeleteScene,
  onMoveScene,
  onGenerateImage,
  onGenerateVideo,
}: Props) {
  const [deleteTarget, setDeleteTarget] = useState<SceneData | null>(null);
  const [confirmSplit, setConfirmSplit] = useState(false);

  const ordered = [...scenes].sort((a, b) => a.order - b.order);

  const byProvider = (kind: "image" | "video", provider: MediaModelOption["provider"]) =>
    (kind === "image" ? IMAGE_MODELS : VIDEO_MODELS).filter((m) => m.provider === provider);

  // peringatan kunci: provider terpilih yang kuncinya belum dipasang
  const missingKeys: string[] = [];
  if ((imageModel.startsWith("gemini:") || videoModel.startsWith("gemini:")) && !geminiKeySet)
    missingKeys.push("Google AI Studio (Gemini)");
  if ((imageModel.startsWith("hf:") || videoModel.startsWith("hf:")) && !higgsfieldKeySet)
    missingKeys.push("Higgsfield");

  const split = async () => {
    if (ordered.length > 0) {
      setConfirmSplit(true);
      return;
    }
    await onSplitScenes();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#C93A1B]">
            Papan Adegan
          </h2>
          <p className="mt-1 text-xs text-stone-600">
            Gambar adegan dipakai sebagai frame pertama video — hasilnya konsisten.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void onAddScene()}
            className="h-10 border-stone-300 bg-white px-3 font-semibold text-stone-700 hover:bg-stone-100 hover:text-stone-900"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adegan Manual
          </Button>
          <Button
            onClick={() => void split()}
            disabled={splitBusy || !hasStory}
            title={hasStory ? undefined : "Tulis / generate cerita dulu di tab Cerita"}
            className="h-10 bg-[#C93A1B] px-4 font-semibold text-white hover:bg-[#A92F14]"
          >
            {splitBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Clapperboard className="h-4 w-4" aria-hidden="true" />
            )}
            {splitBusy ? "Memecah cerita…" : "Bagi Cerita jadi Adegan"}
          </Button>
        </div>
      </div>

      {/* pemilih model provider */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-[#FCFAF4] px-3.5 py-3">
        <div className="flex flex-col gap-1">
          <Label className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            Model gambar
          </Label>
          <Select value={imageModel} onValueChange={onImageModelChange}>
            <SelectTrigger
              className="h-9 w-[240px] border-stone-300 bg-white text-xs text-stone-900"
              aria-label="Pilih model gambar AI"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-80 border-stone-200 bg-[#FCFAF4]">
              <SelectGroup>
                <SelectLabel className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  Z.AI · Bawaan (gratis)
                </SelectLabel>
                {byProvider("image", "zai").map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  Gemini · kunci milikmu
                </SelectLabel>
                {byProvider("image", "gemini").map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  Higgsfield · kunci milikmu
                </SelectLabel>
                {byProvider("image", "higgsfield").map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            Model video
          </Label>
          <Select value={videoModel} onValueChange={onVideoModelChange}>
            <SelectTrigger
              className="h-9 w-[240px] border-stone-300 bg-white text-xs text-stone-900"
              aria-label="Pilih model video AI"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-80 border-stone-200 bg-[#FCFAF4]">
              <SelectGroup>
                <SelectLabel className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  Z.AI · Bawaan (gratis)
                </SelectLabel>
                {byProvider("video", "zai").map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  Gemini · kunci milikmu
                </SelectLabel>
                {byProvider("video", "gemini").map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  Higgsfield · kunci milikmu
                </SelectLabel>
                {byProvider("video", "higgsfield").map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        {missingKeys.length > 0 && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="h-8 rounded-md border border-amber-300 bg-amber-50 px-3 text-[11px] font-semibold text-amber-800 transition-colors hover:bg-amber-100"
          >
            Kunci {missingKeys.join(" & ")} belum dipasang — klik untuk membuka Pengaturan
          </button>
        )}
        <span className="ml-auto hidden font-mono text-[10px] leading-relaxed text-stone-500 lg:block">
          Z.AI gratis · Gemini &amp; Higgsfield memakai kunci &amp; kuota milikmu sendiri
        </span>
      </div>

      {ordered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
          <Images className="h-8 w-8 text-stone-400" aria-hidden="true" />
          <p className="max-w-md text-sm leading-relaxed text-stone-600">
            {hasStory
              ? "Belum ada adegan. Klik \"Bagi Cerita jadi Adegan\" — AI memecah naskahmu menjadi adegan lengkap dengan prompt gambar & video."
              : "Naskah masih kosong. Buka tab Cerita, tulis premis, dan generate cerita dulu."}
          </p>
        </div>
      ) : (
        <ol className="flex flex-col gap-4">
          {ordered.map((s, i) => {
            const imgBusy = !!imageBusy[s.id];
            const vidBusy = !!videoBusy[s.id];
            return (
              <li
                key={s.id}
                className="rounded-xl border border-stone-200 bg-[#FCFAF4] p-3.5 sm:p-4"
              >
                {/* kepala adegan */}
                <div className="flex items-center gap-2">
                  <Badge className="shrink-0 bg-[#C93A1B] font-mono text-[10px] text-white">
                    {String(i + 1).padStart(2, "0")}
                  </Badge>
                  <input
                    key={s.id}
                    defaultValue={s.title}
                    aria-label={`Judul adegan ${i + 1}`}
                    onBlur={(e) => {
                      if (e.target.value !== s.title)
                        void onPatchScene(s.id, { title: e.target.value });
                    }}
                    placeholder="Judul adegan"
                    className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-stone-900 outline-none transition-colors hover:border-stone-300 focus:border-stone-400"
                  />
                  {s.status === "video-processing" && (
                    <Badge className="shrink-0 animate-pulse border border-amber-200 bg-amber-100 font-mono text-[10px] text-amber-800">
                      video diproses…
                    </Badge>
                  )}
                  {s.status === "video-failed" && (
                    <Badge className="shrink-0 border border-red-200 bg-red-100 font-mono text-[10px] text-red-700">
                      video gagal
                    </Badge>
                  )}
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      aria-label="Naikkan urutan adegan"
                      disabled={i === 0}
                      onClick={() => void onMoveScene(s.id, -1)}
                      className="rounded-md p-1.5 text-stone-500 transition-colors hover:bg-stone-200/70 hover:text-stone-900 disabled:opacity-30"
                    >
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Turunkan urutan adegan"
                      disabled={i === ordered.length - 1}
                      onClick={() => void onMoveScene(s.id, 1)}
                      className="rounded-md p-1.5 text-stone-500 transition-colors hover:bg-stone-200/70 hover:text-stone-900 disabled:opacity-30"
                    >
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Hapus adegan ${i + 1}`}
                      onClick={() => setDeleteTarget(s)}
                      className="rounded-md p-1.5 text-stone-500 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-[300px,1fr]">
                  {/* visual */}
                  <div className="flex flex-col gap-2">
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-stone-200 bg-stone-200/60">
                      {s.imageUrl ? (
                        <Image
                          src={s.imageUrl}
                          alt={s.title ? `Gambar adegan ${s.title}` : `Gambar adegan ${i + 1}`}
                          fill
                          unoptimized
                          sizes="(max-width: 768px) 100vw, 300px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-stone-400">
                          <Images className="h-7 w-7" aria-hidden="true" />
                          <span className="font-mono text-[10px] uppercase tracking-widest">
                            16:9 · belum ada gambar
                          </span>
                        </div>
                      )}
                      {imgBusy && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stone-200/70 backdrop-blur-sm">
                          <Loader2
                            className="h-6 w-6 animate-spin text-[#C93A1B]"
                            aria-hidden="true"
                          />
                          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-600">
                            Melukis adegan…
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      disabled={imgBusy}
                      onClick={() => void onGenerateImage(s.id)}
                      className="h-9 w-full border-stone-300 bg-white font-semibold text-stone-900 hover:border-[#C93A1B]/60 hover:bg-stone-100"
                      variant="outline"
                    >
                      {imgBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {s.imageUrl ? "Ulangi Gambar AI" : "Buat Gambar AI"}
                    </Button>
                    {s.videoUrl && (
                      <video
                        src={s.videoUrl}
                        controls
                        preload="metadata"
                        className="w-full rounded-lg border border-stone-200 bg-black"
                        aria-label={`Video adegan ${i + 1}`}
                      />
                    )}
                  </div>

                  {/* teks */}
                  <div className="flex min-w-0 flex-col gap-2.5">
                    <div className="flex flex-col gap-1">
                      <Label className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                        Narasi / dialog
                      </Label>
                      <Textarea
                        key={`${s.id}-narration`}
                        defaultValue={s.narration}
                        onBlur={(e) => {
                          if (e.target.value !== s.narration)
                            void onPatchScene(s.id, { narration: e.target.value });
                        }}
                        placeholder="Apa yang terjadi & dikatakan di adegan ini…"
                        className="min-h-[72px] border-stone-300 bg-white text-stone-900 text-xs leading-relaxed placeholder:text-stone-400"
                        aria-label={`Narasi adegan ${i + 1}`}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                        Prompt gambar (untuk AI)
                      </Label>
                      <Textarea
                        key={`${s.id}-imagePrompt`}
                        defaultValue={s.imagePrompt}
                        onBlur={(e) => {
                          if (e.target.value !== s.imagePrompt)
                            void onPatchScene(s.id, { imagePrompt: e.target.value });
                        }}
                        placeholder="Deskripsi visual adegan — Inggris disarankan…"
                        className="min-h-[56px] border-stone-300 bg-white text-stone-900 font-mono text-[11px] leading-relaxed placeholder:text-stone-400"
                        aria-label={`Prompt gambar adegan ${i + 1}`}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                        Prompt video (gerakan kamera)
                      </Label>
                      <Textarea
                        key={`${s.id}-videoPrompt`}
                        defaultValue={s.videoPrompt}
                        onBlur={(e) => {
                          if (e.target.value !== s.videoPrompt)
                            void onPatchScene(s.id, { videoPrompt: e.target.value });
                        }}
                        placeholder="Slow dolly-in, awan bergerak, orang berjalan…"
                        className="min-h-[56px] border-stone-300 bg-white text-stone-900 font-mono text-[11px] leading-relaxed placeholder:text-stone-400"
                        aria-label={`Prompt video adegan ${i + 1}`}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        disabled={vidBusy || s.status === "video-processing"}
                        onClick={() => void onGenerateVideo(s.id)}
                        className="h-9 bg-[#C93A1B] px-4 font-semibold text-white hover:bg-[#A92F14]"
                      >
                        {vidBusy || s.status === "video-processing" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Video className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {s.status === "video-processing"
                          ? "Video diproses…"
                          : s.videoUrl
                            ? "Buat Ulang Video"
                            : "Buat Video AI"}
                      </Button>
                      <span className="font-mono text-[10px] leading-relaxed text-stone-500">
                        {s.imageUrl
                          ? "frame pertama = gambar adegan · ±1–5 menit"
                          : "tanpa gambar: text-to-video · ±1–5 menit"}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Konfirmasi pecah ulang */}
      <AlertDialog open={confirmSplit} onOpenChange={setConfirmSplit}>
        <AlertDialogContent className="border-stone-200 bg-[#FCFAF4] text-stone-900">
          <AlertDialogHeader>
            <AlertDialogTitle>Ganti {ordered.length} adegan yang ada?</AlertDialogTitle>
            <AlertDialogDescription className="text-stone-600">
              AI akan memecah ulang naskah dan mengganti seluruh adegan sekarang (gambar &amp;
              video adegan lama ikut hilang dari daftar). Adegan manual bisa ditambah lewat
              tombol &quot;Adegan Manual&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-stone-300 bg-white text-stone-700 hover:bg-stone-100 hover:text-stone-900">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmSplit(false);
                void onSplitScenes();
              }}
              className="bg-[#C93A1B] font-semibold text-white hover:bg-[#A92F14]"
            >
              Ya, pecah ulang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Konfirmasi hapus adegan */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-stone-200 bg-[#FCFAF4] text-stone-900">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus adegan ini?</AlertDialogTitle>
            <AlertDialogDescription className="text-stone-600">
              Narasi, prompt, gambar, dan video adegan akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-stone-300 bg-white text-stone-700 hover:bg-stone-100 hover:text-stone-900">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) void onDeleteScene(deleteTarget.id);
                setDeleteTarget(null);
              }}
              className="bg-red-600 font-semibold text-white hover:bg-red-700"
            >
              Ya, hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
