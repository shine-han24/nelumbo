/** WCAG 상대 휘도 기반 대비비. 사진 배경 위 조판에서 가독성 경고에 쓴다. */

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** 두 색의 대비비 (1 ~ 21). 실패하면 null. */
export function contrastRatio(a: string, b: string): number | null {
  const ra = hexToRgb(a)
  const rb = hexToRgb(b)
  if (!ra || !rb) return null
  const la = luminance(ra)
  const lb = luminance(rb)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

export interface ContrastVerdict {
  ratio: number
  level: 'good' | 'ok' | 'poor'
  message: string
}

/**
 * 본문 기준. WCAG AA 본문은 4.5:1이지만 조판물은 배경이 균일하고
 * 글자가 크므로 3:1 이상이면 실사용에 무리가 없다.
 */
export function judgeContrast(text: string, paper: string): ContrastVerdict | null {
  const ratio = contrastRatio(text, paper)
  if (ratio == null) return null
  if (ratio >= 4.5) return { ratio, level: 'good', message: '읽기 좋습니다' }
  if (ratio >= 3) return { ratio, level: 'ok', message: '큰 글씨에만 권장' }
  return { ratio, level: 'poor', message: '대비가 부족합니다' }
}
