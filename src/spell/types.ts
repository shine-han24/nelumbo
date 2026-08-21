export type IssueType = 'spelling' | 'spacing' | 'grammar' | 'style'

export interface SpellIssue {
  /** 블록 평문 기준 문자 오프셋 */
  start: number
  end: number
  original: string
  suggestions: string[]
  type: IssueType
  message: string
}

export interface SpellProvider {
  id: string
  label: string
  /** 한 번에 보낼 수 있는 최대 글자 수 */
  maxChunkChars: number
  /** 네트워크를 쓰는가 — UI에서 상태 표시를 다르게 한다 */
  remote: boolean
  check(text: string, signal?: AbortSignal): Promise<SpellIssue[]>
  /** 사용 가능 여부. 계약 전인 상용 API는 false를 돌려준다. */
  available(): boolean
  /** 사용 불가일 때 화면에 띄울 사유 */
  unavailableReason?: string
}

export const ISSUE_LABEL: Record<IssueType, string> = {
  spelling: '맞춤법',
  spacing: '띄어쓰기',
  grammar: '문법',
  style: '표현',
}

/**
 * 긴 텍스트를 공급자의 한도에 맞춰 자른다.
 * 문장 한가운데에서 자르면 문맥이 끊겨 오탐이 늘어나므로
 * 반드시 문장 경계에서 자르고, 오프셋을 원문 기준으로 되돌린다.
 */
export function chunkBySentence(text: string, max: number): Array<{ text: string; offset: number }> {
  if (text.length <= max) return [{ text, offset: 0 }]

  const out: Array<{ text: string; offset: number }> = []
  let cursor = 0

  while (cursor < text.length) {
    let end = Math.min(text.length, cursor + max)
    if (end < text.length) {
      const slice = text.slice(cursor, end)
      const boundary = Math.max(
        slice.lastIndexOf('. '),
        slice.lastIndexOf('! '),
        slice.lastIndexOf('? '),
        slice.lastIndexOf('다. '),
        slice.lastIndexOf('\n'),
      )
      if (boundary > max * 0.4) end = cursor + boundary + 1
    }
    out.push({ text: text.slice(cursor, end), offset: cursor })
    cursor = end
  }

  return out
}
