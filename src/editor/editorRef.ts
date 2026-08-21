import type { Editor } from '@tiptap/react'
import type { Node as PMNode } from '@tiptap/pm/model'

/**
 * 패널에서 에디터를 조작해야 할 때 쓰는 단일 참조.
 * 맞춤법 제안 적용처럼 "오른쪽 패널 → 왼쪽 에디터" 방향의 동작 때문에
 * 필요하다. Context를 두는 것보다 이 앱 규모에선 이쪽이 단순하다.
 */
let editor: Editor | null = null

export const setEditor = (e: Editor | null) => {
  editor = e
}
export const getEditor = () => editor

export interface BlockPosition {
  pos: number
  isText: boolean
}

/**
 * flattenDoc가 만든 블록 배열과 **같은 순서**로 ProseMirror 위치를 모은다.
 *
 * 두 목록의 인덱스가 어긋나면 맞춤법 밑줄이 엉뚱한 문단에 그어진다.
 * flatten이 문단/제목/인용문단/목록항목 문단을 텍스트블록으로,
 * 구분선을 divider로 내보내므로 여기서도 정확히 그렇게 센다.
 */
export function blockPositions(doc: PMNode): BlockPosition[] {
  const out: BlockPosition[] = []
  doc.descendants((node, pos) => {
    if (node.type.name === 'horizontalRule') {
      out.push({ pos, isText: false })
      return false
    }
    if (node.isTextblock) {
      out.push({ pos, isText: true })
      return false
    }
    return true
  })
  return out
}

/**
 * 블록 안의 문자 오프셋 → ProseMirror 문서 위치.
 *
 * flatten이 hardBreak를 '\n' 한 글자로 바꾸고 ProseMirror도 그 노드를
 * 크기 1로 세기 때문에 두 좌표계가 1:1로 대응한다.
 */
export function toDocRange(entry: BlockPosition, start: number, end: number) {
  return { from: entry.pos + 1 + start, to: entry.pos + 1 + end }
}
