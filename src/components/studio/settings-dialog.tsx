"use client";

// ---------------------------------------------------------------------------
// SettingsDialog — kelola kunci API penyedia (Gemini & Higgsfield).
// Kunci disimpan di server (tabel Setting) dan hanya ditampilkan ter-masker.
// ---------------------------------------------------------------------------

import { useState } from "react";

import { ExternalLink, KeyRound, Loader2, Sparkles, Trash2 } from "lucide-react";
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
  const [geminiInput, setGeminiInput] = useState("");
  const [hfInput, setHfInput] = useState("");
  const [savingGemini, setSavingGemini] = useState(false);
  const [savingHf, setSavingHf] = useState(false);

  const save = async (
    field: "geminiKey" | "higgsfieldKey",
    value: string,
    setBusy: (b: boolean) => void,
    clearInput: () => void,
  ) => {
    setBusy(true);
    try {
      const r = await api<SettingsInfo>("/api/settings", {
        method: "POST",
        body: JSON.stringify({ [field]: value }),
      });
      onSaved(r);
      clearInput();
      if (field === "geminiKey") {
        toast.success(
          r.geminiKeySet ? `Kunci Gemini tersimpan (${r.geminiKeyHint})` : "Kunci Gemini dihapus",
        );
        return;
      }
      // Higgsfield: kunci diuji otomatis ke API saat disimpan
      toast.success(
        r.higgsfieldKeySet
          ? `Kunci Higgsfield tersimpan (${r.higgsfieldKeyHint})`
          : "Kunci Higgsfield dihapus",
      );
      if (r.higgsfieldTest) {
        if (r.higgsfieldTest.ok) toast.success(r.higgsfieldTest.message);
        else toast.warning(`Uji koneksi gagal: ${r.higgsfieldTest.message}`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "border-stone-300 bg-white text-stone-900 placeholder:text-stone-400";
  const outlineCls =
    "border-stone-300 bg-white text-stone-700 hover:bg-stone-100 hover:text-stone-900";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-stone-200 bg-[#FCFAF4] text-stone-900 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-[#C93A1B]" aria-hidden="true" />
            Pengaturan
          </DialogTitle>
          <DialogDescription className="text-stone-600">
            Z.AI bawaan langsung bisa dipakai gratis tanpa kunci apa pun. Punya kunci sendiri?
            Tempelkan di sini untuk membuka model Gemini (Nano Banana &amp; Veo) atau Higgsfield
            (Soul, Kling, Seedance, dll).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* ------------------------------------------------ Gemini */}
          <section className="flex flex-col gap-1.5 rounded-xl border border-stone-200 bg-white/60 p-3.5">
            <Label htmlFor="gemini-key" className="flex items-center gap-1.5 text-xs text-stone-600">
              <Sparkles className="h-3.5 w-3.5 text-[#C93A1B]" aria-hidden="true" />
              Kunci Google AI Studio (Gemini)
            </Label>
            <Input
              id="gemini-key"
              type="password"
              value={geminiInput}
              onChange={(e) => setGeminiInput(e.target.value)}
              placeholder={
                info?.geminiKeySet
                  ? `Terpasang ${info.geminiKeyHint} — tempel kunci baru untuk mengganti`
                  : "AIza…"
              }
              autoComplete="off"
              className={inputCls}
            />
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
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={savingGemini || !geminiInput.trim()}
                onClick={() => void save("geminiKey", geminiInput.trim(), setSavingGemini, () => setGeminiInput(""))}
                className="h-9 bg-[#C93A1B] px-3 font-semibold text-white hover:bg-[#A92F14]"
              >
                {savingGemini ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                )}
                Simpan kunci Gemini
              </Button>
              {info?.geminiKeySet && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={savingGemini}
                  onClick={() => void save("geminiKey", "", setSavingGemini, () => setGeminiInput(""))}
                  className={`h-9 px-3 hover:border-red-300 hover:bg-red-50 hover:text-red-600 ${outlineCls}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Hapus
                </Button>
              )}
            </div>
          </section>

          {/* ------------------------------------------------ Higgsfield */}
          <section className="flex flex-col gap-1.5 rounded-xl border border-stone-200 bg-white/60 p-3.5">
            <Label htmlFor="hf-key" className="flex items-center gap-1.5 text-xs text-stone-600">
              <KeyRound className="h-3.5 w-3.5 text-[#C93A1B]" aria-hidden="true" />
              Kunci API Higgsfield
            </Label>
            <Input
              id="hf-key"
              type="password"
              value={hfInput}
              onChange={(e) => setHfInput(e.target.value)}
              placeholder={
                info?.higgsfieldKeySet
                  ? `Terpasang ${info.higgsfieldKeyHint} — tempel kunci baru untuk mengganti`
                  : "KEY_ID:KEY_SECRET"
              }
              autoComplete="off"
              className={inputCls}
            />
            <p className="text-[11px] leading-relaxed text-stone-500">
              Format <span className="font-mono font-semibold">KEY_ID:KEY_SECRET</span> — pakai
              tombol &quot;Copy API key&quot; di{" "}
              <a
                href="https://console.higgsfield.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-semibold text-[#C93A1B] underline-offset-2 hover:underline"
              >
                console.higgsfield.ai
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
              . Kunci diuji otomatis saat disimpan; generasi memakai kredit akunmu sendiri.
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={savingHf || !hfInput.trim()}
                onClick={() => void save("higgsfieldKey", hfInput.trim(), setSavingHf, () => setHfInput(""))}
                className="h-9 bg-[#C93A1B] px-3 font-semibold text-white hover:bg-[#A92F14]"
              >
                {savingHf ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                )}
                Simpan kunci Higgsfield
              </Button>
              {info?.higgsfieldKeySet && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={savingHf}
                  onClick={() => void save("higgsfieldKey", "", setSavingHf, () => setHfInput(""))}
                  className={`h-9 px-3 hover:border-red-300 hover:bg-red-50 hover:text-red-600 ${outlineCls}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Hapus
                </Button>
              )}
            </div>
            {info?.higgsfieldTest && (
              <p
                className={`text-[11px] font-medium leading-relaxed ${
                  info.higgsfieldTest.ok ? "text-emerald-700" : "text-red-600"
                }`}
                role="status"
              >
                {info.higgsfieldTest.ok ? "✓ " : "✗ "}
                {info.higgsfieldTest.message}
              </p>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className={`${outlineCls} w-full sm:w-auto`}
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
