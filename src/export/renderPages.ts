import { toBlob } from 'html-to-image'
import { buildFontEmbedCss, type UsedFace } from './fontEmbed'

export type ImageFormat = 'png' | 'jpeg' | 'webp'

export interface RenderOptions {
  format: ImageFormat
  /** 논리 크기에 곱할 배율 */
  scale: number
  /** jpeg/webp 품질 (0~1) */
  quality: number
  background: string
}

/** 현재 미리보기에 렌더된 페이지 DOM들 */
export function collectPageNodes(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-export-id]'))
}

/**
 * 페이지들에 실제로 쓰인 폰트와 글자만 골라 임베딩 CSS를 만든다.
 *
 * html-to-image에게 맡기면 스타일시트의 @font-face를 전부 인라인하는데,
 * 한글 서브셋이 900개쯤 되므로 그대로 두면 내보내기가 끝나지 않는다.
 * 결과는 fontEmbed 쪽에서 캐시하므로 페이지마다 다시 계산되지 않는다.
 */
async function fontCssFor(nodes: HTMLElement[]): Promise<string> {
  const used = new Map<string, UsedFace>()
  let text = ''

  const note = (el: HTMLElement) => {
    const cs = getComputedStyle(el)
    const weight = Number(cs.fontWeight) || 400
    for (const raw of cs.fontFamily.split(',')) {
      const family = raw.trim().replace(/['"]/g, '')
      if (!family) continue
      used.set(`${family}|${weight}`, { family, weight })
    }
  }

  for (const node of nodes) {
    text += node.innerText ?? node.textContent ?? ''
    note(node)
    for (const el of node.querySelectorAll<HTMLElement>('*')) note(el)
  }

  return buildFontEmbedCss([...used.values()], text)
}

export async function renderPage(
  node: HTMLElement,
  opts: RenderOptions,
  fontEmbedCSS: string,
): Promise<Blob> {
  const blob = await toBlob(node, {
    // html-to-image는 offsetWidth/Height를 쓰므로 미리보기의 zoom 변형에
    // 영향받지 않는다. 논리 크기 × pixelRatio가 최종 해상도가 된다.
    pixelRatio: opts.scale,
    type: `image/${opts.format}`,
    quality: opts.quality,
    backgroundColor: opts.format === 'jpeg' ? opts.background : undefined,
    fontEmbedCSS,
    cacheBust: false,
  })
  if (!blob) throw new Error('페이지를 이미지로 만들지 못했습니다.')
  return blob
}

export interface RenderAllProgress {
  done: number
  total: number
}

export async function renderAllPages(
  opts: RenderOptions,
  onProgress?: (p: RenderAllProgress) => void,
): Promise<Blob[]> {
  const nodes = collectPageNodes()
  if (nodes.length === 0) throw new Error('내보낼 페이지가 없습니다.')

  const fontEmbedCSS = await fontCssFor(nodes)

  const out: Blob[] = []
  for (let i = 0; i < nodes.length; i++) {
    out.push(await renderPage(nodes[i], opts, fontEmbedCSS))
    onProgress?.({ done: i + 1, total: nodes.length })
  }
  return out
}

/** 페이지 한 장만 — 폰트 CSS도 그 페이지 기준으로만 만든다 */
export async function renderOnePage(
  index: number,
  opts: RenderOptions,
): Promise<{ blob: Blob; node: HTMLElement }> {
  const nodes = collectPageNodes()
  const node = nodes[index]
  if (!node) throw new Error('내보낼 페이지가 없습니다.')

  const fontEmbedCSS = await fontCssFor([node])
  return { blob: await renderPage(node, opts, fontEmbedCSS), node }
}
