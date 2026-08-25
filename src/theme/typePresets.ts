import type { StyleSnapshot, TypePreset } from '@/types'
import { getPaper } from '@/layout/paperSizes'

/** 판형을 바꿀 때 여백·본문 크기를 그 판형의 기본값으로 재설정한다. */
export function applyPaperDefaults(s: StyleSnapshot, paperId: string): StyleSnapshot {
  const paper = getPaper(paperId)
  return {
    ...s,
    page: { ...s.page, paperId, margin: { ...paper.defaultMargin } },
    type: { ...s.type, fontSize: paper.defaultFontSize },
  }
}

const base = (paperId: string): Pick<StyleSnapshot, 'page'> => {
  const paper = getPaper(paperId)
  return {
    page: {
      paperId,
      margin: { ...paper.defaultMargin },
      columns: 1,
      columnGap: 32,
    },
  }
}

const noBackground: StyleSnapshot['background'] = {
  imageKey: null,
  fit: 'cover',
  anchor: 'center',
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  opacity: 1,
  blur: 0,
  brightness: 1,
  contrast: 1,
  grayscale: 0,
  overlayColor: '#000000',
  overlayOpacity: 0,
  overlayBlend: 'normal',
  grain: 0,
  vignette: 0,
}

const footerOff: StyleSnapshot['footer'] = {
  showTitle: false,
  showPageNumber: true,
  showRule: false,
  showSource: false,
  showPublisher: false,
  showSourcePage: false,
  startPage: 1,
  fontSize: 10,
}

export const TYPE_PRESETS: TypePreset[] = [
  {
    id: 'classic-mungo',
    label: '고전 문고판',
    ...base('mungo'),
    type: {
      fontId: 'nanum-myeongjo',
      fontSize: 12,
      lineHeight: 1.75,
      letterSpacing: -0.01,
      paragraphSpacing: 0,
      textIndent: 1,
      align: 'justify',
      writingMode: 'horizontal',
      dropCap: false,
      fontWeight: 400,
    },
    colors: { paperBg: '#ffffff', paperText: '#000000', paperRule: '#9aa4ad' },
    background: { ...noBackground },
    footer: { ...footerOff, showPageNumber: true, showRule: true },
  },
  {
    id: 'modern-essay',
    label: '모던 에세이',
    ...base('sinkuk'),
    type: {
      fontId: 'noto-serif',
      fontSize: 15,
      lineHeight: 2,
      letterSpacing: -0.005,
      paragraphSpacing: 0.9,
      textIndent: 0,
      align: 'left',
      writingMode: 'horizontal',
      dropCap: false,
      fontWeight: 400,
    },
    colors: { paperBg: '#ffffff', paperText: '#0b0f14', paperRule: '#a9b6c1' },
    background: { ...noBackground },
    footer: { ...footerOff, showTitle: true, showPageNumber: true },
  },
  {
    id: 'photo-card',
    label: '사진 엽서',
    ...base('insta-square'),
    type: {
      fontId: 'gowun-batang',
      fontSize: 17,
      lineHeight: 1.95,
      letterSpacing: 0.01,
      paragraphSpacing: 0.6,
      textIndent: 0,
      align: 'center',
      writingMode: 'horizontal',
      dropCap: false,
      fontWeight: 400,
    },
    colors: { paperBg: '#ffffff', paperText: '#0b0f14', paperRule: '#7fa8cc' },
    background: { ...noBackground, overlayColor: '#0b0f14', overlayOpacity: 0.28 },
    footer: { ...footerOff, showPageNumber: false, showSource: true },
  },
  {
    id: 'vertical',
    label: '세로쓰기 문학',
    ...base('sinkuk'),
    type: {
      fontId: 'nanum-myeongjo',
      fontSize: 16,
      lineHeight: 2.2,
      letterSpacing: 0.02,
      paragraphSpacing: 0.5,
      textIndent: 1,
      align: 'left',
      writingMode: 'vertical',
      dropCap: false,
      fontWeight: 400,
    },
    colors: { paperBg: '#ffffff', paperText: '#000000', paperRule: '#9aa4ad' },
    background: { ...noBackground },
    footer: { ...footerOff, showPageNumber: false },
  },
]

export const DEFAULT_PRESET_ID = 'modern-essay'

export function presetSnapshot(id: string): StyleSnapshot {
  const p = TYPE_PRESETS.find((x) => x.id === id) ?? TYPE_PRESETS[1]
  return structuredClone({
    type: p.type,
    page: p.page,
    colors: p.colors,
    background: p.background,
    footer: p.footer,
  })
}

export const DEFAULT_SNAPSHOT = (): StyleSnapshot => presetSnapshot(DEFAULT_PRESET_ID)
