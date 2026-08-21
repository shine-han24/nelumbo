import type { Margin, PaperSize, StyleSnapshot } from '@/types'

/** mm → 논리 px (96dpi 기준) */
export const mm = (v: number) => Math.round((v * 96) / 25.4)

const m = (top: number, right: number, bottom: number, left: number): Margin => ({
  top,
  right,
  bottom,
  left,
})

/**
 * 책 판형은 mm를 96dpi로 환산한 "논리 크기"로 다룬다.
 * 최종 해상도는 exportScale이 결정한다 — 신국판 2x = 1149×1701px.
 *
 * SNS 프리셋도 같은 논리 스케일에 맞춰 절반 크기로 정의했다.
 * 그래야 판형을 바꿔도 본문 크기가 갑자기 달라지지 않는다.
 */
export const PAPER_SIZES: PaperSize[] = [
  {
    id: 'sinkuk',
    label: '신국판',
    category: 'book',
    width: mm(152),
    height: mm(225),
    exportScale: 2,
    defaultMargin: m(mm(22), mm(18), mm(20), mm(18)),
    defaultFontSize: 15,
  },
  {
    id: 'a5',
    label: 'A5',
    category: 'paper',
    width: mm(148),
    height: mm(210),
    exportScale: 2,
    defaultMargin: m(mm(20), mm(18), mm(18), mm(18)),
    defaultFontSize: 15,
  },
  {
    id: 'b5',
    label: 'B5',
    category: 'paper',
    width: mm(182),
    height: mm(257),
    exportScale: 2,
    defaultMargin: m(mm(25), mm(22), mm(22), mm(22)),
    defaultFontSize: 16,
  },
  {
    id: 'a4',
    label: 'A4',
    category: 'paper',
    width: mm(210),
    height: mm(297),
    exportScale: 2,
    defaultMargin: m(mm(28), mm(25), mm(25), mm(25)),
    defaultFontSize: 16,
  },
  {
    id: 'sayuk',
    label: '4·6판',
    category: 'book',
    width: mm(127),
    height: mm(188),
    exportScale: 2,
    defaultMargin: m(mm(18), mm(15), mm(16), mm(15)),
    defaultFontSize: 14,
  },
  {
    id: 'mungo',
    label: '문고판',
    category: 'book',
    width: mm(105),
    height: mm(148),
    exportScale: 3,
    defaultMargin: m(mm(14), mm(12), mm(13), mm(12)),
    defaultFontSize: 12,
  },
  // ── SNS 카드 ──────────────────────────────────────────────
  {
    id: 'insta-square',
    label: '인스타 정사각 1:1',
    category: 'social',
    width: 540,
    height: 540,
    exportScale: 2,
    defaultMargin: m(64, 64, 64, 64),
    defaultFontSize: 17,
  },
  {
    id: 'insta-portrait',
    label: '인스타 세로 4:5',
    category: 'social',
    width: 540,
    height: 675,
    exportScale: 2,
    defaultMargin: m(72, 64, 72, 64),
    defaultFontSize: 17,
  },
  {
    id: 'story',
    label: '스토리 9:16',
    category: 'social',
    width: 540,
    height: 960,
    exportScale: 2,
    defaultMargin: m(110, 64, 110, 64),
    defaultFontSize: 18,
  },
  {
    id: 'wide',
    label: '가로 16:9',
    category: 'social',
    width: 640,
    height: 360,
    exportScale: 2,
    defaultMargin: m(48, 60, 48, 60),
    defaultFontSize: 16,
  },
]

export const PAPER_BY_ID = new Map(PAPER_SIZES.map((p) => [p.id, p]))

export const getPaper = (id: string): PaperSize =>
  PAPER_BY_ID.get(id) ?? PAPER_SIZES[0]

export const PAPER_GROUPS: { label: string; category: PaperSize['category'] }[] = [
  { label: '책 판형', category: 'book' },
  { label: '규격지', category: 'paper' },
  { label: 'SNS 카드', category: 'social' },
]

/** 본문이 실제로 놓이는 영역 (여백 제외) */
export function contentBox(paper: PaperSize, margin: Margin) {
  return {
    width: paper.width - margin.left - margin.right,
    height: paper.height - margin.top - margin.bottom,
  }
}

/** 하단 표기가 차지하는 높이 */
export function footerHeight(style: StyleSnapshot): number {
  const f = style.footer
  const shown = f.showTitle || f.showPageNumber || f.showSource || f.showRule
  return shown ? f.fontSize * 2.4 : 0
}

/**
 * 본문이 실제로 놓이는 상자 — 여백과 하단 표기를 모두 뺀 값.
 *
 * 미리보기 렌더와 페이지네이션이 **반드시 같은 함수**를 써야 한다.
 * 한쪽만 푸터 높이를 빼면 페이지마다 마지막 줄이 조용히 잘려 나간다.
 */
export function bodyBox(style: StyleSnapshot) {
  const paper = getPaper(style.page.paperId)
  const box = contentBox(paper, style.page.margin)
  return {
    width: Math.max(40, box.width),
    height: Math.max(40, box.height - footerHeight(style)),
  }
}

/** 단 하나의 폭 */
export function columnWidth(
  paper: PaperSize,
  margin: Margin,
  columns: number,
  columnGap: number,
) {
  const { width } = contentBox(paper, margin)
  const gaps = columnGap * Math.max(0, columns - 1)
  return (width - gaps) / Math.max(1, columns)
}
