"use client";

// ---------------------------------------------------------------------------
// StoryTab — premis -> cerita AI -> naskah yang bisa disunting.
// Kolom pakai pola uncontrolled: nilai awal dari server, tersimpan otomatis
// saat blur. key mengandung nilai server sehingga hasil AI baru langsung
// tampil (remount) tanpa perlu sinkronisasi state.
// ---------------------------------------------------------------------------

import { useRef } from "react";

import { Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { styleLabelOf, type ProjectDetail } from "@/lib/nadzir";

type Props = {
  project: ProjectDetail;
  busy: boolean;
  onGenerateStory: () => Promise<void>;
  onPatch: (fields: Record<string, unknown>) => Promise<void>;
};

export default function StoryTab({ project, busy, onGenerateStory, onPatch }: Props) {
  const premiseRef = useRef<HTMLTextAreaElement>(null);
  const loglineRef = useRef<HTMLInputElement>(null);
  const storyRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(280px,2fr)_minmax(320px,3fr)] lg:gap-5">
      {/* Kolom ide */}
      <section
        aria-label="Ide dan premis"
        className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
            1 · Ide &amp; Premis
          </h2>
          <span className="font-mono text-[10px] text-zinc-600">
            {project.premise.length} karakter
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          Satu kalimat saja cukup. AI menulis cerita utuh sesuai genre{" "}
          <span className="text-zinc-300">{project.genre}</span> dan gaya visual{" "}
          <span className="text-zinc-300">{styleLabelOf(project.style)}</span>.
        </p>
        <Textarea
          ref={premiseRef}
          key={`premise-${project.id}`}
          defaultValue={project.premise}
          onBlur={() => {
            const v = premiseRef.current?.value ?? "";
            if (v !== project.premise) void onPatch({ premise: v });
          }}
          placeholder="mis. Seorang nelayan muda menemukan lampu tua di pantai yang bisa memanggil badai…"
          className="mt-3 min-h-[150px] flex-1 resize-none border-zinc-700 bg-zinc-950 text-sm leading-relaxed"
          aria-label="Premis cerita"
        />
        <Button
          onClick={() => void onGenerateStory()}
          disabled={busy}
          className="mt-4 h-11 bg-[#C93A1B] font-semibold text-white hover:bg-[#A92F14]"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          {busy ? "Menulis cerita…" : "Buat Cerita dengan AI"}
        </Button>
        <p className="mt-2.5 text-center font-mono text-[10px] leading-relaxed text-zinc-600">
          10–40 detik · judul &amp; logline ikut dibuatkan
        </p>
      </section>

      {/* Kolom naskah */}
      <section
        aria-label="Naskah cerita"
        className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
            2 · Naskah
          </h2>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-zinc-600">
              {project.story.length} karakter
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void onPatch({
                  logline: loglineRef.current?.value ?? "",
                  story: storyRef.current?.value ?? "",
                });
                toast.success("Naskah tersimpan");
              }}
              className="h-8 border-zinc-700 bg-transparent px-3 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              Simpan
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-1.5">
          <Label
            htmlFor="logline"
            className="font-mono text-[10px] uppercase tracking-widest text-zinc-500"
          >
            Logline
          </Label>
          <Input
            ref={loglineRef}
            id="logline"
            key={`logline-${project.id}-${project.logline}`}
            defaultValue={project.logline}
            aria-label="Logline cerita"
            onBlur={() => {
              const v = loglineRef.current?.value ?? "";
              if (v !== project.logline) void onPatch({ logline: v });
            }}
            placeholder="Satu kalimat yang merangkum seluruh cerita"
            className="border-zinc-700 bg-zinc-950 text-sm"
          />
        </div>

        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-1.5">
          <Label
            htmlFor="story"
            className="font-mono text-[10px] uppercase tracking-widest text-zinc-500"
          >
            Cerita lengkap — tiap paragraf menjadi satu adegan
          </Label>
          <Textarea
            ref={storyRef}
            id="story"
            aria-label="Cerita lengkap"
            key={`story-${project.id}-${project.story}`}
            defaultValue={project.story}
            onBlur={() => {
              const v = storyRef.current?.value ?? "";
              if (v !== project.story) void onPatch({ story: v });
            }}
            placeholder="Naskah cerita muncul di sini — atau tulis sendiri. Nantinya dipecah menjadi adegan di tab Adegan."
            className="min-h-[360px] flex-1 border-zinc-700 bg-zinc-950 text-sm leading-relaxed"
          />
        </div>
        <p className="mt-2 font-mono text-[10px] text-zinc-600">
          Tersimpan otomatis saat keluar dari kolom.
        </p>
      </section>
    </div>
  );
}
