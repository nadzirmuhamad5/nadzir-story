"use client";

// ---------------------------------------------------------------------------
// Website resmi Nadzir Story — aplikasi desktop (Electron) yang mengubah satu
// ide cerita menjadi video YouTube lengkap. Semua fakta diambil dari repo
// nadzirmuhamad5/nadzir-story (README, docs, katalog model). Screenshot asli
// aplikasi ada di /public/app/*.webp.
// ---------------------------------------------------------------------------

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  Captions,
  Check,
  Clapperboard,
  Download,
  Film,
  Github,
  HardDrive,
  KeyRound,
  Layers,
  Mic,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Data statis
// ---------------------------------------------------------------------------

const GITHUB_URL = "https://github.com/nadzirmuhamad5/nadzir-story";
const ZIP_URL = "/delivery/nadzir-story-gemini.zip";

type Step = { title: string; desc: string; img: string; alt: string };

const STEPS: Step[] = [
  {
    title: "Tulis satu ide",
    desc: "Cukup satu kalimat, misalnya \"Bagaimana rasanya hidup di Batavia tahun 1700-an?\". Nadzir Story menyusun konsep, judul, dan karakter dari ide itu.",
    img: "/app/ide-cerita.webp",
    alt: "Langkah Ide cerita dengan kolom ide, gaya video, durasi, dan pilihan model AI",
  },
  {
    title: "Naskah tersusun otomatis",
    desc: "LLM (Gemini, OpenRouter, atau Groq) memecah ide menjadi naskah per klip yang rapi — siap kamu sunting sebelum lanjut.",
    img: "/app/naskah.webp",
    alt: "Langkah Naskah berisi daftar klip dengan narasi dan prompt visual",
  },
  {
    title: "Storyboard & gambar",
    desc: "Lembar karakter menjaga wajah dan busana tetap konsisten antar klip. Nano Banana Pro hingga 4K, atau 14 model gambar Higgsfield.",
    img: "/app/storyboard.webp",
    alt: "Langkah Storyboard dengan galeri gambar klip dan lembar karakter",
  },
  {
    title: "Klip dihidupkan jadi video",
    desc: "Veo 3.1 / 3.1 Fast / Veo 3 memakai gambar klip sebagai frame pertama, begitu juga 34 model video Higgsfield. Job yang terputus dilanjutkan otomatis.",
    img: "/app/editor.webp",
    alt: "Editor timeline berisi klip video yang sedang dirender",
  },
  {
    title: "Suara narator & caption karaoke",
    desc: "Suara narator dari Gemini TTS atau ElevenLabs, lalu whisper.cpp yang berjalan lokal menyamakan setiap kata dengan audio — caption karaoke siap pakai.",
    img: "/app/caption.webp",
    alt: "Panel Caption dengan pratinjau gaya karaoke dan daftar font",
  },
  {
    title: "Timeline & ekspor",
    desc: "Rakit di timeline: transisi, gerak kamera, overlay, dan musik. Ekspor jadi MP4 1080p lewat FFmpeg — siap diunggah ke YouTube.",
    img: "/app/transisi.webp",
    alt: "Panel Transisi dengan pratinjau transisi geser antar klip",
  },
];

const FEATURES = [
  {
    icon: Clapperboard,
    title: "Satu ide → video lengkap",
    desc: "Naskah, gambar, video, suara narator, caption, dan musik dirangkai jadi satu MP4 1080p. Tanpa pindah aplikasi.",
  },
  {
    icon: Layers,
    title: "Dua penyedia AI, satu daftar",
    desc: "Higgsfield dan Google Gemini berdampingan. Ganti model per proyek — proyek lama tetap terbuka tanpa migrasi apa pun.",
  },
  {
    icon: BadgeCheck,
    title: "Karakter konsisten",
    desc: "Lembar karakter dipakai sebagai referensi gambar dan video, jadi tokoh tidak berubah wajah di tengah cerita.",
  },
  {
    icon: Captions,
    title: "Caption karaoke akurat",
    desc: "whisper.cpp berjalan lokal di komputermu, menyamakan kata dengan suara per detik. Puluhan font dengan pratinjau langsung.",
  },
  {
    icon: Mic,
    title: "Suara narator fleksibel",
    desc: "Gemini TTS dengan satu kunci yang sama, atau ElevenLabs untuk variasi suara lain. Musik latar digabung saat ekspor.",
  },
  {
    icon: ShieldCheck,
    title: "Datamu tetap di rumah",
    desc: "Proyek, aset, dan kunci API tersimpan terenkripsi di komputermu — bukan di server kami. Tidak ada akun, tidak ada pelacakan.",
  },
];

const HF_FAMILIES = [
  "Kling",
  "Seedance",
  "Hailuo",
  "MiniMax",
  "Wan",
  "PixVerse",
  "Grok",
  "GPT Image",
  "Ideogram",
  "Recraft",
  "Qwen",
  "LTX",
  "Cinema Studio",
  "+3 lainnya",
];

const GEMINI_MODELS = [
  { name: "Nano Banana Pro", kind: "Gambar", note: "gemini-3-pro-image-preview · hingga 4K" },
  { name: "Nano Banana", kind: "Gambar", note: "gemini-2.5-flash-image · cepat & hemat" },
  { name: "Veo 3.1", kind: "Video", note: "kualitas terbaik · 720p/1080p" },
  { name: "Veo 3.1 Fast", kind: "Video", note: "render lebih cepat" },
  { name: "Veo 3", kind: "Video", note: "generasi sebelumnya" },
];

const FAQS = [
  {
    q: "Apakah Nadzir Story gratis?",
    a: "Aplikasinya gratis dan open source (lisensi MIT). Biaya hanya berasal dari layanan AI yang kamu pakai: Higgsfield memakai sistem kredit, sedangkan Gemini, OpenRouter, dan Groq dibayar per pemakaian lewat kunci milikmu sendiri. Caption dengan whisper.cpp berjalan lokal tanpa biaya.",
  },
  {
    q: "Di mana proyek saya disimpan?",
    a: "Semua di komputermu, di folder %APPDATA%\\Nadzir Story: database SQLite (studio.db) plus folder projects berisi gambar, video, dan suara. Proyek tersimpan otomatis, atau tekan Ctrl+S. Tidak ada unggahan ke server mana pun.",
  },
  {
    q: "Apakah kunci API saya aman?",
    a: "Kunci disimpan terenkripsi dengan Electron safeStorage (DPAPI di Windows), terikat pada akun pengguna komputermu. Kunci hanya dikirim langsung ke layanan yang kamu pakai — tidak melewati pihak lain.",
  },
  {
    q: "Apakah butuh internet dan GPU?",
    a: "Internet diperlukan saat memanggil layanan AI (naskah, gambar, video, suara). Caption karaoke memakai whisper.cpp yang berjalan lokal di CPU, jadi tahap itu tetap jalan offline. GPU khusus tidak diwajibkan.",
  },
  {
    q: "Jalan di macOS?",
    a: "Kode sumber bisa dijalankan di macOS lewat npm install dan npm run dev, tapi aplikasi belum diuji penuh di sana. Installer Windows dan caption akurat (whisper.cpp) resminya untuk Windows 10/11 64-bit.",
  },
];

const NAV = [
  { href: "#fitur", label: "Fitur" },
  { href: "#alur", label: "Alur" },
  { href: "#model", label: "Model AI" },
  { href: "#unduh", label: "Unduh" },
  { href: "#faq", label: "FAQ" },
];

// ---------------------------------------------------------------------------
// Komponen kecil
// ---------------------------------------------------------------------------

function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 34" className={className} role="img" aria-label="Logo Nadzir Story">
      <rect x="1" y="1" width="32" height="32" rx="9" fill="#C93A1B" stroke="#1F1D1A" strokeWidth="1.5" />
      <circle cx="17" cy="11" r="4.2" fill="#FFFFFF" stroke="#1F1D1A" strokeWidth="1.6" />
      <path
        d="M17 15.4v7.1M17 17.6l-5 3.4M17 17.6l5.2-4.2M17 22.5l-3.6 6M17 22.5l3.6 6"
        fill="none"
        stroke="#1F1D1A"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SectionHeading({ eyebrow, title, desc }: { eyebrow: string; title: string; desc?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#C93A1B]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance text-stone-900 sm:text-4xl">{title}</h2>
      {desc && <p className="mt-4 text-base leading-relaxed text-pretty text-stone-600">{desc}</p>}
    </div>
  );
}

function CopyBlock({ lines }: { lines: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(lines);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard tidak tersedia — abaikan diam-diam
    }
  };
  return (
    <div className="relative overflow-x-auto rounded-xl bg-stone-900 p-4 pr-12 text-left">
      <button
        type="button"
        onClick={copy}
        aria-label="Salin perintah"
        className="absolute right-2 top-2 rounded-lg p-2 text-stone-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        {copied ? <Check className="h-4 w-4 text-[#D1FE17]" aria-hidden="true" /> : <Terminal className="h-4 w-4" aria-hidden="true" />}
      </button>
      <code className="block whitespace-pre font-mono text-xs leading-relaxed text-stone-100 sm:text-sm">{lines}</code>
    </div>
  );
}

function Screenshot({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-900/10 bg-white shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-stone-900/10 bg-[#F3EFE8] px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-stone-300" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-stone-300" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-stone-300" aria-hidden="true" />
        <span className="ml-2 font-mono text-[10px] text-stone-400">Nadzir Story</span>
      </div>
      <div className="relative aspect-video">
        <Image src={src} alt={alt} fill sizes="(max-width: 768px) 100vw, 960px" className="object-cover" priority={priority} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Halaman
// ---------------------------------------------------------------------------

export default function LandingPage({ onOpenStudio }: { onOpenStudio: () => void }) {
  const [activeStep, setActiveStep] = useState(0);
  const step = STEPS[activeStep];

  return (
    <div className="flex min-h-screen flex-col bg-[#F3EFE8] text-stone-900">
      {/* ------------------------------- Header ------------------------------ */}
      <header className="sticky top-0 z-50 border-b border-stone-900/10 bg-[#F3EFE8]/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="#" className="flex items-center gap-2.5" aria-label="Nadzir Story — kembali ke atas">
            <LogoMark />
            <span className="text-lg font-bold tracking-tight">Nadzir Story</span>
          </a>
          <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-900/5 hover:text-stone-900"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <Button onClick={onOpenStudio} className="h-11 bg-[#C93A1B] px-5 font-semibold text-white hover:bg-[#A92F14]">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Buka Studio
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* -------------------------------- Hero ----------------------------- */}
        <section className="relative overflow-hidden" aria-labelledby="hero-title">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(31,29,26,0.08) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
            aria-hidden="true"
          />
          <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-14 text-center sm:px-6 md:pb-24 md:pt-20">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Badge className="border-stone-400 bg-transparent font-mono text-xs text-stone-600" variant="outline">
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-[#C93A1B]" aria-hidden="true" />
                AI Story Studio — langsung dari browser
              </Badge>

              <h1 id="hero-title" className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
                Satu ide cerita,{" "}
                <span className="relative inline-block -rotate-1 rounded-lg bg-[#D1FE17] px-3">jadi video YouTube</span>{" "}
                lengkap.
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-pretty text-stone-600 sm:text-lg">
                Tulis satu ide, studio web ini merangkai sisanya: naskah AI, karakter, adegan, gambar &amp; video AI —
                semuanya langsung di browser tanpa instalasi apa pun.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  onClick={onOpenStudio}
                  size="lg"
                  className="h-12 bg-[#C93A1B] px-7 text-base font-semibold text-white shadow-lg shadow-[#C93A1B]/25 hover:bg-[#A92F14]"
                >
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                  Buka Studio — gratis
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 border-stone-400 bg-transparent px-7 text-base font-semibold text-stone-800 hover:bg-stone-900/5 hover:text-stone-900"
                >
                  <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label="Buka repo Nadzir Story di GitHub">
                    <Github className="h-5 w-5" aria-hidden="true" />
                    Lihat di GitHub
                  </a>
                </Button>
              </div>

              <p className="mt-5 font-mono text-xs text-stone-500">Berjalan di browser · tanpa instalasi · gratis &amp; open source (MIT)</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative mx-auto mt-12 max-w-4xl"
            >
              <Screenshot src="/app/beranda.webp" alt="Beranda Nadzir Story dengan tombol mulai proyek baru" priority />
              <span className="absolute -left-3 top-8 hidden -rotate-3 rounded-lg border border-stone-900/10 bg-[#D1FE17] px-3 py-1.5 text-xs font-bold text-stone-900 shadow-md md:block">
                Nano Banana Pro · 4K
              </span>
              <span className="absolute -right-3 top-24 hidden rotate-2 rounded-lg border border-stone-900/10 bg-white px-3 py-1.5 text-xs font-bold text-stone-900 shadow-md md:block">
                Veo 3.1 · 1080p
              </span>
              <span className="absolute -bottom-3 left-10 hidden -rotate-2 rounded-lg border border-stone-900/10 bg-stone-900 px-3 py-1.5 text-xs font-bold text-[#D1FE17] shadow-md md:block">
                Caption karaoke otomatis
              </span>
            </motion.div>
          </div>
        </section>

        {/* ------------------------------ Statistik ---------------------------- */}
        <section aria-label="Angka penting" className="border-y border-stone-900/10 bg-[#FCFAF4]">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4">
            {[
              { num: "53", label: "model AI siap pakai" },
              { num: "6", label: "langkah dari ide ke ekspor" },
              { num: "1080p", label: "render FFmpeg" },
              { num: "100%", label: "data di komputermu" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-display text-3xl font-bold tracking-tight text-[#C93A1B] sm:text-4xl">{s.num}</p>
                <p className="mt-1 text-sm text-stone-600">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------- Fitur ----------------------------- */}
        <section id="fitur" className="scroll-mt-24 py-16 md:py-24" aria-labelledby="fitur-title">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="01 · Fitur"
              title="Semua yang dibutuhkan kreator cerita"
              desc="Dari kalimat pertama sampai file final — tanpa berpindah aplikasi, tanpa menyewa server."
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <Card
                  key={f.title}
                  className="group border-stone-300/70 bg-[#FCFAF4] shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                >
                  <CardContent className="p-6">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#C93A1B]/10 text-[#C93A1B] transition-colors group-hover:bg-[#C93A1B] group-hover:text-white">
                      <f.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold tracking-tight text-stone-900">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-stone-600">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------ Alur produksi ----------------------- */}
        <section id="alur" className="scroll-mt-24 border-y border-stone-900/10 bg-[#FCFAF4] py-16 md:py-24" aria-labelledby="alur-title">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="02 · Alur produksi"
              title="Enam langkah, satu aplikasi"
              desc="Klik tiap langkah untuk melihat tampilannya di aplikasi."
            />

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[380px_1fr] lg:items-start lg:gap-12">
              <ol className="flex flex-col gap-2" aria-label="Langkah produksi">
                {STEPS.map((s, i) => {
                  const active = i === activeStep;
                  return (
                    <li key={s.title}>
                      <button
                        type="button"
                        onClick={() => setActiveStep(i)}
                        aria-pressed={active}
                        className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${
                          active
                            ? "border-[#C93A1B] bg-white shadow-md"
                            : "border-transparent bg-transparent hover:border-stone-300 hover:bg-white/60"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold ${
                            active ? "bg-[#C93A1B] text-white" : "bg-stone-900/10 text-stone-500"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span>
                          <span className={`block font-semibold ${active ? "text-stone-900" : "text-stone-700"}`}>{s.title}</span>
                          <span className={`mt-0.5 hidden text-sm leading-relaxed text-stone-600 sm:block ${active ? "" : "line-clamp-1"}`}>
                            {s.desc}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>

              <div className="lg:sticky lg:top-24">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step.img}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Screenshot src={step.img} alt={step.alt} />
                    <p className="mt-4 text-sm leading-relaxed text-stone-600 sm:text-base">{step.desc}</p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------- Model AI -------------------------- */}
        <section id="model" className="scroll-mt-24 py-16 md:py-24" aria-labelledby="model-title">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="03 · Model AI"
              title="Pilih dari 53 model"
              desc="Semua model tampil dalam satu daftar di langkah Ide cerita — ganti-ganti sesuai mood dan budget."
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Gemini — highlight */}
              <Card className="border-[#C93A1B]/40 bg-[#FCFAF4] shadow-md ring-2 ring-[#D1FE17]">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-bold tracking-tight text-stone-900">Google Gemini</h3>
                    <Badge className="border-transparent bg-[#D1FE17] font-bold text-stone-900">Bintang kami</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">
                    Satu kunci Google AI Studio untuk <strong className="text-stone-800">semua</strong>: penyusun naskah,
                    suara narator, gambar, dan video. Bayar per pemakaian, tanpa sistem kredit.
                  </p>
                  <ul className="mt-5 flex flex-col gap-2.5">
                    {GEMINI_MODELS.map((m) => (
                      <li key={m.name} className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3">
                        <span className="flex items-center gap-2.5 font-semibold text-stone-900">
                          <Check className="h-4 w-4 shrink-0 text-[#C93A1B]" aria-hidden="true" />
                          {m.name}
                        </span>
                        <span className="text-right font-mono text-[11px] text-stone-500">{m.note}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Higgsfield */}
              <Card className="border-stone-300/70 bg-[#FCFAF4] shadow-sm">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-bold tracking-tight text-stone-900">Higgsfield</h3>
                    <Badge variant="outline" className="border-stone-400 font-semibold text-stone-600">
                      Default
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">
                    Katalog penuh: <strong className="text-stone-800">14 model gambar &amp; 34 model video</strong> dari
                    16 family. Perkiraan kredit tampil sebelum render, jadi tidak ada kejutan biaya.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {HF_FAMILIES.map((f) => (
                      <span key={f} className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700">
                        {f}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-stone-900/[0.04] p-3 text-xs leading-relaxed text-stone-600">
                    <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
                    Kunci API Higgsfield (opsional) dibuat di console Higgsfield, format KEY_ID:KEY_SECRET.
                  </div>
                </CardContent>
              </Card>
            </div>

            <p className="mx-auto mt-8 flex max-w-3xl items-center justify-center gap-2 text-center text-sm text-stone-500">
              <HardDrive className="h-4 w-4 shrink-0" aria-hidden="true" />
              Id model Gemini disimpan dengan prefiks <code className="rounded bg-stone-900/10 px-1.5 py-0.5 font-mono text-xs">gemini:</code> —
              proyek lama tetap terbuka tanpa migrasi database.
            </p>
          </div>
        </section>

        {/* -------------------------------- Unduh ----------------------------- */}
        <section id="unduh" className="scroll-mt-24 border-y border-stone-900/10 bg-[#FCFAF4] py-16 md:py-24" aria-labelledby="unduh-title">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="04 · Unduh"
              title="Mulai dalam tiga menit"
              desc="Unduh kodenya, pasang dependensi, tempel kunci API-mu — lalu buat video pertamamu."
            />

            <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-2xl bg-stone-900 p-6 sm:flex-row sm:items-center md:p-8">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-[#D1FE17]">Baru · versi web</p>
                <h3 className="mt-1.5 text-xl font-bold tracking-tight text-white">Nadzir Story Web Studio</h3>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-stone-300">
                  Buat proyek, tulis cerita dengan AI, bangun karakter &amp; adegan, hasilkan gambar — tanpa install apa pun.
                </p>
              </div>
              <Button
                onClick={onOpenStudio}
                className="h-12 shrink-0 bg-[#D1FE17] px-6 font-semibold text-stone-900 hover:bg-[#C4EF12]"
              >
                <Sparkles className="mr-1 h-4 w-4" aria-hidden="true" />
                Buka Studio
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr] lg:gap-8">
              <Card className="border-stone-300/70 bg-white shadow-sm">
                <CardContent className="flex h-full flex-col p-6 md:p-8">
                  <h3 className="text-lg font-semibold tracking-tight text-stone-900">Dapatkan kodenya</h3>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <Button asChild className="h-14 flex-1 justify-start bg-[#C93A1B] px-5 text-white hover:bg-[#A92F14]">
                      <a href={ZIP_URL} download aria-label="Unduh ZIP lengkap kode sumber Nadzir Story">
                        <Download className="mr-1 h-5 w-5" aria-hidden="true" />
                        <span className="flex flex-col items-start leading-tight">
                          <span className="text-sm font-semibold">Download ZIP</span>
                          <span className="font-mono text-[11px] opacity-80">8,6 MB · tanpa build</span>
                        </span>
                      </a>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-14 flex-1 justify-start border-stone-400 bg-transparent px-5 text-stone-900 hover:bg-stone-900/5 hover:text-stone-900"
                    >
                      <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label="Buka repo nadzir-story di GitHub">
                        <Github className="mr-1 h-5 w-5" aria-hidden="true" />
                        <span className="flex flex-col items-start leading-tight">
                          <span className="text-sm font-semibold">Repo GitHub</span>
                          <span className="font-mono text-[11px] text-stone-500">nadzirmuhamad5/nadzir-story</span>
                        </span>
                      </a>
                    </Button>
                  </div>
                  <div className="mt-5">
                    <CopyBlock lines={`git clone https://github.com/nadzirmuhamad5/nadzir-story.git\ncd nadzir-story\nnpm install\nnpm run dev`} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-stone-300/70 bg-white shadow-sm">
                <CardContent className="flex h-full flex-col p-6 md:p-8">
                  <h3 className="text-lg font-semibold tracking-tight text-stone-900">Yang perlu disiapkan</h3>
                  <ul className="mt-5 flex flex-col gap-3">
                    {[
                      { icon: HardDrive, text: "Windows 10/11 64-bit (atau jalankan dari kode sumber di macOS)" },
                      { icon: KeyRound, text: "Kunci Google AI Studio — untuk Gemini: naskah, suara, Nano Banana, dan Veo" },
                      { icon: KeyRound, text: "Kunci Higgsfield (opsional) — untuk 48 model gambar & video Higgsfield" },
                      { icon: Mic, text: "Kunci ElevenLabs / OpenRouter / Groq (opsional) — variasi suara & LLM lain" },
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 rounded-xl border border-stone-200 bg-[#FCFAF4] p-3.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#C93A1B]/10 text-[#C93A1B]">
                          <item.icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="text-sm leading-relaxed text-stone-700">{item.text}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-auto pt-5 text-xs leading-relaxed text-stone-500">
                    Kunci tersimpan terenkripsi di komputermu (safeStorage) dan hanya dikirim langsung ke layanan terkait.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* --------------------------------- FAQ ------------------------------ */}
        <section id="faq" className="scroll-mt-24 py-16 md:py-24" aria-labelledby="faq-title">
          <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
            <SectionHeading eyebrow="05 · FAQ" title="Pertanyaan yang sering muncul" />
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-stone-300/70">
                  <AccordionTrigger className="text-left text-base font-semibold text-stone-900 hover:no-underline hover:text-[#C93A1B]">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-stone-600">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ------------------------------ CTA akhir ---------------------------- */}
        <section className="pb-16 md:pb-24" aria-label="Ajakan terakhir">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="rounded-3xl bg-stone-900 px-6 py-12 text-center md:px-12 md:py-16">
              <h2 className="text-3xl font-bold tracking-tight text-balance text-white sm:text-4xl">
                Cerita pertamamu menunggu{" "}
                <span className="relative inline-block rotate-1 rounded-lg bg-[#D1FE17] px-3 text-stone-900">diceritakan</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-stone-300">
                Buka studio di browser, tulis satu ide, dan biarkan AI menyusun naskah, visual, dan videonya.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  onClick={onOpenStudio}
                  size="lg"
                  className="h-12 bg-[#D1FE17] px-7 text-base font-semibold text-stone-900 hover:bg-[#C4EF12]"
                >
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                  Buka Studio sekarang
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 border-stone-600 bg-transparent px-7 text-base font-semibold text-white hover:bg-white/10 hover:text-white"
                >
                  <a href={ZIP_URL} download aria-label="Unduh versi desktop Nadzir Story">
                    <Download className="h-5 w-5" aria-hidden="true" />
                    Versi desktop (ZIP)
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ------------------------------- Footer ------------------------------ */}
      <footer className="mt-auto border-t border-stone-900/10 bg-[#F3EFE8] pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 text-center sm:flex-row sm:px-6 sm:text-left">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-7 w-7" />
            <div>
              <p className="text-sm font-bold tracking-tight text-stone-900">Nadzir Story</p>
              <p className="text-xs text-stone-500">Dibuat oleh Nadzir · lisensi MIT</p>
            </div>
          </div>
          <nav aria-label="Tautan footer" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-stone-600">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="transition-colors hover:text-[#C93A1B]">
                {item.label}
              </a>
            ))}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-[#C93A1B]"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              GitHub
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
