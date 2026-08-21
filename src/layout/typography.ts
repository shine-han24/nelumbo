import type { BlockType, StyleSnapshot, TextAlign } from '@/types'
import { getFont } from './fonts'

/**
 * 값을 전부 문자열(단위 포함)로 돌려준다.
 * React는 숫자에 px를 붙여주지만 DOM의 el.style은 그렇지 않다.
 * 측정 컨테이너와 미리보기가 같은 객체를 쓰려면 단위를 명시해야 한다.
 */
export type CssMap = Record<string, string>

/** 본문 컨테이너(단 하나)에 붙는 스타일 */
export function bodyCss(style: StyleSnapshot): CssMap {
  const { type } = style
  const font = getFont(type.fontId)

  return {
    fontFamily: font.stack,
    fontSize: `${type.fontSize}px`,
    fontWeight: String(type.fontWeight),
    lineHeight: String(type.lineHeight),
    letterSpacing: `${type.letterSpacing}em`,
    color: style.colors.paperText,

    // ── 한글 조판의 필수 3종 ──────────────────────────────
    // keep-all이 없으면 한글이 어절 중간에서 잘린다. 결과물 품질이 여기서 갈린다.
    wordBreak: 'keep-all',
    overflowWrap: 'break-word',
    lineBreak: 'strict',
    hangingPunctuation: 'allow-end',

    whiteSpace: 'pre-wrap',
    textRendering: 'optimizeLegibility',
    fontKerning: 'normal',

    writingMode: type.writingMode === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
    textOrientation: type.writingMode === 'vertical' ? 'upright' : 'mixed',
  }
}

const HEADING_SCALE: Record<number, number> = { 1: 1.6, 2: 1.35, 3: 1.15 }

/** 블록 하나에 붙는 스타일 */
export function blockCss(
  style: StyleSnapshot,
  type: BlockType,
  opts: {
    level?: number
    align?: TextAlign
    /** 문단 첫 줄인가 — 들여쓰기는 원문 문단의 첫 조각에만 준다 */
    isBlockStart: boolean
    /** 앞에 다른 블록이 있는가 — 첫 블록에는 위 여백을 주지 않는다 */
    isFirstInColumn: boolean
  } = { isBlockStart: true, isFirstInColumn: true },
): CssMap {
  const { type: t } = style
  const align = opts.align ?? t.align

  const css: CssMap = {
    // shorthand(margin)와 longhand(margin-block-start)를 섞으면 React가
    // 재렌더 때 어느 쪽을 지울지 몰라 경고를 낸다. 전부 longhand로 쓴다.
    marginBlockStart: '0',
    marginBlockEnd: '0',
    marginInlineStart: '0',
    marginInlineEnd: '0',
    textAlign: align,
    // 양쪽정렬에서 한글은 글자 사이를 벌려야 자연스럽다
    textJustify: align === 'justify' ? 'inter-character' : 'auto',
  }

  // 페이지 경계로 잘린 뒷조각에는 들여쓰기를 주면 안 된다 — 문단 중간이기 때문
  css.textIndent = opts.isBlockStart ? `${t.textIndent}em` : '0'

  // 물리 마진(margin-top)이 아니라 논리 마진을 쓴다.
  // 세로쓰기(vertical-rl)에서 블록은 오른쪽에서 왼쪽으로 쌓이므로
  // margin-top은 문단 사이를 벌리지 못하고 블록 높이만 깎아먹는다.
  if (!opts.isFirstInColumn) {
    css.marginBlockStart = `${t.paragraphSpacing}em`
  }

  switch (type) {
    case 'heading': {
      const scale = HEADING_SCALE[opts.level ?? 2] ?? 1.15
      css.fontSize = `${Math.round(t.fontSize * scale)}px`
      css.fontWeight = '700'
      css.textIndent = '0'
      css.lineHeight = String(Math.max(1.35, t.lineHeight - 0.35))
      if (!opts.isFirstInColumn) {
        css.marginBlockStart = `${Math.max(1, t.paragraphSpacing) * 1.4}em`
      }
      css.marginBlockEnd = '0.4em'
      break
    }
    case 'blockquote': {
      css.paddingInlineStart = '1.2em'
      css.borderInlineStart = `2px solid ${style.colors.paperRule}`
      css.textIndent = '0'
      css.opacity = '0.88'
      break
    }
    case 'divider': {
      css.textIndent = '0'
      break
    }
  }

  return css
}

/** DOM 엘리먼트에 CssMap 적용 */
export function applyCss(el: HTMLElement, css: CssMap) {
  for (const [k, v] of Object.entries(css)) {
    el.style.setProperty(toKebab(k), v)
  }
}

const toKebab = (k: string) => k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
