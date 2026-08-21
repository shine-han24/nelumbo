import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Minus, Plus } from 'lucide-react'
import type { StyleSnapshot } from '@/types'
import { useStyleStore } from '@/store/styleStore'
import { useUiStore } from '@/store/uiStore'
import { getPaper } from '@/layout/paperSizes'
import { IconTruck } from '@/ui/icons'
import { usePages } from './usePages'
import { Page } from './Page'

/** 배율과 무관한 고정 여백·간격 (스케일 컨테이너 안쪽 값) */
const PAD = 32
const GAP = 28

const MIN_ZOOM = 0.15
const MAX_ZOOM = 3
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

/**
 * 콘텐츠 둘레에 항상 두는 여백.
 *
 * 이게 왜 필요한가:
 *   내용이 화면보다 작을 때 가운데로 정렬하면, 그 정렬 거리가 배율에 따라
 *   변하기 때문에 확대할 때마다 화면이 옆으로 밀린다. 커서가 정중앙이
 *   아니면 반드시 한쪽으로 흐른다.
 *   둘레에 여백을 깔아 두면 미는 거리가 배율과 무관한 상수가 되어
 *   기준점이 정확히 고정된다. (Figma·InDesign 같은 캔버스 도구의 방식)
 *
 * 왜 하필 뷰포트 한 개 분량인가:
 *   필요한 스크롤 위치는 `기준점×배율 + 여백 − 커서위치`다.
 *   커서는 뷰포트 어디에나 올 수 있으므로 여백이 뷰포트보다 작으면
 *   이 값이 스크롤 가능 범위를 벗어나 잘리고, 그 순간 화면이 튄다.
 *   여백 ≥ 뷰포트면 어떤 배율·어떤 커서 위치에서도 걸리지 않는다.
 */
const padFor = (viewportSize: number) => Math.max(160, viewportSize)

export function PreviewPane() {
  const { pages, busy } = usePages()

  const type = useStyleStore((s) => s.type)
  const page = useStyleStore((s) => s.page)
  const colors = useStyleStore((s) => s.colors)
  const background = useStyleStore((s) => s.background)
  const footer = useStyleStore((s) => s.footer)
  const style = useMemo<StyleSnapshot>(
    () => ({ type, page, colors, background, footer }),
    [type, page, colors, background, footer],
  )

  const zoom = useUiStore((s) => s.zoom)
  const zoomFit = useUiStore((s) => s.zoomFit)
  const setZoom = useUiStore((s) => s.setZoom)
  const setZoomFit = useUiStore((s) => s.setZoomFit)
  const panelCollapsed = useUiStore((s) => s.panelCollapsed)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState({ w: 0, h: 0 })
  const [grabbing, setGrabbing] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) =>
      setViewport({ w: e.contentRect.width, h: e.contentRect.height }),
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 사이드바가 접히거나 펴지면 미리보기 폭이 크게 달라진다.
  // 그대로 두면 배율이 어정쩡하게 남으므로 화면에 다시 맞춘다.
  const firstLayout = useRef(true)
  useEffect(() => {
    if (firstLayout.current) {
      firstLayout.current = false
      return
    }
    setZoomFit(true)
  }, [panelCollapsed, setZoomFit])

  const paper = getPaper(page.paperId)

  /**
   * 배율 1 기준 콘텐츠 크기.
   *
   * 여백·간격까지 전부 이 안에 넣고 통째로 scale한다.
   * 예전처럼 페이지마다 transform을 걸고 gap에 배율을 곱하면
   * 콘텐츠 좌표가 배율에 비례하지 않아서, 확대할 때마다 화면이 튄다.
   */
  const n = Math.max(1, pages.length)
  const baseW = paper.width + PAD * 2
  const baseH = n * paper.height + (n - 1) * GAP + PAD * 2

  const fitScale = viewport.w > 0 ? Math.min(1.6, viewport.w / baseW) : 1
  const scale = zoomFit ? fitScale : zoom

  /* ── 휠 = 배율. 커서 아래 지점을 붙잡아 둔다 ────────────────── */

  // 배율이 실제로 적용된 뒤에 스크롤을 맞춰야 한다.
  // 값을 여기 담아 두고 useLayoutEffect에서 처리한다.
  const anchor = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null)

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      const el = scrollRef.current
      if (!el) return

      const from = useUiStore.getState().zoomFit ? fitScale : useUiStore.getState().zoom
      // 지수 스케일이라 어느 배율에서든 손끝 감각이 같다
      const to = clampZoom(from * Math.exp(-e.deltaY / 500))
      if (Math.abs(to - from) < 0.0005) return

      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top

      // 여백은 배율과 무관한 상수라 나누기 한 번으로 콘텐츠 좌표가 나온다.
      // ⚠ clientWidth/Height를 쓴다 — getBoundingClientRect는 스크롤바 자리까지
      //   포함해서 렌더에 쓰는 contentRect와 어긋난다.
      anchor.current = {
        x: (el.scrollLeft + cx - padFor(el.clientWidth)) / from,
        y: (el.scrollTop + cy - padFor(el.clientHeight)) / from,
        cx,
        cy,
      }
      setZoom(to)
    },
    [fitScale, setZoom],
  )

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // passive:false 여야 preventDefault가 먹는다 — React onWheel로는 안 된다
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  /** 버튼으로 배율을 바꿀 때는 화면 한가운데를 기준점으로 삼는다 */
  const zoomTo = useCallback(
    (next: number) => {
      const el = scrollRef.current
      if (!el) return
      const to = clampZoom(next)
      const cx = el.clientWidth / 2
      const cy = el.clientHeight / 2
      anchor.current = {
        x: (el.scrollLeft + cx - padFor(el.clientWidth)) / scale,
        y: (el.scrollTop + cy - padFor(el.clientHeight)) / scale,
        cx,
        cy,
      }
      setZoom(to)
    },
    [scale, setZoom],
  )

  // 페인트 전에 스크롤을 맞춰야 한 프레임도 튀지 않는다
  useLayoutEffect(() => {
    const el = scrollRef.current
    const a = anchor.current
    if (!el || !a) return
    anchor.current = null
    el.scrollLeft = a.x * scale + padFor(el.clientWidth) - a.cx
    el.scrollTop = a.y * scale + padFor(el.clientHeight) - a.cy
  }, [scale])

  /* ── 창 크기가 바뀌면 여백만큼 스크롤을 보정한다 ──────────────
     둘레 여백은 뷰포트 폭을 따라간다. 좌우 분할선을 끌어 미리보기 폭이
     바뀌면 여백도 같이 변하는데, 스크롤을 그대로 두면 그 차이만큼
     내용이 옆으로 쓸려 나간다. 차이를 스크롤에 더해 제자리에 붙들어 둔다. */
  const prevPad = useRef<{ x: number; y: number } | null>(null)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const padX = padFor(el.clientWidth)
    const padY = padFor(el.clientHeight)
    const prev = prevPad.current
    prevPad.current = { x: padX, y: padY }

    if (!prev) return // 첫 렌더에는 비교할 이전 값이 없다
    if (zoomFit) return // 맞춤 모드는 아래 recenter가 알아서 잡는다

    el.scrollLeft += padX - prev.x
    el.scrollTop += padY - prev.y
  }, [viewport.w, viewport.h, zoomFit])

  /* ── 화면에 맞추기: 여백 한가운데로 데려온다 ─────────────────
     둘레에 여백을 깔았으므로 스크롤을 맞춰 주지 않으면 빈 곳이 보인다. */
  const recenter = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const padX = padFor(el.clientWidth)
    const padY = padFor(el.clientHeight)
    el.scrollLeft = padX - (el.clientWidth - baseW * scale) / 2
    el.scrollTop = padY - Math.min(PAD * scale, (el.clientHeight - baseH * scale) / 2)
  }, [scale, baseW, baseH])

  const wasFit = useRef(true)
  useLayoutEffect(() => {
    // fit으로 되돌아온 순간과 첫 렌더에만 위치를 다시 잡는다
    if (zoomFit && (!wasFit.current || viewport.w > 0)) recenter()
    wasFit.current = zoomFit
  }, [zoomFit, recenter, viewport.w, viewport.h])

  /* ── 드래그 = 페이지 이동 ─────────────────────────────────── */
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return
    const el = scrollRef.current
    if (!el) return
    drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop }
    el.setPointerCapture(e.pointerId)
    setGrabbing(true)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const el = scrollRef.current
    if (!drag.current || !el) return
    el.scrollLeft = drag.current.left - (e.clientX - drag.current.x)
    el.scrollTop = drag.current.top - (e.clientY - drag.current.y)
  }

  const endDrag = (e: React.PointerEvent) => {
    const el = scrollRef.current
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    drag.current = null
    setGrabbing(false)
  }

  const scaledW = baseW * scale
  const scaledH = baseH * scale
  const padX = padFor(viewport.w)
  const padY = padFor(viewport.h)

  return (
    <div className="relative flex h-full min-w-0 flex-col bg-ui-canvas">
      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="min-h-0 flex-1 overflow-auto"
        style={{
          cursor: grabbing ? 'grabbing' : 'grab',
          touchAction: 'none',
          // 스크롤바가 생겼다 사라지며 뷰포트 폭이 바뀌면 그것만으로도
          // 화면이 옆으로 밀린다. 자리를 항상 잡아 둔다.
          scrollbarGutter: 'stable',
        }}
      >
        {/* 자리를 차지하는 상자 — 콘텐츠 + 둘레 여백이 스크롤 범위가 된다.
            여백이 배율과 무관한 상수라 확대해도 기준점이 밀리지 않는다. */}
        <div
          style={{
            width: scaledW + padX * 2,
            height: scaledH + padY * 2,
          }}
        >
          {/* 실제 내용은 배율 1로 그리고 통째로 축소·확대한다 */}
          <div
            style={{
              width: baseW,
              height: baseH,
              transform: `translate(${padX}px, ${padY}px) scale(${scale})`,
              transformOrigin: '0 0',
              padding: PAD,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: GAP,
              boxSizing: 'border-box',
              userSelect: grabbing ? 'none' : 'auto',
            }}
          >
            {pages.map((p) => (
              <Page key={p.index} page={p} style={style} exportId={`page-${p.index}`} />
            ))}
          </div>
        </div>
      </div>

      {/* 하단 상태 바 */}
      <div className="np-chrome absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t border-ui-border bg-ui-surface/92 px-3 py-1.5 backdrop-blur">
        <div className="flex items-center gap-2 text-ui-text-dim">
          <span
            className="transition-opacity duration-200"
            style={{ opacity: busy ? 1 : 0 }}
            title="다시 조판하는 중"
          >
            <IconTruck size={14} />
          </span>
          <span className="text-[12px] tabular-nums">{pages.length}쪽</span>
          <span className="text-[12px]">
            {paper.label} · {Math.round(paper.width * paper.exportScale)}×
            {Math.round(paper.height * paper.exportScale)}px
          </span>
          <span className="hidden text-[11px] opacity-70 lg:inline">휠로 확대 · 끌어서 이동</span>
        </div>

        <div className="flex items-center gap-1">
          <IconBtn label="축소" onClick={() => zoomTo(scale - 0.1)}>
            <Minus size={13} />
          </IconBtn>
          <button
            onClick={() => zoomTo(1)}
            className="min-w-[52px] rounded-ui px-1.5 py-1 text-[12px] tabular-nums text-ui-text-dim hover:bg-ui-surface-2 hover:text-ui-text"
            title="실제 크기(100%)로"
          >
            {Math.round(scale * 100)}%
          </button>
          <IconBtn label="확대" onClick={() => zoomTo(scale + 0.1)}>
            <Plus size={13} />
          </IconBtn>
          <IconBtn label="화면에 맞추기" onClick={() => setZoomFit(true)}>
            <Maximize2 size={12} />
          </IconBtn>
        </div>
      </div>
    </div>
  )
}

function IconBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid h-6 w-6 place-items-center rounded-ui text-ui-text-dim hover:bg-ui-surface-2 hover:text-ui-text"
    >
      {children}
    </button>
  )
}
