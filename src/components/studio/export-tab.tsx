"use client";

// ---------------------------------------------------------------------------
// ExportTab — ringkasan proyek, salin naskah, unduh JSON & aset.
// ---------------------------------------------------------------------------

import { useState } from "react";

import { Check, Copy, Download, FileJson, Film, Images, Users, Video } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { styleLabelOf, type ProjectDetail } from "@/lib/nadzir";

type Props = {
  project: ProjectDetail;
  stats: { scenes: number; images: number; videos: number; characters: number };
};

export default function ExportTab({ project, stats }: Props) {
  const [copied, setCopied] = useState(false);

  const fullScript = () => {
    const lines: string[] = [
      `JUDUL: ${project.title}`,
      `GENRE: ${project.genre}`,
      `GAYA VISUAL: ${styleLabelOf(project.style)}`,
      "",
      `LOGLINE: ${project.logline || "-"}`,
      "",
      "=== CERITA ===",
      project.story || "(kosong)",
      "",
      "=== KARAKTER ===",
      ...(project.characters.length
        ? project.characters.map((c) => `- ${c.name}: ${c.description || "-"}`)
        : ["(belum ada)"]),
      "",
      "=== ADEGAN ===",
    ];
    [...project.scenes]
      .sort((a, b) => a.order - b.order)
      .forEach((s, i) => {
        lines.push(`[Adegan ${i + 1}] ${s.title || "(tanpa judul)"}`);
        lines.push(s.narration || "(tanpa narasi)");
        lines.push(`Prompt gambar: ${s.imagePrompt || "-"}`);
        lines.push(`Prompt video: ${s.videoPrompt || "-"}`);
        lines.push("");
      });
    return lines.join("\n");
  };

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(fullScript());
      setCopied(true);
      toast.success("Naskah lengkap disalin ke clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin — browser menolak akses clipboard");
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify({ ...project, exportedAt: new Date().toISOString() }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.title.replace(/[^\w\-]+/g, "-").toLowerCase() || "proyek"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("File JSON proyek diunduh");
  };

  const statCards = [
    { icon: Film, label: "Adegan", value: stats.scenes },
    { icon: Images, label: "Gambar AI", value: stats.images },
    { icon: Video, label: "Video AI", value: stats.videos },
    { icon: Users, label: "Karakter", value: stats.characters },
  ];

  const images = [...project.scenes]
    .sort((a, b) => a.order - b.order)
    .map((s, i) => ({ url: s.imageUrl, name: `adegan-${i + 1}`, video: s.videoUrl }))
    .filter((x): x is { url: string; name: string; video: string | null } => !!x.url);

  return (
    <div className="flex flex-col gap-4">
      {/* ringkasan */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="flex flex-col gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
          >
            <s.icon className="h-4 w-4 text-[#C93A1B]" aria-hidden="true" />
            <span className="mt-1 text-2xl font-bold tracking-tight text-zinc-100">
              {s.value}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* aksi */}
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 lg:flex-row">
        <div className="flex-1">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
            Ambil hasilnya
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Naskah lengkap (cerita + semua adegan + prompt) bisa disalin untuk dibereskan di
            aplikasi lain. JSON proyek berisi seluruh data untuk cadangan.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              onClick={() => void copyScript()}
              className="h-10 bg-[#C93A1B] px-4 font-semibold text-white hover:bg-[#A92F14]"
            >
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              Salin Naskah Lengkap
            </Button>
            <Button
              onClick={downloadJson}
              variant="outline"
              className="h-10 border-zinc-700 bg-transparent px-4 font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <FileJson className="h-4 w-4" aria-hidden="true" />
              Unduh JSON Proyek
            </Button>
          </div>
        </div>
        <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Butuh video MP4 jadi satu?
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
            Versi desktop Nadzir Story merangkai semua adegan menjadi satu video YouTube
            lengkap: narasi TTS, caption karaoke, musik, sampai ekspor 1080p.
          </p>
          <a
            href="/delivery/nadzir-story-gemini.zip"
            download
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-[#D1FE17] px-3.5 text-xs font-bold text-zinc-900 transition-colors hover:bg-[#C4EF12]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Unduh versi desktop
          </a>
        </div>
      </div>

      {/* galeri aset */}
      {images.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
            Galeri gambar ({images.length})
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img, i) => (
              <a
                key={img.url}
                href={img.url}
                download
                className="group relative aspect-video overflow-hidden rounded-lg border border-zinc-800"
                aria-label={`Unduh gambar ${img.name}`}
              >
                <img
                  src={img.url}
                  alt={`Hasil AI adegan ${i + 1}`}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-md bg-zinc-950/80 px-2 py-1 font-mono text-[10px] text-zinc-200 opacity-0 transition-opacity group-hover:opacity-100">
                  <Download className="h-3 w-3" aria-hidden="true" />
                  {img.name}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {stats.videos > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
            Video AI ({stats.videos})
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {[...project.scenes]
              .sort((a, b) => a.order - b.order)
              .filter((s) => s.videoUrl)
              .map((s, i) => (
                <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5">
                  <span className="truncate text-xs text-zinc-300">
                    {i + 1}. {s.title || "Adegan tanpa judul"}
                  </span>
                  <a
                    href={s.videoUrl!}
                    download
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-zinc-700 px-3 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-800"
                  >
                    <Download className="h-3 w-3" aria-hidden="true" />
                    MP4
                  </a>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
