import { useRef } from 'react'
import { AlertTriangle, ImageUp, Trash2 } from 'lucide-react'
import type { BgAnchor, BgFit, BlendMode } from '@/types'
import { useStyleStore } from '@/store/styleStore'
import { putImage, removeImage } from '@/store/imageCache'
import { ColorBox, Row, Section, Segmented, Select, Slider } from '@/ui/Control'
import { judgeContrast } from '@/ui/contrast'

const ANCHORS: BgAnchor[] = [
  'top-left', 'top', 'top-right',
  'left', 'center', 'right',
  'bottom-left', 'bottom', 'bottom-right',
]

export function ColorPanel() {
  const colors = useStyleStore((s) => s.colors)
  const setColors = useStyleStore((s) => s.setColors)
  const bg = useStyleStore((s) => s.background)
  const setBackground = useStyleStore((s) => s.setBackground)
  const fileRef = useRef<HTMLInputElement>(null)

  const verdict = judgeContrast(colors.paperText, colors.paperBg)

  const onPick = async (file: File | undefined) => {
    if (!file) return
    if (bg.imageKey) await removeImage(bg.imageKey)
    const key = await putImage(file)
    setBackground({ imageKey: key })
  }

  const clearImage = async () => {
    if (bg.imageKey) await removeImage(bg.imageKey)
    setBackground({ imageKey: null })
  }

  return (
    <>
      <Section title="종이 · 글자">
        <Row label="종이색">
          <ColorBox value={colors.paperBg} onChange={(paperBg) => setColors({ paperBg })} />
        </Row>
        <Row label="글자색">
          <ColorBox value={colors.paperText} onChange={(paperText) => setColors({ paperText })} />
        </Row>
        <Row label="선·쪽수">
          <ColorBox value={colors.paperRule} onChange={(paperRule) => setColors({ paperRule })} />
        </Row>

        {verdict && verdict.level !== 'good' && (
          <div
            className={[
              'mt-1 flex items-start gap-1.5 rounded-ui px-2 py-1.5 text-[11px] leading-snug',
              verdict.level === 'poor'
                ? 'bg-ui-danger/12 text-ui-danger'
                : 'bg-ui-surface-2 text-ui-text-dim',
            ].join(' ')}
          >
            <AlertTriangle size={12} className="mt-px shrink-0" />
            <span>
              글자와 종이의 대비 {verdict.ratio.toFixed(1)}:1 — {verdict.message}.
            </span>
          </div>
        )}
      </Section>

      <Section title="배경 이미지">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void onPick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-[30px] flex-1 items-center justify-center gap-1.5 rounded-ui border border-ui-border bg-ui-bg text-[12px] text-ui-text hover:bg-ui-surface-2"
          >
            <ImageUp size={12} />
            {bg.imageKey ? '이미지 바꾸기' : '이미지 올리기'}
          </button>
          {bg.imageKey && (
            <button
              type="button"
              title="배경 제거"
              onClick={() => void clearImage()}
              className="grid h-[30px] w-[30px] place-items-center rounded-ui border border-ui-border text-ui-text-dim hover:text-ui-danger"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>

        {bg.imageKey && (
          <>
            <Row label="맞춤">
              <Segmented<BgFit>
                value={bg.fit}
                onChange={(fit) => setBackground({ fit })}
                options={[
                  { value: 'cover', label: '채움' },
                  { value: 'contain', label: '맞춤' },
                  { value: 'tile', label: '타일' },
                  { value: 'stretch', label: '늘임' },
                ]}
              />
            </Row>
            <Row label="기준점">
              <Select<BgAnchor>
                value={bg.anchor}
                onChange={(anchor) => setBackground({ anchor })}
                options={ANCHORS.map((a) => ({ value: a, label: ANCHOR_LABEL[a] }))}
              />
            </Row>
            <Row label="배율">
              <Slider
                value={bg.scale}
                min={0.2}
                max={3}
                step={0.05}
                precision={2}
                suffix="×"
                onChange={(scale) => setBackground({ scale })}
              />
            </Row>
            <Row label="가로 이동">
              <Slider
                value={bg.offsetX}
                min={-400}
                max={400}
                suffix="px"
                onChange={(offsetX) => setBackground({ offsetX })}
              />
            </Row>
            <Row label="세로 이동">
              <Slider
                value={bg.offsetY}
                min={-400}
                max={400}
                suffix="px"
                onChange={(offsetY) => setBackground({ offsetY })}
              />
            </Row>
            <Row label="불투명도">
              <Slider
                value={bg.opacity}
                min={0}
                max={1}
                step={0.01}
                precision={2}
                onChange={(opacity) => setBackground({ opacity })}
              />
            </Row>
            <Row label="흐림">
              <Slider
                value={bg.blur}
                min={0}
                max={40}
                onChange={(blur) => setBackground({ blur })}
                suffix="px"
              />
            </Row>
            <Row label="밝기">
              <Slider
                value={bg.brightness}
                min={0.2}
                max={2}
                step={0.01}
                precision={2}
                onChange={(brightness) => setBackground({ brightness })}
              />
            </Row>
            <Row label="대비">
              <Slider
                value={bg.contrast}
                min={0.2}
                max={2}
                step={0.01}
                precision={2}
                onChange={(contrast) => setBackground({ contrast })}
              />
            </Row>
            <Row label="흑백">
              <Slider
                value={bg.grayscale}
                min={0}
                max={1}
                step={0.01}
                precision={2}
                onChange={(grayscale) => setBackground({ grayscale })}
              />
            </Row>
          </>
        )}
      </Section>

      <Section title="가독성 오버레이">
        <p className="-mt-1 mb-1 text-[11px] leading-relaxed text-ui-text-dim">
          사진 위에 글씨를 얹으면 대개 읽히지 않습니다. 종이와 사진 사이에 반투명 막을
          한 겹 넣어 대비를 확보하세요.
        </p>
        <Row label="색">
          <ColorBox
            value={bg.overlayColor}
            onChange={(overlayColor) => setBackground({ overlayColor })}
          />
        </Row>
        <Row label="농도">
          <Slider
            value={bg.overlayOpacity}
            min={0}
            max={1}
            step={0.01}
            precision={2}
            onChange={(overlayOpacity) => setBackground({ overlayOpacity })}
          />
        </Row>
        <Row label="혼합">
          <Select<BlendMode>
            value={bg.overlayBlend}
            onChange={(overlayBlend) => setBackground({ overlayBlend })}
            options={[
              { value: 'normal', label: '보통' },
              { value: 'multiply', label: '곱하기 (어둡게)' },
              { value: 'screen', label: '스크린 (밝게)' },
              { value: 'overlay', label: '오버레이' },
              { value: 'soft-light', label: '소프트 라이트' },
            ]}
          />
        </Row>
      </Section>

      <Section title="질감">
        <Row label="종이결">
          <Slider
            value={bg.grain}
            min={0}
            max={0.4}
            step={0.01}
            precision={2}
            onChange={(grain) => setBackground({ grain })}
          />
        </Row>
        <Row label="비네트">
          <Slider
            value={bg.vignette}
            min={0}
            max={0.8}
            step={0.01}
            precision={2}
            onChange={(vignette) => setBackground({ vignette })}
          />
        </Row>
      </Section>
    </>
  )
}

const ANCHOR_LABEL: Record<BgAnchor, string> = {
  'top-left': '왼쪽 위',
  top: '위',
  'top-right': '오른쪽 위',
  left: '왼쪽',
  center: '가운데',
  right: '오른쪽',
  'bottom-left': '왼쪽 아래',
  bottom: '아래',
  'bottom-right': '오른쪽 아래',
}
