import { AlignCenter, AlignJustify, AlignLeft, AlignRight } from 'lucide-react'
import type { TextAlign, WritingMode } from '@/types'
import { useStyleStore } from '@/store/styleStore'
import { FONTS } from '@/layout/fonts'
import { Row, Section, Segmented, Select, Slider, Toggle } from '@/ui/Control'

const KIND_LABEL: Record<string, string> = {
  serif: '명조 계열',
  sans: '고딕 계열',
}

export function TypographyPanel() {
  const type = useStyleStore((s) => s.type)
  const setType = useStyleStore((s) => s.setType)

  return (
    <>
      <Section title="서체">
        <Row label="글꼴">
          <Select
            value={type.fontId}
            onChange={(fontId) => setType({ fontId })}
            options={FONTS.map((f) => ({
              value: f.id,
              label: f.label,
              group: KIND_LABEL[f.kind],
            }))}
          />
        </Row>
        <Row label="굵기">
          <Select
            value={String(type.fontWeight)}
            onChange={(v) => setType({ fontWeight: Number(v) })}
            options={[
              { value: '300', label: '가늘게' },
              { value: '400', label: '보통' },
              { value: '500', label: '중간' },
              { value: '700', label: '굵게' },
            ]}
          />
        </Row>
        <Row label="크기">
          <Slider
            value={type.fontSize}
            min={8}
            max={48}
            step={0.5}
            precision={1}
            suffix="px"
            onChange={(fontSize) => setType({ fontSize })}
          />
        </Row>
      </Section>

      <Section title="행·자간">
        <Row label="행간">
          <Slider
            value={type.lineHeight}
            min={1}
            max={3.2}
            step={0.05}
            precision={2}
            onChange={(lineHeight) => setType({ lineHeight })}
          />
        </Row>
        <Row label="자간">
          <Slider
            value={type.letterSpacing}
            min={-0.08}
            max={0.3}
            step={0.005}
            precision={3}
            suffix="em"
            onChange={(letterSpacing) => setType({ letterSpacing })}
          />
        </Row>
        <Row label="문단 간격">
          <Slider
            value={type.paragraphSpacing}
            min={0}
            max={3}
            step={0.05}
            precision={2}
            suffix="em"
            onChange={(paragraphSpacing) => setType({ paragraphSpacing })}
          />
        </Row>
        <Row label="들여쓰기">
          <Slider
            value={type.textIndent}
            min={0}
            max={4}
            step={0.25}
            precision={2}
            suffix="em"
            onChange={(textIndent) => setType({ textIndent })}
          />
        </Row>
      </Section>

      <Section title="정렬·흐름">
        <Row label="기본 정렬">
          <Segmented<TextAlign>
            value={type.align}
            onChange={(align) => setType({ align })}
            options={[
              { value: 'left', label: <AlignLeft size={12} />, title: '왼쪽' },
              { value: 'center', label: <AlignCenter size={12} />, title: '가운데' },
              { value: 'right', label: <AlignRight size={12} />, title: '오른쪽' },
              { value: 'justify', label: <AlignJustify size={12} />, title: '양쪽' },
            ]}
          />
        </Row>
        <Row label="쓰기 방향">
          <Segmented<WritingMode>
            value={type.writingMode}
            onChange={(writingMode) => setType({ writingMode })}
            options={[
              { value: 'horizontal', label: '가로', title: '가로쓰기' },
              { value: 'vertical', label: '세로', title: '세로쓰기 (오른쪽 → 왼쪽)' },
            ]}
          />
        </Row>
        <div className="pl-[70px]">
          <Toggle
            checked={type.dropCap}
            onChange={(dropCap) => setType({ dropCap })}
            label="첫 글자 크게 (드롭캡)"
          />
        </div>
      </Section>

    </>
  )
}
