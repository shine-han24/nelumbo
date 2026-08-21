import { useEffect, useRef, useState } from 'react'
import { Check, ClipboardCopy, Download, FileImage, FileText, Images, Loader2, Package } from 'lucide-react'
import type { ImageFormat } from './renderPages'
import {
  copyPageToClipboard,
  exportAllPages,
  exportPdf,
  exportSinglePage,
  exportZip,
} from './exportAll'
import { useStyleStore } from '@/store/styleStore'
import { useDocStore } from '@/store/docStore'
import { getPaper } from '@/layout/paperSizes'

type Status = { kind: 'idle' } | { kind: 'busy'; text: string } | { kind: 'done'; text: string } | { kind: 'error'; text: string }

export function ExportMenu() {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<ImageFormat>('png')
  const [scaleMul, setScaleMul] = useState(1)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const ref = useRef<HTMLDivElement>(null)

  const page = useStyleStore((s) => s.page)
  const colors = useStyleStore((s) => s.colors)
  const title = useDocStore((s) => s.meta.title)

  const paper = getPaper(page.paperId)
  const scale = paper.exportScale * scaleMul

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const job = {
    format,
    scale,
    quality: 0.94,
    background: colors.paperBg,
    docTitle: title || 'nelumbo',
  }

  const run = async (label: string, fn: () => Promise<void>) => {
    setStatus({ kind: 'busy', text: label })
    try {
      await fn()
      setStatus({ kind: 'done', text: '완료' })
      setTimeout(() => setStatus({ kind: 'idle' }), 1800)
    } catch (e) {
      setStatus({ kind: 'error', text: e instanceof Error ? e.message : '실패했습니다' })
      setTimeout(() => setStatus({ kind: 'idle' }), 3500)
    }
  }

  const busy = status.kind === 'busy'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 items-center gap-1.5 rounded-ui bg-ui-accent px-2.5 text-[12px] font-medium text-ui-accent-text hover:opacity-90"
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
        내보내기
      </button>

      {open && (
        <div className="np-pop absolute right-0 top-9 z-50 w-[264px] rounded-ui-lg border border-ui-border bg-ui-surface p-2.5 shadow-[var(--ui-shadow-pop)]">
          <div className="mb-2 grid grid-cols-[52px_1fr] items-center gap-2">
            <span className="text-[12px] text-ui-text-dim">형식</span>
            <div className="flex rounded-ui border border-ui-border bg-ui-bg p-[2px]">
              {(['png', 'jpeg', 'webp'] as ImageFormat[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={[
                    'h-[23px] flex-1 rounded-[2px] text-[12px] uppercase',
                    format === f ? 'bg-ui-accent text-ui-accent-text' : 'text-ui-text-dim',
                  ].join(' ')}
                >
                  {f === 'jpeg' ? 'jpg' : f}
                </button>
              ))}
            </div>

            <span className="text-[12px] text-ui-text-dim">해상도</span>
            <div className="flex rounded-ui border border-ui-border bg-ui-bg p-[2px]">
              {[0.5, 1, 1.5].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setScaleMul(m)}
                  className={[
                    'h-[23px] flex-1 rounded-[2px] text-[12px]',
                    scaleMul === m ? 'bg-ui-accent text-ui-accent-text' : 'text-ui-text-dim',
                  ].join(' ')}
                >
                  {(paper.exportScale * m).toFixed(paper.exportScale * m % 1 ? 1 : 0)}×
                </button>
              ))}
            </div>
          </div>

          <p className="mb-2 text-[11px] tabular-nums text-ui-text-dim">
            장당 {Math.round(paper.width * scale)} × {Math.round(paper.height * scale)}px
          </p>

          <div className="flex flex-col gap-1">
            <MenuItem
              icon={<Images size={13} />}
              label="전체 페이지 저장"
              hint="쪽번호를 붙여 낱장으로"
              disabled={busy}
              onClick={() =>
                run('저장 중', () =>
                  exportAllPages(job, (p) =>
                    setStatus({ kind: 'busy', text: `${p.done}/${p.total}쪽` }),
                  ),
                )
              }
            />
            <MenuItem
              icon={<FileImage size={13} />}
              label="첫 페이지만 저장"
              disabled={busy}
              onClick={() => run('저장 중', () => exportSinglePage(job, 0))}
            />
            <MenuItem
              icon={<FileText size={13} />}
              label="PDF 한 파일로"
              disabled={busy}
              onClick={() =>
                run('PDF 만드는 중', () =>
                  exportPdf(job, page.paperId, (p) =>
                    setStatus({ kind: 'busy', text: `${p.done}/${p.total}쪽` }),
                  ),
                )
              }
            />
            <MenuItem
              icon={<ClipboardCopy size={13} />}
              label="첫 페이지 클립보드 복사"
              disabled={busy}
              onClick={() => run('복사 중', () => copyPageToClipboard(job, 0))}
            />
            <MenuItem
              icon={<Package size={13} />}
              label="ZIP으로 묶기"
              hint="장수가 많을 때"
              disabled={busy}
              onClick={() =>
                run('ZIP 만드는 중', () =>
                  exportZip(job, (p) =>
                    setStatus({ kind: 'busy', text: `${p.done}/${p.total}쪽` }),
                  ),
                )
              }
            />
          </div>

          {status.kind !== 'idle' && (
            <div
              className={[
                'mt-2 flex items-center gap-1.5 rounded-ui px-2 py-1.5 text-[11px]',
                status.kind === 'error'
                  ? 'bg-ui-danger/12 text-ui-danger'
                  : 'bg-ui-surface-2 text-ui-text-dim',
              ].join(' ')}
            >
              {status.kind === 'busy' && <Loader2 size={11} className="animate-spin" />}
              {status.kind === 'done' && <Check size={11} />}
              {status.text}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MenuItem({
  icon,
  label,
  hint,
  disabled,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  hint?: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex items-center gap-2 rounded-ui px-2 py-1.5 text-left text-[12px] text-ui-text hover:bg-ui-surface-2 disabled:opacity-40"
    >
      <span className="shrink-0 text-ui-text-dim">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && <span className="shrink-0 text-[10px] text-ui-text-dim">{hint}</span>}
    </button>
  )
}
