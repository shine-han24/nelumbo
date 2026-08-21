import { useCallback, useEffect, useRef, useState } from 'react'
import { PanelLeft, X } from 'lucide-react'
import { Editor } from '@/editor/Editor'
import { PreviewPane } from '@/preview/PreviewPane'
import { ExportMenu } from '@/export/ExportMenu'
import { TypographyPanel } from '@/panels/TypographyPanel'
import { PagePanel } from '@/panels/PagePanel'
import { ColorPanel } from '@/panels/ColorPanel'
import { FooterPanel } from '@/panels/FooterPanel'
import { ThemePanel } from '@/panels/ThemePanel'
import { SpellPanel } from '@/panels/SpellPanel'
import {
  IconBlade,
  IconCloud,
  IconGamepad,
  IconLotus,
  IconPistol,
  IconSnow,
  IconSunset,
} from '@/ui/icons'
import { useIsNarrow } from '@/ui/useIsNarrow'
import { useUiStore, type PanelId } from '@/store/uiStore'

const PANELS: { id: PanelId; label: string; icon: React.ReactNode }[] = [
  { id: 'type', label: '글자', icon: <IconBlade size={23} /> },
  { id: 'page', label: '지면', icon: <IconCloud size={23} /> },
  { id: 'color', label: '색·배경', icon: <IconSunset size={23} /> },
  { id: 'footer', label: '출처', icon: <IconGamepad size={23} /> },
  { id: 'theme', label: '테마', icon: <IconSnow size={23} /> },
  { id: 'spell', label: '맞춤법', icon: <IconPistol size={23} /> },
]

/** 좁은 화면에서 미리보기가 눌려 사라지지 않도록 하는 최소 폭 */
const MIN_EDITOR = 280
const MIN_PREVIEW = 320

export default function App() {
  const panel = useUiStore((s) => s.panel)
  const setPanel = useUiStore((s) => s.setPanel)
  const panelCollapsed = useUiStore((s) => s.panelCollapsed)
  const splitRatio = useUiStore((s) => s.splitRatio)
  const setSplitRatio = useUiStore((s) => s.setSplitRatio)

  const narrow = useIsNarrow()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor')

  // 분할 비율은 "설정 패널을 뺀 나머지" 기준이어야 한다.
  // 전체 폭 기준으로 잡으면 창이 좁아질수록 미리보기가 먼저 잡아먹힌다.
  const splitRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging.current || !splitRef.current) return
      const rect = splitRef.current.getBoundingClientRect()
      setSplitRatio((e.clientX - rect.left) / rect.width)
    },
    [setSplitRatio],
  )

  useEffect(() => {
    const stop = () => {
      dragging.current = false
      document.body.style.cursor = ''
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', stop)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', stop)
    }
  }, [onPointerMove])

  // 화면이 넓어지면 서랍은 닫는다 — 열린 채로 남으면 패널이 두 번 보인다
  useEffect(() => {
    if (!narrow) setDrawerOpen(false)
  }, [narrow])

  const panelBody = (
    <div key={panel} className="np-panel-enter min-h-0 flex-1 overflow-y-auto">
      {panel === 'type' && <TypographyPanel />}
      {panel === 'page' && <PagePanel />}
      {panel === 'color' && <ColorPanel />}
      {panel === 'footer' && <FooterPanel />}
      {panel === 'theme' && <ThemePanel />}
      {panel === 'spell' && <SpellPanel />}
    </div>
  )

  const rail = (
    <nav className="np-chrome flex w-[68px] shrink-0 flex-col border-r border-ui-border p-1.5">
      <div className="flex flex-col gap-1">
        {PANELS.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.label}
            onClick={() => setPanel(p.id)}
            aria-expanded={panel === p.id && !panelCollapsed}
            className={[
              'relative flex flex-col items-center gap-1 rounded-ui py-2 text-[12px]',
              panel === p.id && !panelCollapsed
                ? 'bg-ui-accent-soft text-ui-accent'
                : 'text-ui-text-dim hover:bg-ui-surface-2 hover:text-ui-text',
            ].join(' ')}
          >
            {panel === p.id && !panelCollapsed && (
              <span
                className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-ui-accent"
                style={{ animation: 'np-tab-in 160ms var(--np-ease)' }}
              />
            )}
            {p.icon}
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-auto pb-1 pt-4">
        <p className="text-center text-[10px] leading-tight text-ui-text-dim">
          special
          <br />
          thanks to
          <br />
          <span className="font-ui-serif text-[15px] text-ui-accent">雲荷</span>
        </p>
      </div>
    </nav>
  )

  const notice = (
    <p className="shrink-0 border-t border-ui-border px-3 py-2 text-[10px] leading-relaxed text-ui-text-dim">
      비상업적 용도로만 사용하세요. 이 도구와 결과물을 상업적으로 이용하는 것을 금합니다.
    </p>
  )

  return (
    <div className="flex h-full flex-col">
      <header className="np-chrome flex h-11 shrink-0 items-center justify-between gap-2 border-b border-ui-border bg-ui-surface px-3">
        <div className="flex min-w-0 items-center gap-2">
          {narrow && (
            <button
              type="button"
              aria-label="설정 열기"
              onClick={() => setDrawerOpen(true)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-ui text-ui-text-dim hover:bg-ui-surface-2 hover:text-ui-text"
            >
              <PanelLeft size={17} />
            </button>
          )}
          <span className="shrink-0 text-ui-accent">
            <IconLotus size={20} />
          </span>
          <span className="font-ui-serif text-[15px] font-semibold tracking-tight text-ui-text">
            nelumbo
          </span>
          {!narrow && <span className="text-[12px] text-ui-text-dim">책 발췌 조판기</span>}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {narrow && (
            <div className="flex rounded-ui border border-ui-border bg-ui-bg p-[2px]">
              {(['editor', 'preview'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMobileView(v)}
                  className={[
                    'h-[24px] rounded-[2px] px-2.5 text-[12px]',
                    mobileView === v
                      ? 'bg-ui-accent text-ui-accent-text'
                      : 'text-ui-text-dim hover:text-ui-text',
                  ].join(' ')}
                >
                  {v === 'editor' ? '원고' : '미리보기'}
                </button>
              ))}
            </div>
          )}
          <ExportMenu />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* 넓은 화면: 설정을 왼쪽에 고정 */}
        {!narrow && (
          // 같은 탭을 다시 누르면 목록만 접히고 아이콘 레일은 남는다
          <aside
            className="flex shrink-0 border-r border-ui-border bg-ui-surface transition-[width] duration-150"
            style={{ width: panelCollapsed ? 68 : 398 }}
          >
            {rail}
            {!panelCollapsed && (
              <div className="flex min-w-0 flex-1 flex-col">
                {panelBody}
                {notice}
              </div>
            )}
          </aside>
        )}

        {narrow ? (
          // 좁은 화면: 원고와 미리보기를 버튼으로 전환한다
          <div className="min-h-0 min-w-0 flex-1">
            {mobileView === 'editor' ? <Editor /> : <PreviewPane />}
          </div>
        ) : (
          <div ref={splitRef} className="flex min-w-0 flex-1">
            <div
              style={{ width: `${splitRatio * 100}%`, minWidth: MIN_EDITOR }}
              className="min-w-0"
            >
              <Editor />
            </div>

            <div
              role="separator"
              aria-orientation="vertical"
              onPointerDown={() => {
                dragging.current = true
                document.body.style.cursor = 'col-resize'
              }}
              className="w-[3px] shrink-0 cursor-col-resize bg-ui-border transition-colors hover:bg-ui-accent"
            />

            <div className="min-w-0 flex-1" style={{ minWidth: MIN_PREVIEW }}>
              <PreviewPane />
            </div>
          </div>
        )}
      </div>

      {/* 좁은 화면의 설정 서랍 */}
      {narrow && drawerOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div
            className="np-fade-in absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="np-drawer-in relative flex h-full w-[min(398px,92vw)] flex-col border-r border-ui-border bg-ui-surface shadow-[var(--ui-shadow-pop)]">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-ui-border px-3">
              <span className="text-[13px] font-medium text-ui-text">설정</span>
              <button
                type="button"
                aria-label="설정 닫기"
                onClick={() => setDrawerOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-ui text-ui-text-dim hover:bg-ui-surface-2 hover:text-ui-text"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex min-h-0 flex-1">
              {rail}
              <div className="flex min-w-0 flex-1 flex-col">
                {panelBody}
                {notice}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
