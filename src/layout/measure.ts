import type { Block, StyleSnapshot } from '@/types'
import { applyCss, blockCss, bodyCss } from './typography'
import { spansToHtml } from './spansToHtml'

export interface LineBox {
  /** 블록 평문 기준 문자 오프셋 */
  start: number
  end: number
}

export interface BlockMetrics {
  blockId: string
  lines: LineBox[]
  /** 줄 하나의 높이(px). 세로쓰기에서는 줄의 두께(가로 방향). */
  lineHeight: number
  /** 앞 블록과의 간격(px). 단의 첫 블록이면 적용하지 않는다. */
  marginBefore: number
  marginAfter: number
  /** divider처럼 줄 개념이 없는 블록의 고정 크기 */
  fixedSize?: number
}

/* ── 측정 호스트 ────────────────────────────────────────────── */

let host: HTMLDivElement | null = null

function getHost(): HTMLDivElement {
  if (host?.isConnected) return host
  host = document.createElement('div')
  host.setAttribute('data-nelumbo-measure', '')
  Object.assign(host.style, {
    position: 'fixed',
    left: '-100000px',
    top: '0',
    visibility: 'hidden',
    pointerEvents: 'none',
    // size는 넣지 않는다 — 자동 높이 계산이 막힌다
    contain: 'layout style',
  } satisfies Partial<CSSStyleDeclaration>)
  document.body.appendChild(host)
  return host
}

/* ── 문자 ↔ 좌표 ────────────────────────────────────────────── */

interface Locator {
  nodes: { node: Text; start: number }[]
  total: number
}

function buildLocator(root: HTMLElement): Locator {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: { node: Text; start: number }[] = []
  let total = 0
  let n: Node | null
  while ((n = walker.nextNode())) {
    const t = n as Text
    if (t.length === 0) continue
    nodes.push({ node: t, start: total })
    total += t.length
  }
  return { nodes, total }
}

function nodeAt(loc: Locator, i: number) {
  let lo = 0
  let hi = loc.nodes.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (loc.nodes[mid].start <= i) lo = mid
    else hi = mid - 1
  }
  return loc.nodes[lo]
}

const range = document.createRange()

/**
 * 문자 i가 놓인 줄의 좌표를 돌려준다.
 *
 * 가로쓰기는 top이 아래로 커지고, 세로쓰기(vertical-rl)는 오른쪽에서
 * 왼쪽으로 흐르므로 -right를 쓴다. 어느 쪽이든 줄이 진행할수록
 * 값이 커지도록 정규화해야 이진 탐색이 성립한다.
 */
function coordOf(loc: Locator, i: number, vertical: boolean): number {
  const entry = nodeAt(loc, i)
  const offset = i - entry.start
  range.setStart(entry.node, offset)
  range.setEnd(entry.node, Math.min(entry.node.length, offset + 1))
  const rect = range.getBoundingClientRect()
  return vertical ? -rect.right : rect.top
}

/** 이진 탐색으로 줄 경계를 찾는다 — 문자 수가 아니라 줄 수에 비례한다 */
function findLines(loc: Locator, vertical: boolean): LineBox[] {
  if (loc.total === 0) return [{ start: 0, end: 0 }]

  const lines: LineBox[] = []
  let lineStart = 0
  const EPS = 0.5 // 서브픽셀 반올림 방어

  while (lineStart < loc.total) {
    const top = coordOf(loc, lineStart, vertical)

    // 마지막 문자까지 같은 줄이면 여기서 끝
    if (coordOf(loc, loc.total - 1, vertical) <= top + EPS) {
      lines.push({ start: lineStart, end: loc.total })
      break
    }

    let lo = lineStart + 1
    let hi = loc.total - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (coordOf(loc, mid, vertical) > top + EPS) hi = mid
      else lo = mid + 1
    }

    // 방어: 어떤 이유로든 전진하지 못하면 무한 루프가 된다
    const end = Math.max(lineStart + 1, lo)
    lines.push({ start: lineStart, end })
    lineStart = end
  }

  return lines
}

/* ── 캐시 ───────────────────────────────────────────────────── */

let cacheSig = ''
const cache = new Map<string, BlockMetrics>()

/**
 * 조판 설정이 바뀌면 전부 무효화되지만, 타이핑 중에는 바뀐 블록만
 * 다시 측정된다. 긴 문서에서 페이지네이션이 버티는 이유가 이 캐시다.
 */
function styleSignature(style: StyleSnapshot, extent: number): string {
  const t = style.type
  return [
    extent,
    t.fontId,
    t.fontSize,
    t.lineHeight,
    t.letterSpacing,
    t.paragraphSpacing,
    t.textIndent,
    t.align,
    t.writingMode,
    t.fontWeight,
  ].join('|')
}

export function clearMeasureCache() {
  cache.clear()
  cacheSig = ''
}

/* ── 공개 API ───────────────────────────────────────────────── */

export interface MeasureOptions {
  /** 가로쓰기: 단 폭(px). 세로쓰기: 단 높이(px). 줄이 흐르는 방향의 길이. */
  extent: number
}

/**
 * 블록들의 줄 박스를 측정한다.
 *
 * 반드시 웹폰트 로드가 끝난 뒤에 호출할 것 (ensureFontLoaded).
 * 폴백 폰트로 측정하면 모든 페이지 분할이 어긋난다.
 */
export function measureBlocks(
  blocks: Block[],
  style: StyleSnapshot,
  { extent }: MeasureOptions,
): BlockMetrics[] {
  const vertical = style.type.writingMode === 'vertical'
  const sig = styleSignature(style, extent)
  if (sig !== cacheSig) {
    cache.clear()
    cacheSig = sig
  }

  const el = getHost()
  applyCss(el, bodyCss(style))
  if (vertical) {
    el.style.height = `${extent}px`
    el.style.width = 'max-content'
  } else {
    el.style.width = `${extent}px`
    el.style.height = 'auto'
  }

  const out: BlockMetrics[] = []

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    // 드롭캡은 float이라 줄바꿈 자체를 바꾼다. 측정에도 같은 클래스를 붙이지 않으면
    // 첫 문단의 페이지 분할이 화면과 어긋난다.
    const dropCap = style.type.dropCap && i === 0 && block.type === 'paragraph'

    const html = spansToHtml(block.spans)
    const key = `${block.type}:${block.level ?? 0}:${block.align ?? '-'}:${dropCap ? 'dc' : '-'}:${html}`
    const hit = cache.get(key)
    if (hit) {
      out.push({ ...hit, blockId: block.id })
      continue
    }

    const metrics = measureOne(el, block, html, style, vertical, dropCap)
    cache.set(key, metrics)
    out.push({ ...metrics, blockId: block.id })
  }

  el.replaceChildren()
  return out
}

function measureOne(
  host: HTMLElement,
  block: Block,
  html: string,
  style: StyleSnapshot,
  vertical: boolean,
  dropCap: boolean,
): BlockMetrics {
  host.replaceChildren()

  const tag =
    block.type === 'heading' ? `h${block.level ?? 2}` : block.type === 'divider' ? 'div' : 'p'
  const el = document.createElement(tag)

  applyCss(
    el,
    blockCss(style, block.type, {
      level: block.level,
      align: block.align,
      isBlockStart: true,
      // 항상 간격을 켜서 측정하고, 적용 여부는 페이지네이션이 판단한다
      isFirstInColumn: false,
    }),
  )

  if (block.type === 'divider') {
    el.style.height = `${style.type.fontSize * 2.2}px`
    host.appendChild(el)
    const rect = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return {
      blockId: block.id,
      lines: [],
      lineHeight: 0,
      marginBefore: parseFloat(cs.marginBlockStart) || 0,
      marginAfter: parseFloat(cs.marginBlockEnd) || 0,
      fixedSize: vertical ? rect.width : rect.height,
    }
  }

  if (dropCap) el.className = 'np-dropcap'
  el.innerHTML = html
  host.appendChild(el)

  const loc = buildLocator(el)
  const lines = findLines(loc, vertical)

  const cs = getComputedStyle(el)
  let lineHeight = parseFloat(cs.lineHeight)
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
    const rect = el.getBoundingClientRect()
    lineHeight = (vertical ? rect.width : rect.height) / Math.max(1, lines.length)
  }

  return {
    blockId: block.id,
    lines,
    lineHeight,
    marginBefore: parseFloat(cs.marginBlockStart) || 0,
    marginAfter: parseFloat(cs.marginBlockEnd) || 0,
  }
}
