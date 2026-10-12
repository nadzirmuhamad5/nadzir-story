# Nadzir Story — AI Story Studio (Web)

**Tulis satu ide, studio web ini merangkai sisanya:** naskah AI, karakter, adegan, gambar & video AI — semuanya langsung di browser, tanpa instalasi apa pun.

![Beranda](public/app/beranda.webp)

## ✨ Fitur

- **🎬 Manajemen proyek** — simpan semua ceritamu di satu tempat (SQLite lokal)
- **📝 Naskah AI** — tulis satu kalimat premis, AI menyusun cerita utuh lengkap dengan judul & logline
- **🧑‍🎨 Buku karakter** — bangun tokoh, buat potret AI yang konsisten
- **🎞️ Papan adegan** — AI memecah naskah menjadi 6–10 adegan, lengkap dengan prompt gambar & video per adegan (bisa disunting)
- **🖼️ Gambar AI per adegan** — satu klik, adegan jadi visual 16:9 (frame pertama video)
- **🎥 Video AI** — gambar adegan dihidupkan menjadi klip video 5 detik (image-to-video), status render dipantau otomatis
- **📤 Ekspor** — salin naskah lengkap, unduh JSON proyek, unduh gambar/video hasil AI

## 🧰 Teknologi

| Bagian | Teknologi |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router) + TypeScript |
| UI | Tailwind CSS 4 + shadcn/ui + lucide-react |
| Database | Prisma ORM + SQLite |
| AI | Image, video (async task + polling), & LLM via `z-ai-web-dev-sdk` (hanya di backend) |

## 🚀 Cara Menjalankan

```bash
git clone https://github.com/nadzirmuhamad5/nadzir-story.git
cd nadzir-story
cp .env.example .env
bun install          # atau: npm install
bun run db:push      # siapkan database SQLite
bun run dev          # buka http://localhost:3000
```

## 📁 Struktur

```
src/app/                  # Halaman tunggal (landing + studio) & API routes
src/app/api/              # REST API: projects, scenes, characters, AI (story/scenes/image/video), assets
src/components/studio/    # Komponen studio (cerita, karakter, adegan, ekspor)
src/components/landing/   # Halaman produk
src/lib/                  # Tipe bersama & helper server
prisma/schema.prisma      # Skema database (Project · Character · Scene)
db/assets/                # Hasil gambar/video AI (dibuat saat runtime)
```

## 🖥️ Versi Desktop

Versi desktop (Electron) — lengkap dengan ekspor MP4 1080p, suara narator, dan caption karaoke — tersedia sebagai ZIP: [`public/delivery/nadzir-story-gemini.zip`](public/delivery/nadzir-story-gemini.zip) (8,6 MB, kode sumber tanpa build).

## 📄 Lisensi

[MIT](LICENSE) — dibuat oleh [Nadzir](https://github.com/nadzirmuhamad5).
