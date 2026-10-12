import type { ModelOption } from './types'
import {
  describeModel,
  effectiveResolution,
  fitDuration,
  getImageModel,
  getVideoModel,
  hfModelOptions,
  maxRefs,
  promptLimit,
  resolutionOptions,
  durationLabel,
  type HfModel
} from './higgsfield'

/**
 * One registry for every model that draws clip images or animates them, from any provider. Higgsfield
 * keeps its bare endpoint ids (older projects stay valid), Gemini models are namespaced with a `gemini:`
 * prefix so the id stored on a project says which service to call.
 */

export type MediaProvider = 'higgsfield' | 'gemini'

export function mediaProviderOf(modelId: string | null | undefined): MediaProvider {
  return modelId?.startsWith('gemini:') ? 'gemini' : 'higgsfield'
}

export function mediaProviderName(provider: MediaProvider): string {
  return provider === 'gemini' ? 'Gemini' : 'Higgsfield'
}

// ---------- Gemini catalog ----------
// Static, like the Higgsfield catalog: model availability is checked per key at request time, and the
// friendly errors in services/gemini.ts explain when a key or region cannot use one of these.

export interface GeminiImageModel {
  provider: 'gemini'
  kind: 'image'
  /** Namespaced id stored on the project, e.g. "gemini:gemini-2.5-flash-image". */
  id: string
  /** Model name sent to the Gemini API. */
  api: string
  name: string
  family: string
  promptLimit: number
  /** How many character sheets can be sent as reference images. */
  refs: number
  /** Output sizes for imageConfig.imageSize; null when the model has one fixed size. */
  sizes: string[] | null
  tags: string[]
}

export interface GeminiVideoModel {
  provider: 'gemini'
  kind: 'video'
  id: string
  api: string
  name: string
  family: string
  promptLimit: number
  /** Allowed clip lengths in seconds. */
  durations: number[]
  resolutions: string[]
  /** Whether the API accepts generateAudio (Veo 3.1); its soundtrack is dropped by the editor anyway. */
  audioSwitch: boolean
  tags: string[]
}

export type GeminiModel = GeminiImageModel | GeminiVideoModel

const GEMINI_IMAGE_MODELS: GeminiImageModel[] = [
  {
    provider: 'gemini',
    kind: 'image',
    id: 'gemini:gemini-3-pro-image-preview',
    api: 'gemini-3-pro-image-preview',
    name: 'Nano Banana Pro',
    family: 'Gemini',
    promptLimit: 4800,
    refs: 6,
    sizes: ['1K', '2K', '4K'],
    tags: ['Referensi', '4K']
  },
  {
    provider: 'gemini',
    kind: 'image',
    id: 'gemini:gemini-2.5-flash-image',
    api: 'gemini-2.5-flash-image',
    name: 'Nano Banana',
    family: 'Gemini',
    promptLimit: 4000,
    refs: 3,
    sizes: null,
    tags: ['Referensi', 'Cepat']
  }
]

const GEMINI_VIDEO_MODELS: GeminiVideoModel[] = [
  {
    provider: 'gemini',
    kind: 'video',
    id: 'gemini:veo-3.1-generate-preview',
    api: 'veo-3.1-generate-preview',
    name: 'Veo 3.1',
    family: 'Veo',
    promptLimit: 1500,
    durations: [4, 6, 8],
    resolutions: ['720p', '1080p'],
    audioSwitch: true,
    tags: ['Gemini', 'Referensi']
  },
  {
    provider: 'gemini',
    kind: 'video',
    id: 'gemini:veo-3.1-fast-generate-preview',
    api: 'veo-3.1-fast-generate-preview',
    name: 'Veo 3.1 Fast',
    family: 'Veo',
    promptLimit: 1500,
    durations: [4, 6, 8],
    resolutions: ['720p', '1080p'],
    audioSwitch: true,
    tags: ['Gemini', 'Cepat']
  },
  {
    provider: 'gemini',
    kind: 'video',
    id: 'gemini:veo-3.0-generate-001',
    api: 'veo-3.0-generate-001',
    name: 'Veo 3',
    family: 'Veo',
    promptLimit: 1500,
    durations: [4, 6, 8],
    resolutions: ['720p', '1080p'],
    audioSwitch: false,
    tags: ['Gemini']
  }
]

export const GEMINI_MEDIA_MODELS: GeminiModel[] = [...GEMINI_IMAGE_MODELS, ...GEMINI_VIDEO_MODELS]

// ---------- one interface over both providers ----------

export type MediaModel = HfModel | GeminiModel

/** MediaModel is a discriminated union on `provider`, so narrowing is a plain comparison. */
export function isGeminiImageModel(m: MediaModel): m is GeminiImageModel {
  return m.provider === 'gemini' && m.kind === 'image'
}

export function isGeminiVideoModel(m: MediaModel): m is GeminiVideoModel {
  return m.provider === 'gemini' && m.kind === 'video'
}

export function getMediaImageModel(id: string | null | undefined): MediaModel {
  if (id && mediaProviderOf(id) === 'gemini') return GEMINI_IMAGE_MODELS.find((m) => m.id === id) ?? GEMINI_IMAGE_MODELS[0]
  return getImageModel(id)
}

export function getMediaVideoModel(id: string | null | undefined): MediaModel {
  if (id && mediaProviderOf(id) === 'gemini') return GEMINI_VIDEO_MODELS.find((m) => m.id === id) ?? GEMINI_VIDEO_MODELS[0]
  return getVideoModel(id)
}

export function mediaMaxRefs(m: MediaModel): number {
  return m.provider === 'gemini' ? (m.kind === 'image' ? m.refs : 0) : maxRefs(m)
}

export function mediaPromptLimit(m: MediaModel): number {
  return m.provider === 'gemini' ? m.promptLimit : promptLimit(m)
}

function fitToValues(values: number[], seconds: number): number {
  const want = Math.max(1, Math.ceil(seconds))
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.find((v) => v >= want) ?? sorted[sorted.length - 1]
}

/** The video length to request for a clip: the shortest allowed length that covers it, or the longest. */
export function mediaFitDuration(m: MediaModel, seconds: number): number | null {
  if (m.provider === 'gemini') return m.kind === 'video' ? fitToValues(m.durations, seconds) : null
  return fitDuration(m, seconds)
}

export function mediaDurationLabel(m: MediaModel): string | null {
  if (m.provider === 'gemini') return m.kind === 'video' ? `${[...m.durations].sort((a, b) => a - b).join(' / ')} dtk` : null
  return durationLabel(m)
}

function rankResolution(v: string): number {
  const k = /^(\d+(?:\.\d+)?)k$/i.exec(v)
  return k ? Number(k[1]) * 1000 : parseInt(v, 10) || 0
}

/** Resolutions a model offers, lowest first. */
export function mediaResolutionOptions(m: MediaModel): string[] {
  if (m.provider === 'gemini') return m.kind === 'video' ? [...m.resolutions].sort((a, b) => rankResolution(a) - rankResolution(b)) : (m.sizes ?? [])
  return resolutionOptions(m)
}

/** The resolution a request will actually use with this model, or null when the model has no choice. */
export function mediaEffectiveResolution(m: MediaModel, want?: string | null): string | null {
  if (m.provider === 'gemini') {
    const options = mediaResolutionOptions(m)
    if (!options.length) return null
    return options.find((r) => r === want) ?? (m.kind === 'image' ? options.find((r) => r === '2K') : null) ?? options.find((r) => r === '1080p') ?? options[options.length - 1]
  }
  return effectiveResolution(m, want)
}

/** What the app will actually request from this model, in words (same phrasing as the Higgsfield list). */
export function describeMediaModel(m: MediaModel): string {
  if (m.provider === 'gemini') {
    if (m.kind === 'image') {
      const res = m.sizes ? `hasil ${m.sizes.join('/')}` : null
      return [m.refs ? `pakai lembar karakter (maks ${m.refs})` : 'tanpa lembar karakter', res].filter(Boolean).join(' · ')
    }
    const res = `${m.resolutions.map((r) => r.replace('p', '')).join('/')}p`
    return [mediaDurationLabel(m), 'mulai dari gambar klip', res].filter(Boolean).join(' · ')
  }
  return describeModel(m)
}

/** Picker rows for every provider: the Higgsfield recommended default first, then the rest, then Gemini. */
export function mediaModelOptions(kind: 'image' | 'video'): ModelOption[] {
  const hf = hfModelOptions(kind)
  const gemini = (kind === 'image' ? GEMINI_IMAGE_MODELS : GEMINI_VIDEO_MODELS).map((m) => ({
    id: m.id,
    name: m.name,
    family: m.family,
    description: describeMediaModel(m),
    provider: 'gemini' as const,
    tags: [...m.tags, 'Gemini']
  }))
  return [...hf, ...gemini]
}

/** Counts and provider names for the picker summary line, e.g. "48 model gambar dan 37 model video". */
export function mediaModelCounts(): { image: number; video: number; providers: string } {
  return {
    image: GEMINI_IMAGE_MODELS.length + hfModelOptions('image').length,
    video: GEMINI_VIDEO_MODELS.length + hfModelOptions('video').length,
    providers: 'Higgsfield & Gemini'
  }
}
