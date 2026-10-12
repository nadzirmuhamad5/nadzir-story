"use client";

// ---------------------------------------------------------------------------
// CharactersTab — daftar karakter + potret AI.
// ---------------------------------------------------------------------------

import { useState } from "react";

import Image from "next/image";
import { Loader2, Pencil, Plus, RefreshCw, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CharacterData } from "@/lib/nadzir";

type Props = {
  characters: CharacterData[];
  busyMap: Record<string, boolean>;
  onAdd: (name: string, description: string) => Promise<void>;
  onPatch: (id: string, fields: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onGeneratePortrait: (id: string) => Promise<void>;
};

export default function CharactersTab({
  characters,
  busyMap,
  onAdd,
  onPatch,
  onDelete,
  onGeneratePortrait,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CharacterData | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CharacterData | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setDialogOpen(true);
  };

  const openEdit = (c: CharacterData) => {
    setEditing(c);
    setName(c.name);
    setDescription(c.description);
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Nama karakter wajib diisi");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await onPatch(editing.id, { name: name.trim(), description: description.trim() });
        toast.success("Karakter diperbarui");
      } else {
        await onAdd(name.trim(), description.trim());
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
            Buku Karakter
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Deskripsi karakter dipakai AI saat membuat potret &amp; konsistensi wajah.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="h-10 bg-[#C93A1B] px-4 font-semibold text-white hover:bg-[#A92F14]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah Karakter
        </Button>
      </div>

      {characters.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-14 text-center">
          <UserRound className="h-8 w-8 text-zinc-600" aria-hidden="true" />
          <p className="max-w-sm text-sm leading-relaxed text-zinc-400">
            Belum ada karakter. Tambahkan tokoh utama, antagonis, atau pendukung — lalu buat
            potretnya dengan AI.
          </p>
          <Button
            onClick={openCreate}
            variant="outline"
            className="mt-1 border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tambah karakter pertama
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {characters.map((c) => {
            const busy = !!busyMap[c.id];
            return (
              <article
                key={c.id}
                className="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60"
              >
                <div className="relative aspect-square w-full bg-zinc-950">
                  {c.imageUrl ? (
                    <Image
                      src={c.imageUrl}
                      alt={`Potret karakter ${c.name}`}
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-600">
                      <UserRound className="h-10 w-10" aria-hidden="true" />
                      <span className="font-mono text-[10px] uppercase tracking-widest">
                        Belum ada potret
                      </span>
                    </div>
                  )}
                  {busy && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-950/80 backdrop-blur-sm">
                      <Loader2 className="h-7 w-7 animate-spin text-[#D1FE17]" aria-hidden="true" />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-300">
                        Menggambar…
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold tracking-tight text-zinc-100">{c.name}</h3>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        aria-label={`Sunting karakter ${c.name}`}
                        onClick={() => openEdit(c)}
                        className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Hapus karakter ${c.name}`}
                        onClick={() => setDeleteTarget(c)}
                        className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-red-500/15 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <p className="line-clamp-3 text-xs leading-relaxed text-zinc-400">
                    {c.description || "Tanpa deskripsi."}
                  </p>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => void onGeneratePortrait(c.id)}
                    className="mt-auto h-9 w-full border-zinc-700 bg-zinc-950 font-semibold text-zinc-100 hover:border-[#C93A1B]/60 hover:bg-zinc-900"
                    variant="outline"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : c.imageUrl ? (
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {c.imageUrl ? "Ulangi Potret AI" : "Buat Potret AI"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Dialog tambah/sunting */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-zinc-700 bg-zinc-900 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Sunting Karakter" : "Karakter Baru"}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Jelaskan penampilan &amp; wataknya — semakin detail, semakin konsisten potretnya.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ch-name" className="text-xs text-zinc-400">
                Nama
              </Label>
              <Input
                id="ch-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="mis. Ki Daru"
                className="border-zinc-700 bg-zinc-950"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ch-desc" className="text-xs text-zinc-400">
                Deskripsi
              </Label>
              <Textarea
                id="ch-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="mis. Lelaki 50 tahun, kurus, berjanggut putih, memakai beskap cokelat dan blangkon, tatapan tajam"
                className="min-h-[100px] border-zinc-700 bg-zinc-950"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            >
              Batal
            </Button>
            <Button
              onClick={() => void submit()}
              disabled={saving}
              className="bg-[#C93A1B] font-semibold text-white hover:bg-[#A92F14]"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
              {editing ? "Simpan perubahan" : "Tambahkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-zinc-700 bg-zinc-900 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus karakter &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Potret dan deskripsinya akan hilang dari buku karakter proyek ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) void onDelete(deleteTarget.id);
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
