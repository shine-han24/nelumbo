import { useEffect, useMemo, useRef, useState } from 'react'
import type { RenderedPage, StyleSnapshot } from '@/types'
import { useDocStore } from '@/store/docStore'
import { useStyleStore } from '@/store/styleStore'
import { ensureFontLoaded } from '@/layout/fonts'
import { measureBlocks } from '@/layout/measure'
import { computeExtents, paginate } from '@/layout/paginate'

const DEBOUNCE_MS = 90

/**
 * 문서 + 조판 설정 → 페이지 배열.
 *
 * 순서가 중요하다: 웹폰트 로드 → 줄 박스 측정 → 페이지 분할.
 * 폰트를 기다리지 않으면 새로고침 직후에만 분할이 어긋나는,
 * 재현이 까다로운 버그가 생긴다.
 */
export function usePages(): { pages: RenderedPage[]; busy: boolean } {
  const blocks = useDocStore((s) => s.blocks)
  const type = useStyleStore((s) => s.type)
  const page = useStyleStore((s) => s.page)
  const colors = useStyleStore((s) => s.colors)
  const background = useStyleStore((s) => s.background)
  const footer = useStyleStore((s) => s.footer)

  const snapshot = useMemo<StyleSnapshot>(
    () => ({ type, page, colors, background, footer }),
    [type, page, colors, background, footer],
  )

  const [pages, setPages] = useState<RenderedPage[]>([])
  const [busy, setBusy] = useState(false)
  const runId = useRef(0)

  // 레이아웃에 영향을 주는 것만 의존성으로 삼는다. 색만 바뀌었을 때
  // 다시 측정하는 것은 순수한 낭비다.
  // footer는 본문 상자 높이를 바꾸므로 반드시 포함해야 한다.
  const layoutKey = useMemo(
    () => JSON.stringify({ type, page, footer }),
    [type, page, footer],
  )

  useEffect(() => {
    const id = ++runId.current
    setBusy(true)

    const timer = setTimeout(async () => {
      await ensureFontLoaded(type.fontId, type.fontSize)
      if (runId.current !== id) return

      const extents = computeExtents(snapshot)
      const metrics = measureBlocks(blocks, snapshot, { extent: extents.lineExtent })
      if (runId.current !== id) return

      setPages(paginate(blocks, metrics, snapshot, extents))
      setBusy(false)
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
    // snapshot은 색 변경으로도 바뀌므로 의존성에서 제외하고 layoutKey를 쓴다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, layoutKey])

  return { pages, busy }
}
