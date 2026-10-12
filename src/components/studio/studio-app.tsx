"use client";

// ---------------------------------------------------------------------------
// StudioApp — aplikasi studio Nadzir Story yang berfungsi penuh.
// Proyek -> Cerita (AI) -> Karakter -> Adegan -> Gambar/Video AI -> Ekspor.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Clapperboard,
  Film,
  FolderOpen,
  Github,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  api,
  formatDateTime,
  GENRES,
  type ProjectDetail,
  type ProjectSummary,
  STYLES,
} from "@/lib/nadzir";
import CharactersTab from "./characters-tab";
import ExportTab from "./export-tab";
import ScenesTab from "./scenes-tab";
import StoryTab from "./story-tab";

const GITHUB_URL = "https://github.com/nadzirmuhamad5/nadzir-story";

type NewProjectForm = { title: string; genre: string; style: string; premise: string };

const EMPTY_FORM: NewProjectForm = { title: "", genre: "Drama", style: "cinematic", premise: "" };

export default function StudioApp({ onBack }: { onBack: () => void }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tab, setTab] = useState("cerita");

  // dialog / confirm state
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState<NewProjectForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null);

  // busy flags
  const [storyBusy, setStoryBusy] = useState(false);
  const [splitBusy, setSplitBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState<Record<string, boolean>>({});
  const [portraitBusy, setPortraitBusy] = useState<Record<string, boolean>>({});
  const [videoBusy, setVideoBusy] = useState<Record<string, boolean>>({});

  // ------------------------------------------------------------------ data
  const loadProjects = useCallback(async () => {
    try {
      const r = await api<{ projects: ProjectSummary[] }>("/api/projects");
      setProjects(r.projects);
      return r.projects;
    } catch (e) {
      toast.error((e as Error).message);
      return [];
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const openProject = useCallback(async (id: string) => {
    try {
      const r = await api<{ project: ProjectDetail }>(`/api/projects/${id}`);
      setProject(r.project);
      setActiveId(id);
      setTab("cerita");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);

  const createProject = async () => {
    if (!form.title.trim() && !form.premise.trim()) {
      toast.error("Isi judul atau premis cerita dulu ya");
      return;
    }
    setCreating(true);
    try {
      const r = await api<{ project: ProjectDetail }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim() || "Proyek Tanpa Judul",
          genre: form.genre,
          style: form.style,
          premise: form.premise.trim(),
        }),
      });
      setForm(EMPTY_FORM);
      setNewOpen(false);
      await loadProjects();
      setProject(r.project);
      setActiveId(r.project.id);
      setTab("cerita");
      toast.success("Proyek dibuat — tulis premisnya lalu generate cerita!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const deleteProject = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await api(`/api/projects/${target.id}`, { method: "DELETE" });
      if (activeId === target.id) {
        setActiveId(null);
        setProject(null);
      }
      await loadProjects();
      toast.success(`Proyek "${target.title}" dihapus`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const patchProject = async (fields: Record<string, unknown>) => {
    if (!project) return;
    setProject((p) => (p ? { ...p, ...fields } : p));
    try {
      await api<{ project: ProjectDetail }>(`/api/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify(fields),
      });
      void loadProjects();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // ------------------------------------------------------------------ AI
  const generateStory = async () => {
    if (!project) return;
    if (!project.premise.trim()) {
      toast.error("Tulis dulu premis/ide ceritanya di kotak sebelah kiri");
      setTab("cerita");
      return;
    }
    setStoryBusy(true);
    try {
      const r = await api<{ project: ProjectDetail }>("/api/ai/story", {
        method: "POST",
        body: JSON.stringify({ projectId: project.id, premise: project.premise }),
      });
      setProject(r.project);
      void loadProjects();
      toast.success("Cerita selesai ditulis AI! ✨");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setStoryBusy(false);
    }
  };

  const splitScenes = async () => {
    if (!project) return;
    if (!project.story.trim()) {
      toast.error("Naskah masih kosong — tulis / generate cerita dulu");
      setTab("cerita");
      return;
    }
    setSplitBusy(true);
    try {
      const r = await api<{ scenes: ProjectDetail["scenes"] }>("/api/ai/scenes", {
        method: "POST",
        body: JSON.stringify({ projectId: project.id, story: project.story }),
      });
      setProject((p) => (p ? { ...p, scenes: r.scenes } : p));
      void loadProjects();
      toast.success(`${r.scenes.length} adegan siap! Lanjut generate gambar 🎬`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSplitBusy(false);
    }
  };

  const addScene = async () => {
    if (!project) return;
    try {
      const r = await api<{ scene: ProjectDetail["scenes"][number] }>(
        `/api/projects/${project.id}/scenes`,
        { method: "POST", body: JSON.stringify({ title: "Adegan Baru" }) },
      );
      setProject((p) => (p ? { ...p, scenes: [...p.scenes, r.scene] } : p));
      void loadProjects();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const patchScene = async (id: string, fields: Record<string, unknown>) => {
    setProject((p) =>
      p ? { ...p, scenes: p.scenes.map((s) => (s.id === id ? { ...s, ...fields } : s)) } : p,
    );
    try {
      await api(`/api/scenes/${id}`, { method: "PATCH", body: JSON.stringify(fields) });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const deleteScene = async (id: string) => {
    setProject((p) => (p ? { ...p, scenes: p.scenes.filter((s) => s.id !== id) } : p));
    try {
      await api(`/api/scenes/${id}`, { method: "DELETE" });
      void loadProjects();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const moveScene = async (id: string, dir: -1 | 1) => {
    if (!project) return;
    const ordered = [...project.scenes].sort((a, b) => a.order - b.order);
    const idx = ordered.findIndex((s) => s.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= ordered.length) return;
    [ordered[idx], ordered[swap]] = [ordered[swap], ordered[idx]];
    const renumbered = ordered.map((s, i) => ({ ...s, order: i }));
    setProject((p) => (p ? { ...p, scenes: renumbered } : p));
    try {
      await api(`/api/projects/${project.id}/scenes/reorder`, {
        method: "POST",
        body: JSON.stringify({ ids: renumbered.map((s) => s.id) }),
      });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const generateImage = async (sceneId: string) => {
    if (!project) return;
    setImageBusy((m) => ({ ...m, [sceneId]: true }));
    try {
      const r = await api<{ scene: ProjectDetail["scenes"][number] }>("/api/ai/image", {
        method: "POST",
        body: JSON.stringify({ kind: "scene", id: sceneId }),
      });
      setProject((p) =>
        p ? { ...p, scenes: p.scenes.map((s) => (s.id === sceneId ? r.scene : s)) } : p,
      );
      void loadProjects();
      toast.success("Gambar adegan selesai! 🖼️");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImageBusy((m) => ({ ...m, [sceneId]: false }));
    }
  };

  const generatePortrait = async (characterId: string) => {
    setPortraitBusy((m) => ({ ...m, [characterId]: true }));
    try {
      const r = await api<{ character: ProjectDetail["characters"][number] }>("/api/ai/image", {
        method: "POST",
        body: JSON.stringify({ kind: "character", id: characterId }),
      });
      setProject((p) =>
        p
          ? {
              ...p,
              characters: p.characters.map((c) => (c.id === characterId ? r.character : c)),
            }
          : p,
      );
      toast.success("Potret karakter selesai! 🧑‍🎨");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPortraitBusy((m) => ({ ...m, [characterId]: false }));
    }
  };

  const addCharacter = async (name: string, description: string) => {
    if (!project) return;
    try {
      const r = await api<{ character: ProjectDetail["characters"][number] }>(
        `/api/projects/${project.id}/characters`,
        { method: "POST", body: JSON.stringify({ name, description }) },
      );
      setProject((p) => (p ? { ...p, characters: [...p.characters, r.character] } : p));
      toast.success(`Karakter "${name}" ditambahkan`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const patchCharacter = async (id: string, fields: Record<string, unknown>) => {
    setProject((p) =>
      p
        ? { ...p, characters: p.characters.map((c) => (c.id === id ? { ...c, ...fields } : c)) }
        : p,
    );
    try {
      await api(`/api/characters/${id}`, { method: "PATCH", body: JSON.stringify(fields) });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const deleteCharacter = async (id: string) => {
    setProject((p) =>
      p ? { ...p, characters: p.characters.filter((c) => c.id !== id) } : p,
    );
    try {
      await api(`/api/characters/${id}`, { method: "DELETE" });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const generateVideo = async (sceneId: string) => {
    setVideoBusy((m) => ({ ...m, [sceneId]: true }));
    try {
      await api<{ taskId: string }>("/api/ai/video/start", {
        method: "POST",
        body: JSON.stringify({ sceneId }),
      });
      setProject((p) =>
        p
          ? {
              ...p,
              scenes: p.scenes.map((s) =>
                s.id === sceneId ? { ...s, status: "video-processing" } : s,
              ),
            }
          : p,
      );
      toast.info("Video sedang diproses di server (1–5 menit). Aman untuk pindah tab lain.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setVideoBusy((m) => ({ ...m, [sceneId]: false }));
    }
  };

  // polling status video yang sedang diproses
  useEffect(() => {
    const processing = (project?.scenes ?? []).filter(
      (s) => s.status === "video-processing" && s.videoTaskId,
    );
    if (processing.length === 0) return;
    const timer = setInterval(async () => {
      for (const s of processing) {
        try {
          const r = await api<{ status: string; videoUrl?: string }>(
            `/api/ai/video/status?sceneId=${s.id}`,
          );
          if (r.status === "SUCCESS" && r.videoUrl) {
            const videoUrl = r.videoUrl;
            setProject((p) =>
              p
                ? {
                    ...p,
                    scenes: p.scenes.map((x) =>
                      x.id === s.id ? { ...x, status: "video-ready", videoUrl } : x,
                    ),
                  }
                : p,
            );
            toast.success("Video selesai dirender! 🎬");
          } else if (r.status === "FAIL") {
            setProject((p) =>
              p
                ? {
                    ...p,
                    scenes: p.scenes.map((x) =>
                      x.id === s.id ? { ...x, status: "video-failed" } : x,
                    ),
                  }
                : p,
            );
            toast.error(`Video adegan gagal dibuat — coba lagi`);
          }
        } catch {
          // biarkan polling berlanjut
        }
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [project?.scenes]);

  // ------------------------------------------------------------------ UI
  const sceneCount = project?.scenes.length ?? 0;
  const imageCount = (project?.scenes ?? []).filter((s) => s.imageUrl).length;
  const videoCount = (project?.scenes ?? []).filter((s) => s.videoUrl).length;

  const sidebarList = (
    <div className="flex flex-col gap-1">
      {projects.map((p) => (
        <div
          key={p.id}
          className={`group relative flex cursor-pointer flex-col gap-0.5 rounded-lg border px-3 py-2.5 transition-colors ${
            activeId === p.id
              ? "border-[#C93A1B]/60 bg-[#C93A1B]/10"
              : "border-transparent hover:border-zinc-700 hover:bg-zinc-800/60"
          }`}
          onClick={() => void openProject(p.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") void openProject(p.id);
          }}
          aria-label={`Buka proyek ${p.title}`}
        >
          <span className="truncate pr-7 text-sm font-semibold text-zinc-100">{p.title}</span>
          <span className="font-mono text-[11px] text-zinc-500">
            {p.genre} · {p.sceneCount} adegan · {formatDateTime(p.updatedAt)}
          </span>
          <button
            type="button"
            aria-label={`Hapus proyek ${p.title}`}
            className="absolute right-2 top-2 rounded-md p-1.5 text-zinc-500 opacity-0 transition-all hover:bg-red-500/15 hover:text-red-400 focus-visible:opacity-100 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(p);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}
      {!loadingList && projects.length === 0 && (
        <p className="px-3 py-6 text-center text-xs leading-relaxed text-zinc-500">
          Belum ada proyek.
          <br />
          Klik tombol + untuk mulai.
        </p>
      )}
    </div>
  );

  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-950 px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Kembali ke beranda"
            className="h-9 w-9 shrink-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#C93A1B] text-white">
            <Clapperboard className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-bold tracking-tight sm:text-base">
              Nadzir Story
            </span>
            <Badge className="hidden bg-[#D1FE17] font-mono text-[10px] text-zinc-900 sm:inline-flex">
              STUDIO WEB
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            onClick={() => {
              setForm(EMPTY_FORM);
              setNewOpen(true);
            }}
            className="h-9 bg-[#C93A1B] px-3 font-semibold text-white hover:bg-[#A92F14]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Proyek Baru</span>
          </Button>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Repo GitHub Nadzir Story"
            className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar desktop */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/40 md:flex">
          <div className="flex items-center justify-between px-4 pb-2 pt-4">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Proyek
            </h2>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              aria-label="Buat proyek baru"
              onClick={() => {
                setForm(EMPTY_FORM);
                setNewOpen(true);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <ScrollArea className="min-h-0 flex-1 px-2 pb-4">{sidebarList}</ScrollArea>
          <p className="border-t border-zinc-800 px-4 py-3 font-mono text-[10px] leading-relaxed text-zinc-600">
            Data tersimpan lokal di SQLite.
          </p>
        </aside>

        {/* Area kerja */}
        <main className="flex min-w-0 flex-1 flex-col">
          {!project ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-[#C93A1B]">
                {loadingList ? (
                  <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
                ) : (
                  <Film className="h-7 w-7" aria-hidden="true" />
                )}
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Selamat datang di Studio</h1>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
                  Pilih proyek di panel kiri, atau buat proyek baru untuk mulai mengubah satu ide
                  menjadi naskah, karakter, adegan, gambar, dan video AI.
                </p>
              </div>
              <Button
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setNewOpen(true);
                }}
                className="h-11 bg-[#C93A1B] px-6 font-semibold text-white hover:bg-[#A92F14]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Buat proyek pertama
              </Button>
            </div>
          ) : (
            <>
              {/* Baris judul & meta */}
              <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 px-3 py-2.5 sm:px-4">
                <div className="md:hidden">
                  <Select
                    value={activeId ?? undefined}
                    onValueChange={(v) => void openProject(v)}
                  >
                    <SelectTrigger
                      className="h-9 w-[150px] border-zinc-700 bg-zinc-900 text-xs"
                      aria-label="Pilih proyek"
                    >
                      <SelectValue placeholder="Pilih proyek" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  value={project.title}
                  aria-label="Judul proyek"
                  onChange={(e) => setProject((p) => (p ? { ...p, title: e.target.value } : p))}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== project.title) void patchProject({ title: v });
                    else if (!v) setProject((p) => (p ? { ...p, title: "Proyek Tanpa Judul" } : p));
                  }}
                  className="min-w-[140px] flex-1 border-transparent bg-transparent px-2 text-base font-bold tracking-tight hover:border-zinc-700 focus-visible:border-zinc-600 sm:text-lg"
                />
                <div className="flex items-center gap-1.5">
                  <Select
                    value={project.genre}
                    onValueChange={(v) => void patchProject({ genre: v })}
                  >
                    <SelectTrigger
                      className="h-9 w-[140px] border-zinc-700 bg-zinc-900 text-xs"
                      aria-label="Genre cerita"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-700 bg-zinc-900">
                      {GENRES.map((g) => (
                        <SelectItem key={g} value={g} className="text-xs">
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={project.style}
                    onValueChange={(v) => void patchProject({ style: v })}
                  >
                    <SelectTrigger
                      className="h-9 w-[160px] border-zinc-700 bg-zinc-900 text-xs"
                      aria-label="Gaya visual"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-700 bg-zinc-900">
                      {STYLES.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
                <TabsList className="mx-3 mt-3 w-fit shrink-0 justify-start bg-zinc-900 sm:mx-4">
                  <TabsTrigger value="cerita" className="text-xs sm:text-sm">
                    Cerita
                  </TabsTrigger>
                  <TabsTrigger value="karakter" className="text-xs sm:text-sm">
                    Karakter
                    {project.characters.length > 0 && (
                      <span className="ml-1.5 font-mono text-[10px] text-zinc-500">
                        {project.characters.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="adegan" className="text-xs sm:text-sm">
                    Adegan
                    {sceneCount > 0 && (
                      <span className="ml-1.5 font-mono text-[10px] text-zinc-500">
                        {sceneCount}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="ekspor" className="text-xs sm:text-sm">
                    Ekspor
                  </TabsTrigger>
                </TabsList>

                <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
                  <TabsContent value="cerita" className="mt-0">
                    <StoryTab
                      project={project}
                      busy={storyBusy}
                      onGenerateStory={generateStory}
                      onPatch={patchProject}
                    />
                  </TabsContent>
                  <TabsContent value="karakter" className="mt-0">
                    <CharactersTab
                      characters={project.characters}
                      busyMap={portraitBusy}
                      onAdd={addCharacter}
                      onPatch={patchCharacter}
                      onDelete={deleteCharacter}
                      onGeneratePortrait={generatePortrait}
                    />
                  </TabsContent>
                  <TabsContent value="adegan" className="mt-0">
                    <ScenesTab
                      scenes={project.scenes}
                      hasStory={project.story.trim().length > 0}
                      splitBusy={splitBusy}
                      imageBusy={imageBusy}
                      videoBusy={videoBusy}
                      onSplitScenes={splitScenes}
                      onAddScene={addScene}
                      onPatchScene={patchScene}
                      onDeleteScene={deleteScene}
                      onMoveScene={moveScene}
                      onGenerateImage={generateImage}
                      onGenerateVideo={generateVideo}
                    />
                  </TabsContent>
                  <TabsContent value="ekspor" className="mt-0">
                    <ExportTab
                      project={project}
                      stats={{
                        scenes: sceneCount,
                        images: imageCount,
                        videos: videoCount,
                        characters: project.characters.length,
                      }}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </>
          )}
        </main>
      </div>

      {/* Dialog proyek baru */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="border-zinc-700 bg-zinc-900 text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-[#C93A1B]" aria-hidden="true" />
              Proyek Baru
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Isi premis sekecil apa pun — AI yang menuliskan cerita lengkapnya nanti.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="np-title" className="text-xs text-zinc-400">
                Judul proyek
              </Label>
              <Input
                id="np-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="mis. Legenda Gunung Kelam"
                className="border-zinc-700 bg-zinc-950"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-zinc-400">Genre</Label>
                <Select
                  value={form.genre}
                  onValueChange={(v) => setForm((f) => ({ ...f, genre: v }))}
                >
                  <SelectTrigger className="border-zinc-700 bg-zinc-950" aria-label="Genre">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-700 bg-zinc-900">
                    {GENRES.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-zinc-400">Gaya visual</Label>
                <Select
                  value={form.style}
                  onValueChange={(v) => setForm((f) => ({ ...f, style: v }))}
                >
                  <SelectTrigger className="border-zinc-700 bg-zinc-950" aria-label="Gaya visual">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-700 bg-zinc-900">
                    {STYLES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="np-premise" className="text-xs text-zinc-400">
                Premis / ide cerita
              </Label>
              <Textarea
                id="np-premise"
                value={form.premise}
                onChange={(e) => setForm((f) => ({ ...f, premise: e.target.value }))}
                placeholder="mis. Seorang nelayan muda menemukan lampu tua di pantai yang bisa memanggil badai…"
                className="min-h-[90px] border-zinc-700 bg-zinc-950"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewOpen(false)}
              className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            >
              Batal
            </Button>
            <Button
              onClick={createProject}
              disabled={creating}
              className="bg-[#C93A1B] font-semibold text-white hover:bg-[#A92F14]"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
              Buat proyek
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus proyek */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-zinc-700 bg-zinc-900 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus proyek &quot;{deleteTarget?.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Seluruh cerita, karakter, adegan, gambar, dan video di proyek ini akan dihapus
              permanen. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteProject}
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
