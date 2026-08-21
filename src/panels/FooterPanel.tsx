import { useDocStore, docStats } from '@/store/docStore'
import { useStyleStore } from '@/store/styleStore'
import { useUiStore } from '@/store/uiStore'
import { NumberBox, Row, Section, Slider, TextBox, Toggle } from '@/ui/Control'

export function FooterPanel() {
  const meta = useDocStore((s) => s.meta)
  const setMeta = useDocStore((s) => s.setMeta)
  const blocks = useDocStore((s) => s.blocks)
  const footer = useStyleStore((s) => s.footer)
  const setFooter = useStyleStore((s) => s.setFooter)
  const cleanup = useUiStore((s) => s.cleanup)
  const setCleanup = useUiStore((s) => s.setCleanup)

  const stats = docStats(blocks)

  return (
    <>
      <Section title="출처">
        <Row label="책 제목">
          <TextBox value={meta.title} placeholder="예: 인간 실격" onChange={(title) => setMeta({ title })} />
        </Row>
        <Row label="지은이">
          <TextBox value={meta.author} placeholder="예: 다자이 오사무" onChange={(author) => setMeta({ author })} />
        </Row>
        <Row label="출판사">
          <TextBox value={meta.publisher} placeholder="예: 민음사" onChange={(publisher) => setMeta({ publisher })} />
        </Row>
        <Row label="원본 쪽">
          <TextBox value={meta.sourcePage} placeholder="예: 74–76쪽" onChange={(sourcePage) => setMeta({ sourcePage })} />
        </Row>
      </Section>

      <Section title="하단 표기">
        <Toggle checked={footer.showTitle} onChange={(showTitle) => setFooter({ showTitle })} label="책 제목 표시" />
        <Toggle checked={footer.showSource} onChange={(showSource) => setFooter({ showSource })} label="지은이 표시" />
        <Toggle
          checked={footer.showPageNumber}
          onChange={(showPageNumber) => setFooter({ showPageNumber })}
          label="쪽수 표시"
        />
        <Toggle checked={footer.showRule} onChange={(showRule) => setFooter({ showRule })} label="구분선 표시" />

        <Row label="시작 쪽">
          <NumberBox
            value={footer.startPage}
            min={0}
            onChange={(startPage) => setFooter({ startPage })}
          />
        </Row>
        <Row label="글자 크기">
          <Slider
            value={footer.fontSize}
            min={6}
            max={20}
            step={0.5}
            precision={1}
            suffix="px"
            onChange={(fontSize) => setFooter({ fontSize })}
          />
        </Row>
      </Section>

      <Section title="붙여넣기 정리">
        <p className="-mt-1 mb-1 text-[11px] leading-relaxed text-ui-text-dim">
          전자책이나 PDF에서 복사한 글은 줄마다 개행이 박혀 있습니다. 붙여넣는 순간
          자동으로 정리합니다.
        </p>
        <Toggle
          checked={cleanup.enabled}
          onChange={(enabled) => setCleanup({ enabled })}
          label="붙여넣기 정리 사용"
        />
        {cleanup.enabled && (
          <div className="flex flex-col gap-0.5 pl-4">
            <Toggle
              checked={cleanup.mergeSoftWraps}
              onChange={(mergeSoftWraps) => setCleanup({ mergeSoftWraps })}
              label="끊긴 문단 이어 붙이기"
            />
            <Toggle
              checked={cleanup.dropPageNumbers}
              onChange={(dropPageNumbers) => setCleanup({ dropPageNumbers })}
              label="쪽번호 줄 지우기"
            />
            <Toggle
              checked={cleanup.smartTypography}
              onChange={(smartTypography) => setCleanup({ smartTypography })}
              label="따옴표·말줄임표 다듬기"
            />
          </div>
        )}
      </Section>

      <Section title="통계">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
          <Stat label="글자" value={stats.chars.toLocaleString()} />
          <Stat label="공백 제외" value={stats.charsNoSpace.toLocaleString()} />
          <Stat label="어절" value={stats.words.toLocaleString()} />
          <Stat label="문단" value={stats.blocks.toLocaleString()} />
          <Stat label="읽는 시간" value={`약 ${stats.readMinutes}분`} />
        </dl>
      </Section>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-ui-text-dim">{label}</dt>
      <dd className="tabular-nums text-ui-text">{value}</dd>
    </div>
  )
}
