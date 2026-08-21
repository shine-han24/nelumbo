/**
 * 사용자가 직접 만드는 앱 화면 테마.
 *
 * 색을 열 개 넘게 고르게 하면 대부분 조화가 깨진 화면이 나온다.
 * 그래서 입력은 다섯 가지만 받고, 나머지(경계 강조·액센트 배경·글씨 흐림
 * ·작업대 색)는 여기서 계산한다.
 */

export interface CustomUiTheme {
  bg: string
  surface: string
  text: string
  accent: string
  border: string
}

export const DEFAULT_CUSTOM: CustomUiTheme = {
  bg: '#eef4f9',
  surface: '#ffffff',
  text: '#0b0f14',
  accent: '#1668d8',
  border: '#cfdeea',
}

type Rgb = [number, number, number]

function toRgb(hex: string): Rgb {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return [0, 0, 0]
  let h = m[1]
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

const toHex = ([r, g, b]: Rgb) =>
  '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')

const mix = (a: string, b: string, t: number): string => {
  const [r1, g1, b1] = toRgb(a)
  const [r2, g2, b2] = toRgb(b)
  return toHex([r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t])
}

function luminance(hex: string): number {
  const f = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = toRgb(hex)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** 배경 위에서 읽히는 글자색을 흰색/검정 중에 고른다 */
const readableOn = (bg: string) => (luminance(bg) > 0.45 ? '#000000' : '#ffffff')

/** 다섯 색에서 전체 토큰 세트를 만든다 */
export function deriveUiVars(c: CustomUiTheme): Record<string, string> {
  const dark = luminance(c.bg) < 0.4
  // 어두운 테마에서는 "더 밝게", 밝은 테마에서는 "더 어둡게"가 강조다
  const deepen = (color: string, t: number) => mix(color, dark ? '#ffffff' : '#000000', t)

  return {
    '--ui-bg': c.bg,
    '--ui-surface': c.surface,
    '--ui-surface-2': mix(c.surface, c.border, 0.55),
    '--ui-border': c.border,
    '--ui-border-strong': deepen(c.border, 0.28),
    '--ui-text': c.text,
    '--ui-text-dim': mix(c.text, c.bg, 0.45),
    '--ui-accent': c.accent,
    '--ui-accent-text': readableOn(c.accent),
    '--ui-accent-soft': mix(c.accent, c.surface, dark ? 0.82 : 0.86),
    '--ui-danger': dark ? '#e08a7c' : '#b3261e',
    '--ui-canvas': deepen(c.bg, 0.12),
  }
}

/** :root에 인라인으로 박는다 — [data-ui-theme] 규칙보다 우선한다 */
export function applyCustomUi(c: CustomUiTheme) {
  const root = document.documentElement
  for (const [k, v] of Object.entries(deriveUiVars(c))) root.style.setProperty(k, v)
}

export function clearCustomUi() {
  const root = document.documentElement
  for (const k of Object.keys(deriveUiVars(DEFAULT_CUSTOM))) root.style.removeProperty(k)
}
