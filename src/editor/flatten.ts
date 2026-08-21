import type { JSONContent } from '@tiptap/core'
import type { Block, BlockType, Span, TextAlign } from '@/types'

const MARK_KEYS: Record<string, keyof Span> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strike: 'strike',
}

function spansOf(node: JSONContent): Span[] {
  const out: Span[] = []

  const walk = (n: JSONContent) => {
    if (n.type === 'text') {
      const span: Span = { text: n.text ?? '' }
      for (const mark of n.marks ?? []) {
        const key = MARK_KEYS[mark.type as string]
        if (key) span[key] = true as never
      }
      out.push(span)
      return
    }
    // 강제 개행은 문자로 보존한다. 미리보기에서 white-space: pre-wrap으로 렌더되고
    // Range 측정도 그대로 통과하므로 별도 블록으로 쪼갤 필요가 없다.
    if (n.type === 'hardBreak') {
      out.push({ text: '\n' })
      return
    }
    for (const child of n.content ?? []) walk(child)
  }

  for (const child of node.content ?? []) walk(child)
  return mergeAdjacent(out)
}

/** 같은 마크 조합이 연달아 나오면 합친다 — 측정할 DOM 노드 수가 줄어든다 */
function mergeAdjacent(spans: Span[]): Span[] {
  const out: Span[] = []
  for (const s of spans) {
    if (!s.text) continue
    const prev = out[out.length - 1]
    if (
      prev &&
      !!prev.bold === !!s.bold &&
      !!prev.italic === !!s.italic &&
      !!prev.underline === !!s.underline &&
      !!prev.strike === !!s.strike
    ) {
      prev.text += s.text
    } else {
      out.push({ ...s })
    }
  }
  return out
}

const asAlign = (v: unknown): TextAlign | undefined =>
  v === 'left' || v === 'center' || v === 'right' || v === 'justify' ? v : undefined

/**
 * Tiptap 문서 JSON → 조판용 블록 배열.
 *
 * 여기가 에디터와 조판 엔진의 유일한 경계다. 미리보기·페이지네이션·
 * 맞춤법 검사는 전부 Block[]만 보고 동작하므로 ProseMirror에 묶이지 않는다.
 */
export function flattenDoc(doc: JSONContent | undefined): Block[] {
  const blocks: Block[] = []
  let counter = 0

  const push = (type: BlockType, spans: Span[], level?: number, align?: TextAlign) => {
    const text = spans.map((s) => s.text).join('')
    // 빈 문단도 유지한다 — 사용자가 의도적으로 넣은 여백일 수 있다.
    blocks.push({ id: `b${counter++}`, type, level, spans, text, align })
  }

  const walk = (node: JSONContent, insideQuote = false) => {
    switch (node.type) {
      case 'paragraph':
        push(
          insideQuote ? 'blockquote' : 'paragraph',
          spansOf(node),
          undefined,
          asAlign(node.attrs?.textAlign),
        )
        break

      case 'heading':
        push(
          'heading',
          spansOf(node),
          Number(node.attrs?.level ?? 2),
          asAlign(node.attrs?.textAlign),
        )
        break

      case 'blockquote':
        for (const child of node.content ?? []) walk(child, true)
        break

      case 'horizontalRule':
        push('divider', [])
        break

      case 'bulletList':
      case 'orderedList':
      case 'listItem':
        for (const child of node.content ?? []) walk(child, insideQuote)
        break

      default:
        if (node.content) {
          for (const child of node.content ?? []) walk(child, insideQuote)
        }
    }
  }

  for (const child of doc?.content ?? []) walk(child)
  return blocks
}
