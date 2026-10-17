"use client";

// ---------------------------------------------------------------------------
// SettingsDialog — kelola kunci API penyedia (kini: Google AI Studio/Gemini).
// Kunci disimpan di server (tabel Setting) dan hanya ditampilkan ter-masker.
// ---------------------------------------------------------------------------

import { useState } from "react";

import { ExternalLink, KeyRound, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type SettingsInfo } from "@/lib/nadzir";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  info: SettingsInfo | null;
  onSaved: (info: SettingsInfo) => void;
};

export default function SettingsDialog({ open, onOpenChange, info, onSaved }: Props) {
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (value: string) => {
    setSaving(true);
    try {
      const r = await api<SettingsInfo>("/api/settings", {
        method: "POST",
        body: JSON.stringify({ geminiKey: value }),
      });
      onSaved(r);
      setKeyInput("");
      toast.success(
        r.geminiKeySet
          ? `Kunci Gemini tersimpan (${r.geminiKeyHint})`
          : "Kunci Gemini dihapus",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-stone-200 bg-[#FCFAF4] text-stone-900 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-[#C93A1B]" aria-hidden="true" />
            Pengaturan
          </DialogTitle>
          <DialogDescription className="text-stone-600">
            Nadzir AI bawaan langsung bisa dipakai tanpa kunci apa pun. Punya kunci Google AI
            Studio sendiri? Tempelkan di sini untuk membuka model Gemini (Nano Banana &amp; Veo).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gemini-key" className="text-xs text-stone-600">
              Kunci Google AI Studio (Gemini)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="gemini-key"
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={info?.geminiKeySet ? `Terpasang ${info.geminiKeyHint} — tempel kunci baru untuk mengganti` : "AIza…"}
                autoComplete="off"
                className="border-stone-300 bg-white text-stone-900 placeholder:text-stone-400"
              />
            </div>
            <p className="text-[11px] leading-relaxed text-stone-500">
              Kunci tersimpan di server aplikasi ini dan hanya ditampilkan ter-masker. Ambil kunci
              gratis di{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-semibold text-[#C93A1B] underline-offset-2 hover:underline"
              >
                aistudio.google.com/apikey
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
              .
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {info?.geminiKeySet ? (
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => void save("")}
              className="border-stone-300 bg-white text-stone-700 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Hapus kunci
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-stone-300 bg-white text-stone-700 hover:bg-stone-100 hover:text-stone-900"
            >
              Tutup
            </Button>
            <Button
              onClick={() => void save(keyInput)}
              disabled={saving || !keyInput.trim()}
              className="bg-[#C93A1B] font-semibold text-white hover:bg-[#A92F14]"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <KeyRound className="h-4 w-4" aria-hidden="true" />
              )}
              Simpan kunci
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
