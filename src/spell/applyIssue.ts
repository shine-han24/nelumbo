import { blockPositions, getEditor, toDocRange } from '@/editor/editorRef'
import type { FoundIssue } from './spellStore'

/** 지적 하나를 제안으로 바꾼다. 성공하면 true. */
export function applyIssue(issue: FoundIssue, suggestion: string): boolean {
  const editor = getEditor()
  if (!editor) return false

  const entries = blockPositions(editor.state.doc)
  const entry = entries[issue.blockIndex]
  if (!entry?.isText) return false

  const { from, to } = toDocRange(entry, issue.start, issue.end)
  if (from < 0 || to > editor.state.doc.content.size || from >= to) return false

  // 밑줄이 가리키는 글자가 정말 그 표현인지 확인한다.
  // 사용자가 그 사이 다른 곳을 고쳤다면 오프셋이 밀렸을 수 있다.
  if (editor.state.doc.textBetween(from, to, '\n', '\n') !== issue.original) return false

  editor.chain().focus().insertContentAt({ from, to }, suggestion).run()
  return true
}

/**
 * 여러 지적을 한 번에 적용한다.
 *
 * 뒤에서부터 적용하는 것이 핵심이다. 앞에서부터 바꾸면 길이가 달라진
 * 만큼 뒤쪽 오프셋이 전부 밀려 엉뚱한 자리를 고치게 된다.
 */
export function applyAll(issues: FoundIssue[]): number {
  const sorted = [...issues].sort(
    (a, b) => b.blockIndex - a.blockIndex || b.start - a.start,
  )

  let applied = 0
  for (const issue of sorted) {
    const suggestion = issue.suggestions[0]
    if (!suggestion) continue
    if (applyIssue(issue, suggestion)) applied++
  }
  return applied
}

/** 해당 지적 위치로 커서를 옮기고 선택한다 */
export function selectIssue(issue: FoundIssue): boolean {
  const editor = getEditor()
  if (!editor) return false

  const entries = blockPositions(editor.state.doc)
  const entry = entries[issue.blockIndex]
  if (!entry?.isText) return false

  const { from, to } = toDocRange(entry, issue.start, issue.end)
  if (to > editor.state.doc.content.size) return false

  editor.chain().focus().setTextSelection({ from, to }).scrollIntoView().run()
  return true
}
