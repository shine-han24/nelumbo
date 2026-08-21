import { create } from 'zustand'
import type { UiTheme } from '@/types'
import { DEFAULT_CLEAN, type CleanOptions } from '@/editor/cleanText'
import {
  DEFAULT_CUSTOM,
  applyCustomUi,
  clearCustomUi,
  type CustomUiTheme,
} from '@/theme/uiCustom'

export type PanelId = 'type' | 'page' | 'color' | 'footer' | 'spell' | 'theme'

const THEME_KEY = 'nelumbo:ui-theme'
const CUSTOM_KEY = 'nelumbo:ui-custom'
const THEMES: UiTheme[] = ['unha', 'unha-night', 'sky', 'ink', 'custom']

function readTheme(): UiTheme {
  const saved = localStorage.getItem(THEME_KEY) as UiTheme | null
  if (saved && THEMES.includes(saved)) return saved
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'unha-night' : 'unha'
}

function readCustom(): CustomUiTheme {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? 'null')
    return saved && typeof saved === 'object' ? { ...DEFAULT_CUSTOM, ...saved } : DEFAULT_CUSTOM
  } catch {
    return DEFAULT_CUSTOM
  }
}

interface UiState {
  theme: UiTheme
  panel: PanelId
  /** 미리보기 배율. 0이면 '맞춤' — 폭에 맞춰 자동 계산 */
  zoom: number
  zoomFit: boolean
  /** 좌측 에디터 폭 비율 (0.2 ~ 0.7) */
  splitRatio: number
  /** 붙여넣기 정리 설정 */
  cleanup: CleanOptions & { enabled: boolean }
  /** 직접 만든 화면 테마의 기준색 다섯 가지 */
  custom: CustomUiTheme

  setCustom: (patch: Partial<CustomUiTheme>) => void
  /** 패널 목록이 접혀 있는가 — 아이콘 레일만 남는다 */
  panelCollapsed: boolean

  setTheme: (t: UiTheme) => void
  /** 같은 탭을 다시 누르면 접고, 다른 탭이면 펴면서 이동한다 */
  setPanel: (p: PanelId) => void
  setPanelCollapsed: (v: boolean) => void
  setZoom: (z: number) => void
  setZoomFit: (fit: boolean) => void
  setSplitRatio: (r: number) => void
  setCleanup: (patch: Partial<CleanOptions & { enabled: boolean }>) => void
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: readTheme(),
  panel: 'type',
  zoom: 1,
  zoomFit: true,
  splitRatio: 0.36,
  cleanup: { enabled: true, ...DEFAULT_CLEAN },
  custom: readCustom(),

  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme)
    document.documentElement.dataset.uiTheme = theme
    // 직접 만든 테마는 :root 인라인 변수로 덮어쓴다. 다른 테마로 돌아갈 때는
    // 반드시 지워야 한다 — 안 그러면 인라인이 계속 이겨서 테마가 안 바뀐다.
    if (theme === 'custom') applyCustomUi(get().custom)
    else clearCustomUi()
    set({ theme })
  },

  setCustom: (patch) => {
    const custom = { ...get().custom, ...patch }
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom))
    if (get().theme === 'custom') applyCustomUi(custom)
    set({ custom })
  },
  panelCollapsed: false,

  setPanel: (panel) =>
    set((s) => ({
      panel,
      // 보고 있던 탭을 다시 누른 것이면 접는다 — 미리보기를 넓게 보고 싶을 때
      panelCollapsed: s.panel === panel ? !s.panelCollapsed : false,
    })),

  setPanelCollapsed: (panelCollapsed) => set({ panelCollapsed }),
  setZoom: (zoom) => set({ zoom: Math.min(3, Math.max(0.15, zoom)), zoomFit: false }),
  setZoomFit: (zoomFit) => set({ zoomFit }),
  setSplitRatio: (r) => set({ splitRatio: Math.min(0.7, Math.max(0.2, r)) }),
  setCleanup: (patch) => set((s) => ({ cleanup: { ...s.cleanup, ...patch } })),
}))

/** main.tsx에서 1회 호출 — SSR 없는 앱이라 이 방식이 가장 단순하다 */
export function initUiTheme() {
  const { theme, custom } = useUiStore.getState()
  document.documentElement.dataset.uiTheme = theme
  if (theme === 'custom') applyCustomUi(custom)
}
