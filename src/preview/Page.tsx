import type { CSSProperties } from 'react'
import type { BlockSlice, RenderedPage, StyleSnapshot } from '@/types'
import { blockCss, bodyCss } from '@/layout/typography'
import { spansToHtml } from '@/layout/spansToHtml'
import { bodyBox, footerHeight, getPaper } from '@/layout/paperSizes'
import { useDocStore } from '@/store/docStore'
import { PageBackground } from './Background'
import './page.css'

interface Props {
  page: RenderedPage
  style: StyleSnapshot
  /** 내보내기 시 DOM을 찾기 위한 마커 */
  exportId?: string
}

/** CssMap(문자열 값)을 React 스타일로 넘기기 위한 캐스팅 */
const asStyle = (m: Record<string, string>) => m as unknown as CSSProperties

export function Page({ page, style, exportId }: Props) {
  const meta = useDocStore((s) => s.meta)
  const paper = getPaper(style.page.paperId)
  // 페이지네이션과 같은 함수로 본문 상자를 구한다 — 어긋나면 줄이 잘린다
  const box = bodyBox(style)
  const footerH = footerHeight(style)
  const vertical = style.type.writingMode === 'vertical'
  const { footer } = style
  const showFooter = footerH > 0

  // 켜져 있고 값이 있는 것만 남겨 가운뎃점으로 잇는다.
  // 원본 쪽은 발췌한 책의 쪽 번호라, 앱이 매기는 쪽수와 다른 자리에 둔다.
  const citation = [
    footer.showTitle && meta.title,
    footer.showSource && meta.author,
    footer.showPublisher && meta.publisher,
    footer.showSourcePage && meta.sourcePage,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className="np-page"
      data-export-id={exportId}
      style={{
        width: paper.width,
        height: paper.height,
        background: style.colors.paperBg,
        // 종이 토큰만 주입한다 — UI 테마 변수는 여기 들어오지 않는다
        ['--paper-bg' as string]: style.colors.paperBg,
        ['--paper-text' as string]: style.colors.paperText,
        ['--paper-rule' as string]: style.colors.paperRule,
      }}
    >
      <PageBackground background={style.background} />

      <div
        className="np-page-body"
        style={{
          left: style.page.margin.left,
          top: style.page.margin.top,
          width: box.width,
          height: box.height,
          flexDirection: vertical ? 'column' : 'row',
          gap: style.page.columnGap,
        }}
      >
        {page.columns.map((col, ci) => (
          <div key={ci} className="np-col" style={asStyle(bodyCss(style))}>
            {col.slices.map((slice, si) => (
              <Slice
                key={`${slice.blockId}-${slice.start}-${si}`}
                slice={slice}
                style={style}
                dropCap={
                  style.type.dropCap &&
                  page.index === 0 &&
                  ci === 0 &&
                  si === 0 &&
                  slice.isBlockStart &&
                  slice.type === 'paragraph'
                }
              />
            ))}
          </div>
        ))}
      </div>

      {showFooter && (
        <div
          className="np-footer"
          style={{
            left: style.page.margin.left,
            right: style.page.margin.right,
            bottom: Math.max(8, style.page.margin.bottom - footerH * 0.4),
            height: footerH,
            fontSize: footer.fontSize,
            color: style.colors.paperRule,
            fontFamily: bodyCss(style).fontFamily,
            letterSpacing: '0.02em',
          }}
        >
          {footer.showRule && (
            <span
              className="np-footer-rule"
              style={{ left: 0, right: 0, top: 0, background: style.colors.paperRule }}
            />
          )}
          <span style={{ opacity: 0.9 }}>{citation}</span>
          <span style={{ opacity: 0.9, fontVariantNumeric: 'tabular-nums' }}>
            {footer.showPageNumber && page.index + footer.startPage}
          </span>
        </div>
      )}
    </div>
  )
}

function Slice({
  slice,
  style,
  dropCap,
}: {
  slice: BlockSlice
  style: StyleSnapshot
  dropCap: boolean
}) {
  const css = asStyle(
    blockCss(style, slice.type, {
      level: slice.level,
      align: slice.align,
      isBlockStart: slice.isBlockStart,
      isFirstInColumn: slice.isFirstInColumn,
    }),
  )

  if (slice.type === 'divider') {
    return <div className="np-divider" style={css} />
  }

  const html = spansToHtml(slice.spans, slice.start, slice.end)

  if (slice.type === 'heading') {
    const Tag = (`h${slice.level ?? 2}` as 'h1' | 'h2' | 'h3')
    return <Tag style={css} dangerouslySetInnerHTML={{ __html: html }} />
  }

  return (
    <p
      className={dropCap ? 'np-dropcap' : undefined}
      style={css}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
