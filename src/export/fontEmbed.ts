/**
 * 내보내기용 폰트 임베딩 CSS를 직접 만든다.
 *
 * html-to-image의 getFontEmbedCSS는 스타일시트에 있는 @font-face를
 * 전부 인라인한다. 한글 웹폰트는 unicode-range로 100개 넘게 쪼개져 있어서
 * 전부 받으면 20MB를 내려받다 멈춘다.
 *
 * 그래서 문서에 실제로 쓰인 글자가 속한 서브셋만 골라 인라인한다.
 * 보통 한글 원고 하나가 건드리는 서브셋은 열 개 안팎, 수백 KB 수준이다.
 */

interface FaceRule {
  family: string
  cssText: string
  src: string
  ranges: Array<[number, number]> | null
  /** 단일 웨이트면 그 값, 가변 폰트처럼 범위면 null */
  weight: number | null
  descriptors: string
}

/** 문서에서 실제로 쓰인 (글꼴, 굵기) 조합 */
export interface UsedFace {
  family: string
  weight: number
}

/** "U+ff03-ff05" / "U+f9ca" / "U+4??" 를 코드포인트 구간으로 */
function parseUnicodeRange(value: string): Array<[number, number]> | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const out: Array<[number, number]> = []
  for (const token of trimmed.split(',')) {
    const t = token.trim().replace(/^u\+/i, '')
    if (!t) continue

    if (t.includes('?')) {
      const lo = parseInt(t.replace(/\?/g, '0'), 16)
      const hi = parseInt(t.replace(/\?/g, 'F'), 16)
      if (Number.isFinite(lo) && Number.isFinite(hi)) out.push([lo, hi])
      continue
    }

    const [a, b] = t.split('-')
    const lo = parseInt(a, 16)
    const hi = b ? parseInt(b, 16) : lo
    if (Number.isFinite(lo) && Number.isFinite(hi)) out.push([lo, hi])
  }
  return out.length ? out : null
}

function collectFaceRules(): FaceRule[] {
  const rules: FaceRule[] = []

  for (const sheet of Array.from(document.styleSheets)) {
    let list: CSSRuleList
    try {
      list = sheet.cssRules
    } catch {
      // cross-origin 스타일시트. self-host 폰트만 쓰면 여기 걸릴 일이 없다.
      continue
    }

    for (const rule of Array.from(list)) {
      const style = (rule as CSSFontFaceRule).style
      if (!style) continue
      const src = style.getPropertyValue('src')
      if (!src) continue

      const family = style.getPropertyValue('font-family').replace(/['"]/g, '').trim()
      if (!family) continue

      const descriptors = ['font-style', 'font-weight', 'font-stretch', 'font-display']
        .map((d) => {
          const v = style.getPropertyValue(d)
          return v ? `${d}:${v};` : ''
        })
        .join('')

      // "400" 은 단일 웨이트, "100 900" 은 가변 폰트 범위
      const rawWeight = style.getPropertyValue('font-weight').trim()
      const weight = /^\d+$/.test(rawWeight) ? Number(rawWeight) : null

      rules.push({
        family,
        cssText: rule.cssText,
        src,
        ranges: parseUnicodeRange(style.getPropertyValue('unicode-range')),
        weight,
        descriptors,
      })
    }
  }

  return rules
}

const inRange = (cp: number, ranges: Array<[number, number]>) =>
  ranges.some(([lo, hi]) => cp >= lo && cp <= hi)

async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`폰트를 읽지 못했습니다: ${url}`)
  const blob = await res.blob()
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

let cache: { key: string; css: string } | null = null

export function clearFontEmbedCache() {
  cache = null
}

/**
 * 문서에 실제로 쓰인 (글꼴, 굵기) 조합과 글자에 해당하는 @font-face만
 * data URL로 인라인한 CSS를 돌려준다.
 *
 * 굵기 필터가 없으면 본문에 400만 써도 300·500·700 서브셋까지 전부
 * 받게 되어 용량이 네 배가 된다.
 */
export async function buildFontEmbedCss(used: UsedFace[], text: string): Promise<string> {
  // 문서에 등장하는 코드포인트 집합 — 보통 수백 개를 넘지 않는다
  const codePoints = new Set<number>()
  for (const ch of text) codePoints.add(ch.codePointAt(0)!)

  const byFamily = new Map<string, Set<number>>()
  for (const u of used) {
    const key = u.family.replace(/['"]/g, '').trim().toLowerCase()
    if (!key) continue
    if (!byFamily.has(key)) byFamily.set(key, new Set())
    byFamily.get(key)!.add(u.weight)
  }

  const usedKey = [...byFamily]
    .map(([f, w]) => `${f}:${[...w].sort().join('/')}`)
    .sort()
    .join('|')
  const key = `${usedKey}::${[...codePoints].sort((a, b) => a - b).join(',')}`
  if (cache?.key === key) return cache.css

  const picked = collectFaceRules().filter((r) => {
    const weights = byFamily.get(r.family.toLowerCase())
    if (!weights) return false
    // 가변 폰트(weight 범위)는 항상 포함
    if (r.weight !== null && !weights.has(r.weight)) return false
    // unicode-range가 없으면 전 범위를 담당하는 폰트다 — 무조건 포함
    if (!r.ranges) return true
    for (const cp of codePoints) if (inRange(cp, r.ranges)) return true
    return false
  })

  const blocks = await Promise.all(
    picked.map(async (rule) => {
      const urls = [...rule.src.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => m[1])
      const woff2 = urls.find((u) => u.endsWith('.woff2')) ?? urls[0]
      if (!woff2 || woff2.startsWith('data:')) return rule.cssText

      try {
        const dataUrl = await toDataUrl(woff2)
        return `@font-face{font-family:'${rule.family}';${rule.descriptors}src:url(${dataUrl}) format('woff2');}`
      } catch {
        // 서브셋 하나를 못 받아도 나머지는 살린다
        return ''
      }
    }),
  )

  const css = blocks.filter(Boolean).join('\n')
  cache = { key, css }
  return css
}
