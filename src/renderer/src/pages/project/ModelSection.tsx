import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Film, Image as ImageIcon, Move, Users } from 'lucide-react'
import {
  getMediaImageModel,
  getMediaVideoModel,
  mediaEffectiveResolution,
  mediaFitDuration,
  mediaMaxRefs,
  mediaModelCounts,
  mediaModelOptions,
  mediaResolutionOptions
} from '@shared/media'
import type { CreditEstimate, ModelOption, Project } from '@shared/types'
import { ModelLogo } from '../../components/ModelLogo'
import { ModelPicker } from '../../components/ModelPicker'
import { Segmented, Spinner } from '../../components/ui'
import { creditLabel } from '../../lib/format'
import { useEstimate, useEstimates } from '../../lib/useEstimate'

const IMAGE_OPTIONS = mediaModelOptions('image')
const VIDEO_OPTIONS = mediaModelOptions('video')
const COUNTS = mediaModelCounts()
// Credit estimates are a Higgsfield feature; Gemini rows carry no credit cell and never ask for one.
const HF_IMAGE_IDS = IMAGE_OPTIONS.filter((o) => o.provider !== 'gemini').map((o) => o.id)
const HF_VIDEO_IDS = VIDEO_OPTIONS.filter((o) => o.provider !== 'gemini').map((o) => o.id)

/** Adds each Higgsfield model's estimated credits to its picker row once a key is known to exist. */
function withCosts(options: ModelOption[], costs: Record<string, CreditEstimate | null>, unit: (id: string) => string, on: boolean): ModelOption[] {
  if (!on) return options
  return options.map((o) =>
    o.provider === 'gemini'
      ? o
      : {
          ...o,
          credits: o.id in costs ? (costs[o.id]?.credits ?? null) : undefined,
          usd: costs[o.id]?.usd ?? null,
          creditUnit: unit(o.id)
        }
  )
}

function Cost({
  value,
  hasKey,
  gemini,
  children
}: {
  value: CreditEstimate | null | undefined
  hasKey: boolean | null
  gemini: boolean
  children: (credits: number) => ReactNode
}) {
  if (gemini) return <span>Biaya Gemini dihitung Google per pemakaian, sesuai harga resminya — tanpa sistem kredit.</span>
  if (hasKey === false) return <span className="text-muted">Perkiraan kredit muncul setelah kunci Higgsfield diisi di Pengaturan.</span>
  if (value === undefined)
    return (
      <span className="flex items-center gap-1.5 text-muted">
        <Spinner className="size-3" />
        Menghitung kredit…
      </span>
    )
  if (value === null) return <span className="text-muted">Perkiraan kredit belum tersedia.</span>
  return <span>{children(value.credits)}</span>
}

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-line-2 bg-surface p-3">
      <span className="flex items-center gap-2 text-[13px] font-semibold text-ink-2">
        {icon}
        {title}
      </span>
      {children}
    </div>
  )
}

/** Which models, from Higgsfield or Gemini, draw and animate this project's clips. */
export function ModelSection({
  project,
  clipCount,
  perClip,
  onChange
}: {
  project: Project
  clipCount: number
  perClip: number
  onChange: (patch: { imageModel?: string; videoModel?: string; videoResolution?: string | null }) => void
}) {
  const image = getMediaImageModel(project.imageModel)
  const video = getMediaVideoModel(project.videoModel)
  const seconds = mediaFitDuration(video, perClip) ?? perClip
  const imageCost = useEstimate('image', image.id, project.aspectRatio)
  const resolutions = mediaResolutionOptions(video)
  const resolution = mediaEffectiveResolution(video, project.videoResolution)
  const videoCost = useEstimate('video', video.id, project.aspectRatio, perClip, resolution)
  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean | null>(null)

  useEffect(() => {
    void window.api.settings.keys().then((keys) => {
      setHasKey(!!keys.find((k) => k.provider === 'higgsfield')?.configured)
      setHasGeminiKey(!!keys.find((k) => k.provider === 'gemini')?.configured)
    })
  }, [])

  const imageCosts = useEstimates('image', HF_IMAGE_IDS, project.aspectRatio, undefined, hasKey === true)
  const videoCosts = useEstimates('video', HF_VIDEO_IDS, project.aspectRatio, perClip, hasKey === true)
  const imageModels = useMemo(() => withCosts(IMAGE_OPTIONS, imageCosts, () => '', hasKey === true), [imageCosts, hasKey])
  const videoModels = useMemo(
    () => withCosts(VIDEO_OPTIONS, videoCosts, (id) => `${mediaFitDuration(getMediaVideoModel(id), perClip)} dtk`, hasKey === true),
    [videoCosts, perClip, hasKey]
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold">Model AI</span>
        <span className="text-[13px] text-muted">
          {COUNTS.image} model gambar dan {COUNTS.video} model video dari {COUNTS.providers}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Card icon={<ImageIcon className="size-4" />} title="Gambar klip">
          <ModelPicker
            value={image.id}
            models={imageModels}
            footerNote={hasKey ? 'kredit per gambar, perkiraan Higgsfield untuk akunmu' : undefined}
            renderIcon={(m) => <ModelLogo family={m.family} />}
            detail="description"
            tagFilters={['Rekomendasi', 'Referensi', 'GPT Image', 'Soul', 'Recraft', 'Gemini', '4K']}
            menuClassName="w-[430px]"
            onChange={(id) => onChange({ imageModel: id })}
          />
          <p className="text-[12.5px] leading-snug text-ink-2">
            <Cost value={imageCost} hasKey={hasKey} gemini={image.provider === 'gemini'}>
              {(c) => (
                <>
                  ≈ {creditLabel(c)} kredit per gambar · {clipCount} gambar ≈ <b className="font-semibold text-ink">{creditLabel(c * clipCount)} kredit</b>
                </>
              )}
            </Cost>
          </p>
          <p className="flex items-start gap-1.5 text-[12.5px] leading-snug text-muted">
            <Users className="mt-px size-3.5 shrink-0" />
            {mediaMaxRefs(image)
              ? 'Pakai lembar karakter, jadi wajah dan kostum tokoh tetap sama di tiap klip.'
              : 'Tanpa lembar karakter, jadi tampilan tokoh bisa sedikit berubah antar klip.'}
          </p>
          {image.provider === 'gemini' && hasGeminiKey === false && (
            <p className="text-[12.5px] leading-snug text-accent-dark">
              Butuh kunci Google AI Studio. <b className="font-semibold">Atur di Pengaturan.</b>
            </p>
          )}
        </Card>
        <Card icon={<Film className="size-4" />} title="Video AI">
          <ModelPicker
            value={video.id}
            models={videoModels}
            footerNote={hasKey ? `kredit per video untuk klip ±${perClip} detik` : undefined}
            renderIcon={(m) => <ModelLogo family={m.family} />}
            detail="description"
            tagFilters={['Rekomendasi', 'Kling', 'Seedance', 'Wan', 'Referensi', 'Gemini', 'Veo', '4K']}
            align="right"
            menuClassName="w-[430px]"
            onChange={(id) => onChange({ videoModel: id })}
          />
          {resolutions.length > 1 ? (
            <div className="flex items-center gap-2.5">
              <span className="shrink-0 text-[12.5px] font-medium text-ink-2">Resolusi</span>
              <Segmented
                size="sm"
                value={resolution ?? resolutions[0]}
                onChange={(v) => onChange({ videoResolution: v })}
                options={resolutions.map((r) => ({ id: r, label: r.toUpperCase() === '4K' || r.toUpperCase() === '2K' ? r.toUpperCase() : r }))}
                className="min-w-0 flex-1"
              />
            </div>
          ) : (
            resolution && <p className="text-[12.5px] text-ink-2">Resolusi {resolution} (satu-satunya pilihan model ini)</p>
          )}
          <p className="text-[12.5px] leading-snug text-ink-2">
            <Cost value={videoCost} hasKey={hasKey} gemini={video.provider === 'gemini'}>
              {(c) => (
                <>
                  ≈ {creditLabel(c)} kredit per video {seconds} detik{resolution ? `, ${resolution}` : ''}
                </>
              )}
            </Cost>
          </p>
          <p className="flex items-start gap-1.5 text-[12.5px] leading-snug text-muted">
            <Move className="mt-px size-3.5 shrink-0" />
            Hanya untuk klip yang kamu jadikan Video AI. Gerak kamera tetap gratis.
          </p>
          {video.provider === 'gemini' && hasGeminiKey === false && (
            <p className="text-[12.5px] leading-snug text-accent-dark">
              Butuh kunci Google AI Studio. <b className="font-semibold">Atur di Pengaturan.</b>
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
