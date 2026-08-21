import type { Span } from '@/types'

const ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
}

const escapeHtml = (s: string) => s.replace(/[&<>]/g, (c) => ESCAPE[c])

/**
 * 스팬 배열을 HTML 문자열로 만든다.
 *
 * 측정 컨테이너와 실제 미리보기가 **같은 함수**를 쓰는 것이 핵심이다.
 * 마크업이 조금이라도 다르면 줄바꿈 위치가 달라지고, 페이지 분할이
 * 화면과 어긋난다. 그래서 React 쪽도 이 문자열을 그대로 주입한다.
 *
 * start/end는 스팬을 이어붙인 평문 기준의 문자 오프셋이다.
 */
export function spansToHtml(spans: Span[], start = 0, end = Infinity): string {
  let cursor = 0
  let html = ''

  for (const span of spans) {
    const spanStart = cursor
    const spanEnd = cursor + span.text.length
    cursor = spanEnd

    if (spanEnd <= start) continue
    if (spanStart >= end) break

    const from = Math.max(0, start - spanStart)
    const to = Math.min(span.text.length, end - spanStart)
    const text = span.text.slice(from, to)
    if (!text) continue

    let inner = escapeHtml(text)
    if (span.strike) inner = `<s>${inner}</s>`
    if (span.underline) inner = `<u>${inner}</u>`
    if (span.italic) inner = `<em>${inner}</em>`
    if (span.bold) inner = `<strong>${inner}</strong>`
    html += inner
  }

  // 완전히 빈 줄은 높이가 0이 되어 측정과 렌더가 모두 무너진다.
  return html || '<br>'
}
