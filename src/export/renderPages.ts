import { toBlob } from 'html-to-image'
import { buildFontEmbedCss, type UsedFace } from './fontEmbed'
import { dataUrlForObjectUrl } from '@/store/imageCache'

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

const BLOB_URL_IN_CSS = /url\(["']?(blob:[^"')]+)["']?\)/

/**
 * 캡처하는 동안만 blob: 배경을 data URL로 바꿔 둔다.
 *
 * html-to-image는 배경을 인라인하려고 fetch(blob:...)를 시도하는데,
 * 실패해도 예외를 던지지 않고 빈 값으로 대체한 뒤 넘어간다.
 * 그래서 배경만 소리 없이 빠진 이미지가 나온다.
 * 애초에 fetch가 필요 없도록 data URL을 물려주고, 끝나면 되돌린다.
 */
async function withInlinedBackgrounds<T>(
  nodes: HTMLElement[],
  run: () => Promise<T>,
): Promise<T> {
  const restore: Array<[HTMLElement, string]> = []
  const converted = new Map<string, string>()

  for (const node of nodes) {
    for (const el of [node, ...node.querySelectorAll<HTMLElement>('*')]) {
      const bg = el.style.backgroundImage
      const found = bg && BLOB_URL_IN_CSS.exec(bg)
      if (!found) continue

      const blobUrl = found[1]
      let dataUrl = converted.get(blobUrl)
      if (dataUrl === undefined) {
        dataUrl = (await dataUrlForObjectUrl(blobUrl)) ?? ''
        converted.set(blobUrl, dataUrl)
      }
      if (!dataUrl) continue

      restore.push([el, bg])
      el.style.backgroundImage = bg.replace(blobUrl, dataUrl)
    }
  }

  try {
    return await run()
  } finally {
    // 되돌리지 않으면 미리보기에 거대한 data URL이 그대로 남는다
    for (const [el, original] of restore) el.style.backgroundImage = original
  }
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

  return withInlinedBackgrounds(nodes, async () => {
    const out: Blob[] = []
    for (let i = 0; i < nodes.length; i++) {
      out.push(await renderPage(nodes[i], opts, fontEmbedCSS))
      onProgress?.({ done: i + 1, total: nodes.length })
    }
    return out
  })
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
  const blob = await withInlinedBackgrounds([node], () =>
    renderPage(node, opts, fontEmbedCSS),
  )
  return { blob, node }
}
