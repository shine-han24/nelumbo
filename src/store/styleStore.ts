import { create } from 'zustand'
import type {
  BackgroundSetup,
  FooterSetup,
  Margin,
  PaperColors,
  PageSetup,
  StyleSnapshot,
  TypeStyle,
} from '@/types'
import { DEFAULT_SNAPSHOT, applyPaperDefaults } from '@/theme/typePresets'

interface StyleState extends StyleSnapshot {
  /** 마지막으로 적용한 프리셋 id (사용자가 값을 바꾸면 null) */
  presetId: string | null

  setType: (patch: Partial<TypeStyle>) => void
  setPage: (patch: Partial<PageSetup>) => void
  setMargin: (patch: Partial<Margin>) => void
  setColors: (patch: Partial<PaperColors>) => void
  setBackground: (patch: Partial<BackgroundSetup>) => void
  setFooter: (patch: Partial<FooterSetup>) => void
  /** 판형 변경 — 여백·본문 크기도 그 판형 기본값으로 재설정 */
  setPaper: (paperId: string) => void
  /** 판형만 바꾸고 나머지는 유지 */
  setPaperKeepStyle: (paperId: string) => void
  applySnapshot: (s: StyleSnapshot, presetId?: string | null) => void
  snapshot: () => StyleSnapshot
}

const snapshotOf = (s: StyleSnapshot): StyleSnapshot =>
  structuredClone({
    type: s.type,
    page: s.page,
    colors: s.colors,
    background: s.background,
    footer: s.footer,
  })

export const useStyleStore = create<StyleState>((set, get) => ({
  ...DEFAULT_SNAPSHOT(),
  presetId: 'modern-essay',

  setType: (patch) =>
    set((s) => ({ type: { ...s.type, ...patch }, presetId: null })),

  setPage: (patch) =>
    set((s) => ({ page: { ...s.page, ...patch }, presetId: null })),

  setMargin: (patch) =>
    set((s) => ({
      page: { ...s.page, margin: { ...s.page.margin, ...patch } },
      presetId: null,
    })),

  setColors: (patch) =>
    set((s) => ({ colors: { ...s.colors, ...patch }, presetId: null })),

  setBackground: (patch) =>
    set((s) => ({ background: { ...s.background, ...patch }, presetId: null })),

  setFooter: (patch) =>
    set((s) => ({ footer: { ...s.footer, ...patch }, presetId: null })),

  setPaper: (paperId) =>
    set((s) => ({ ...applyPaperDefaults(snapshotOf(s), paperId), presetId: null })),

  setPaperKeepStyle: (paperId) =>
    set((s) => ({ page: { ...s.page, paperId }, presetId: null })),

  applySnapshot: (s, presetId = null) => set({ ...snapshotOf(s), presetId }),

  snapshot: () => snapshotOf(get()),
}))
