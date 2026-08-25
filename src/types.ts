/** 조판 도메인 타입. styleStore 전체가 그대로 "조판 프리셋"의 단위가 된다. */

/** 운하(기본) · 운하 밤 · 하늘 · 먹 · 직접 만든 테마 */
export type UiTheme = 'unha' | 'unha-night' | 'sky' | 'ink' | 'custom'

export type TextAlign = 'left' | 'center' | 'right' | 'justify'
export type WritingMode = 'horizontal' | 'vertical'

export type PaperCategory = 'book' | 'paper' | 'social'

export interface PaperSize {
  id: string
  label: string
  category: PaperCategory
  /** 논리 픽셀. 책 판형은 mm를 96dpi 기준으로 환산한 값. */
  width: number
  height: number
  /** 내보내기 기본 배율. 논리 크기 × 이 값 = 최종 픽셀. */
  exportScale: number
  /** 이 판형에서 자연스러운 기본 여백(논리 px) */
  defaultMargin: Margin
  /** 이 판형에서 자연스러운 기본 본문 크기(논리 px) */
  defaultFontSize: number
}

export interface Margin {
  top: number
  right: number
  bottom: number
  left: number
}

export interface FontDef {
  id: string
  label: string
  stack: string
  /** 페이지네이션 전 프리로드할 웨이트 */
  weights: number[]
  kind: 'serif' | 'sans'
}

/** 본문 조판 수치 */
export interface TypeStyle {
  fontId: string
  /** 논리 px */
  fontSize: number
  /** 배수 */
  lineHeight: number
  /** em */
  letterSpacing: number
  /** em — 문단 사이 간격 */
  paragraphSpacing: number
  /** em — 문단 첫 줄 들여쓰기 */
  textIndent: number
  align: TextAlign
  writingMode: WritingMode
  /** 문단 첫 글자 확대 (첫 문단에만) */
  dropCap: boolean
  /** 본문 굵기 */
  fontWeight: number
}

/** 지면 설정 */
export interface PageSetup {
  paperId: string
  margin: Margin
  /** 단 수 */
  columns: number
  /** 단 사이 간격(논리 px) */
  columnGap: number
}

export interface PaperColors {
  paperBg: string
  paperText: string
  /** 구분선·쪽수 등 부수 요소 색 */
  paperRule: string
}

export type BgFit = 'cover' | 'contain' | 'tile' | 'stretch'
export type BgAnchor =
  | 'top-left' | 'top' | 'top-right'
  | 'left' | 'center' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right'
export type BlendMode = 'normal' | 'multiply' | 'overlay' | 'soft-light' | 'screen'

export interface BackgroundSetup {
  /** idb-keyval 키. null이면 배경 없음. */
  imageKey: string | null
  fit: BgFit
  anchor: BgAnchor
  /** 배율 (1 = 원본 맞춤) */
  scale: number
  offsetX: number
  offsetY: number
  opacity: number
  blur: number
  brightness: number
  contrast: number
  grayscale: number
  /** 가독성 오버레이 — 사진 위 조판의 핵심 */
  overlayColor: string
  overlayOpacity: number
  overlayBlend: BlendMode
  /** 종이 질감 */
  grain: number
  vignette: number
}

export interface FooterSetup {
  showTitle: boolean
  showPageNumber: boolean
  showRule: boolean
  /** 지은이 */
  showSource: boolean
  showPublisher: boolean
  /** 발췌한 원본의 쪽 범위 (앱이 매기는 쪽수와 다르다) */
  showSourcePage: boolean
  /** 쪽수 시작 번호 */
  startPage: number
  fontSize: number
}

/** 조판 프리셋 = 아래 전부의 스냅샷 */
export interface StyleSnapshot {
  type: TypeStyle
  page: PageSetup
  colors: PaperColors
  background: BackgroundSetup
  footer: FooterSetup
}

export interface TypePreset extends StyleSnapshot {
  id: string
  label: string
}

/** 문서 메타 — 출처 표기용 */
export interface DocMeta {
  title: string
  author: string
  publisher: string
  sourcePage: string
}

/* ── 페이지네이션 ────────────────────────────────────────────── */

export type BlockType = 'paragraph' | 'heading' | 'blockquote' | 'divider'

/** 마크가 붙은 텍스트 조각 */
export interface Span {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
}

/** 에디터 문서를 조판용으로 평탄화한 블록 */
export interface Block {
  id: string
  type: BlockType
  level?: number
  spans: Span[]
  /** spans를 이어붙인 평문. 측정·맞춤법 검사의 오프셋 기준. */
  text: string
  /** 이 블록에만 적용되는 정렬. 없으면 전역 조판 설정을 따른다. */
  align?: TextAlign
}

/** 한 블록에서 잘라낸 조각 (페이지 경계로 분할된 결과) */
export interface BlockSlice {
  blockId: string
  type: BlockType
  level?: number
  spans: Span[]
  align?: TextAlign
  /** 원본 블록 기준 문자 오프셋 */
  start: number
  end: number
  /** 이 조각이 원본 블록의 첫 줄을 포함하는가 — 들여쓰기·드롭캡 판단용 */
  isBlockStart: boolean
  isBlockEnd: boolean
  /** 단의 맨 위 조각인가 — 위 여백을 줄지 판단용 */
  isFirstInColumn: boolean
}

export interface Column {
  slices: BlockSlice[]
}

export interface RenderedPage {
  index: number
  columns: Column[]
}
