import type { FontDef } from '@/types'

/**
 * TODO(Phase 3): 전부 self-host + unicode-range 서브셋으로 교체한다.
 *   한글 웹폰트는 4~6MB라 통짜 로딩은 첫 화면을 망가뜨리고,
 *   CDN 폰트는 html-to-image의 fontEmbedCSS가 CORS로 막힌다.
 *
 * 라이선스: 아래는 전부 OFL 또는 웹 임베딩이 명시적으로 허용된 것만 골랐다.
 *   비상업 한정 폰트(을유1945 등)는 배포 대상이라 제외.
 */
export const FONTS: FontDef[] = [
  {
    id: 'noto-serif',
    label: '본명조',
    stack: "'Noto Serif KR', serif",
    weights: [300, 400, 500, 600, 700],
    kind: 'serif',
  },
  {
    id: 'nanum-myeongjo',
    label: '나눔명조',
    stack: "'Nanum Myeongjo', serif",
    weights: [400, 700, 800],
    kind: 'serif',
  },
  {
    id: 'gowun-batang',
    label: '고운바탕',
    stack: "'Gowun Batang', serif",
    weights: [400, 700],
    kind: 'serif',
  },
  {
    id: 'noto-sans',
    label: '본고딕',
    stack: "'Noto Sans KR', sans-serif",
    weights: [300, 400, 500, 700],
    kind: 'sans',
  },
]

export const FONT_BY_ID = new Map(FONTS.map((f) => [f.id, f]))

export const getFont = (id: string): FontDef => FONT_BY_ID.get(id) ?? FONTS[0]

/**
 * 페이지네이션 전에 반드시 호출한다.
 * 웹폰트가 로드되기 전에 줄 박스를 측정하면 폴백 폰트 기준으로 계산되어
 * 페이지 분할이 전부 어긋난다. 새로고침 직후 재현되는 대표적 버그.
 */
export async function ensureFontLoaded(fontId: string, sizePx: number): Promise<void> {
  const font = getFont(fontId)
  const family = font.stack.split(',')[0].trim()

  try {
    await Promise.all(
      font.weights.map((w) =>
        document.fonts.load(`${w} ${sizePx}px ${family}`, '한글Ag가나다'),
      ),
    )
    await document.fonts.ready
  } catch {
    // 폰트 로드 실패는 치명적이지 않다 — 폴백으로 조판되지만 앱은 계속 돈다.
  }
}
