import { Link2, Link2Off } from 'lucide-react'
import { useState } from 'react'
import { useStyleStore } from '@/store/styleStore'
import { PAPER_GROUPS, PAPER_SIZES, getPaper } from '@/layout/paperSizes'
import { NumberBox, Row, Section, Select, Slider } from '@/ui/Control'

export function PagePanel() {
  const page = useStyleStore((s) => s.page)
  const setPage = useStyleStore((s) => s.setPage)
  const setMargin = useStyleStore((s) => s.setMargin)
  const setPaper = useStyleStore((s) => s.setPaper)
  const setPaperKeepStyle = useStyleStore((s) => s.setPaperKeepStyle)

  const [linkMargins, setLinkMargins] = useState(false)
  const [resetOnPaperChange, setResetOnPaperChange] = useState(true)

  const paper = getPaper(page.paperId)

  const setAll = (v: number) => setMargin({ top: v, right: v, bottom: v, left: v })

  return (
    <>
      <Section title="판형">
        <Row label="크기">
          <Select
            value={page.paperId}
            onChange={(id) => (resetOnPaperChange ? setPaper(id) : setPaperKeepStyle(id))}
            options={PAPER_SIZES.map((p) => ({
              value: p.id,
              label: p.label,
              group: PAPER_GROUPS.find((g) => g.category === p.category)?.label,
            }))}
          />
        </Row>
        <p className="pl-[70px] text-[11px] tabular-nums text-ui-text-dim">
          {paper.width} × {paper.height} · 내보내기 {paper.width * paper.exportScale} ×{' '}
          {paper.height * paper.exportScale}px
        </p>
        <label className="flex cursor-pointer items-center gap-2 pl-[70px] pt-0.5">
          <input
            type="checkbox"
            className="np-check"
            checked={resetOnPaperChange}
            onChange={(e) => setResetOnPaperChange(e.target.checked)}
          />
          <span className="text-[12px] text-ui-text-dim">판형 바꿀 때 여백·크기 초기화</span>
        </label>
      </Section>

      <Section title="여백">
        {/* 링크 토글은 슬라이더 행 밖으로 뺐다. 한 줄에 라벨·슬라이더·숫자·단위·버튼을
            모두 넣으면 좁은 패널에서 오른쪽이 잘린다. */}
        <button
          type="button"
          onClick={() => setLinkMargins((v) => !v)}
          className={[
            'mb-0.5 flex h-[26px] w-fit items-center gap-1.5 rounded-ui border px-2 text-[11px] transition-colors',
            linkMargins
              ? 'border-ui-accent bg-ui-accent-soft text-ui-accent'
              : 'border-ui-border text-ui-text-dim hover:text-ui-text',
          ].join(' ')}
        >
          {linkMargins ? <Link2 size={12} /> : <Link2Off size={12} />}
          {linkMargins ? '네 방향 함께' : '방향별로 따로'}
        </button>

        <Row label="전체">
          <Slider
            value={page.margin.top}
            min={0}
            max={Math.round(Math.min(paper.width, paper.height) / 3)}
            onChange={setAll}
            suffix="px"
          />
        </Row>

        {!linkMargins && (
          <div className="grid grid-cols-[68px_1fr_1fr] items-center gap-2">
            <span className="text-[12px] text-ui-text-dim">위 / 아래</span>
            <NumberBox value={page.margin.top} min={0} onChange={(top) => setMargin({ top })} />
            <NumberBox
              value={page.margin.bottom}
              min={0}
              onChange={(bottom) => setMargin({ bottom })}
            />
            <span className="text-[12px] text-ui-text-dim">좌 / 우</span>
            <NumberBox value={page.margin.left} min={0} onChange={(left) => setMargin({ left })} />
            <NumberBox
              value={page.margin.right}
              min={0}
              onChange={(right) => setMargin({ right })}
            />
          </div>
        )}
      </Section>

      <Section title="단">
        <Row label="단 수">
          <Slider
            value={page.columns}
            min={1}
            max={4}
            onChange={(columns) => setPage({ columns })}
          />
        </Row>
        <Row label="단 간격">
          <Slider
            value={page.columnGap}
            min={8}
            max={96}
            suffix="px"
            onChange={(columnGap) => setPage({ columnGap })}
          />
        </Row>
      </Section>
    </>
  )
}
