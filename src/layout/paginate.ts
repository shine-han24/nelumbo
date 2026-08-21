import type { Block, BlockSlice, Column, RenderedPage, StyleSnapshot } from '@/types'
import type { BlockMetrics } from './measure'
import { bodyBox } from './paperSizes'

export interface Extents {
  /** 한 줄이 흐르는 방향의 길이 — 측정에 쓴다 */
  lineExtent: number
  /** 줄이 쌓이는 방향의 길이 — 페이지 채우기에 쓴다 */
  fillExtent: number
}

/**
 * 가로쓰기: 줄은 단 폭만큼 흐르고, 단 높이만큼 쌓인다.
 * 세로쓰기(vertical-rl): 줄은 단 높이만큼 흐르고, 단 폭만큼 쌓인다.
 * 두 축을 바꾸는 것만으로 같은 엔진이 양쪽을 처리한다.
 */
export function computeExtents(style: StyleSnapshot): Extents {
  const box = bodyBox(style)
  const { columns, columnGap } = style.page
  const vertical = style.type.writingMode === 'vertical'
  const gaps = columnGap * Math.max(0, columns - 1)
  const n = Math.max(1, columns)

  if (vertical) {
    return {
      lineExtent: Math.max(40, (box.height - gaps) / n),
      fillExtent: Math.max(40, box.width),
    }
  }

  return {
    lineExtent: Math.max(40, (box.width - gaps) / n),
    fillExtent: Math.max(40, box.height),
  }
}

const EPS = 0.5

/**
 * 줄 박스를 페이지·단에 채워 넣는다.
 *
 * 고아 줄(문단 첫 줄만 단 끝에 남음)과 과부 줄(마지막 한 줄만 다음 단으로
 * 넘어감)은 조판에서 가장 눈에 띄는 결함이라 여기서 밀어내 처리한다.
 */
export function paginate(
  blocks: Block[],
  metrics: BlockMetrics[],
  style: StyleSnapshot,
  extents: Extents,
): RenderedPage[] {
  const columnsPerPage = Math.max(1, style.page.columns)
  const { fillExtent } = extents

  const pages: RenderedPage[] = []
  let page: Column[] = []
  let col: BlockSlice[] = []
  let cursor = 0

  const firstInCol = () => col.length === 0

  const flushColumn = () => {
    page.push({ slices: col })
    col = []
    cursor = 0
    if (page.length >= columnsPerPage) {
      pages.push({ index: pages.length, columns: page })
      page = []
    }
  }

  const byId = new Map(metrics.map((m) => [m.blockId, m]))

  for (const block of blocks) {
    const m = byId.get(block.id)
    if (!m) continue

    /* ── 구분선 등 줄이 없는 블록 ─────────────────────────── */
    if (m.fixedSize != null) {
      const before = firstInCol() ? 0 : m.marginBefore
      if (!firstInCol() && cursor + before + m.fixedSize > fillExtent + EPS) {
        flushColumn()
      }
      col.push({
        blockId: block.id,
        type: block.type,
        level: block.level,
        align: block.align,
        spans: [],
        start: 0,
        end: 0,
        isBlockStart: true,
        isBlockEnd: true,
        isFirstInColumn: firstInCol(),
      })
      cursor += (col.length === 1 ? 0 : m.marginBefore) + m.fixedSize + m.marginAfter
      continue
    }

    /* ── 일반 블록 ───────────────────────────────────────── */
    let li = 0
    let blockStart = true

    while (li < m.lines.length) {
      const atTop = firstInCol()
      const before = atTop ? 0 : m.marginBefore
      const avail = fillExtent - cursor - before
      const remaining = m.lines.length - li

      let canFit = Math.floor((avail + EPS) / m.lineHeight)

      if (canFit <= 0) {
        // 단이 비어 있는데도 한 줄이 안 들어가면 지면이 본문보다 작다는 뜻이다.
        // 무한 루프를 막기 위해 억지로 한 줄을 넣는다 (넘치더라도 보이게).
        if (atTop) canFit = 1
        else {
          flushColumn()
          continue
        }
      }

      let take = Math.min(canFit, remaining)

      // 고아 줄: 새 문단이 단 끝에 첫 줄만 걸치면 통째로 다음 단으로
      if (blockStart && !atTop && remaining >= 2 && take < 2) {
        flushColumn()
        continue
      }

      // 과부 줄: 다음 단에 딱 한 줄만 남기지 않는다
      if (remaining - take === 1 && take >= 2) take -= 1

      const startChar = m.lines[li].start
      const endChar = m.lines[li + take - 1].end

      col.push({
        blockId: block.id,
        type: block.type,
        level: block.level,
        align: block.align,
        spans: block.spans,
        start: startChar,
        end: endChar,
        isBlockStart: blockStart,
        isBlockEnd: li + take >= m.lines.length,
        isFirstInColumn: atTop,
      })

      cursor += before + take * m.lineHeight
      li += take
      blockStart = false

      if (li < m.lines.length) flushColumn()
    }

    cursor += m.marginAfter
  }

  // 남은 것 정리
  if (col.length > 0) page.push({ slices: col })
  while (page.length > 0 && page.length < columnsPerPage) page.push({ slices: [] })
  if (page.length > 0) pages.push({ index: pages.length, columns: page })

  if (pages.length === 0) {
    pages.push({
      index: 0,
      columns: Array.from({ length: columnsPerPage }, () => ({ slices: [] })),
    })
  }

  return pages
}
