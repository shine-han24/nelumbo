import { useEffect, useRef, useState, type ReactNode } from 'react'

/* 조판 도구는 컨트롤 밀도가 높아야 한다. 여백을 넉넉히 주면
   설정을 찾느라 스크롤만 하게 된다. 행 높이 26px 기준으로 맞춘다. */

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-ui-border px-3 py-2.5">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ui-text-dim">
        {title}
      </h3>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  )
}

/**
 * ⚠ <label>이 아니라 role="group"이다.
 *
 * 한 줄에 슬라이더와 숫자 입력이 함께 들어가는데, <label>은 안에 있는
 * 첫 번째 컨트롤에만 연결된다. 그래서 숫자 칸을 클릭해도 포커스가
 * 슬라이더로 끌려가 값을 입력할 수 없었다.
 */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-[68px_1fr] items-center gap-2">
      <span className="truncate text-[12px] text-ui-text-dim">{label}</span>
      <div className="flex min-w-0 items-center gap-1.5">{children}</div>
    </div>
  )
}

/**
 * 슬라이더 + 직접 입력.
 *
 * 조판에서는 "행간 1.85" 처럼 정확한 값을 넣어야 할 때가 많다.
 * 드래그로만 맞추게 하면 원하는 수치에 절대 닿지 못한다.
 * 그래서 오른쪽 칸은 읽기 전용 표시가 아니라 입력 가능한 필드다.
 * 슬라이더 범위 밖의 값도 hardMin/hardMax 안에서는 받아들인다.
 */
export function Slider({
  value,
  min,
  max,
  step = 1,
  suffix = '',
  precision = 0,
  hardMin,
  hardMax,
  onChange,
}: {
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  precision?: number
  /** 직접 입력으로 허용할 하한 (기본: min) */
  hardMin?: number
  /** 직접 입력으로 허용할 상한 (기본: max × 4) */
  hardMax?: number
  onChange: (v: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [seen, setSeen] = useState(value)
  const lo = hardMin ?? min
  const hi = hardMax ?? max * 4

  // 바깥에서 값이 바뀌면(프리셋 적용 등) 편집 중이던 초안은 버린다.
  // effect가 아니라 렌더 중에 맞추는 편이 한 번의 재렌더로 끝난다.
  if (seen !== value) {
    setSeen(value)
    setDraft(null)
  }

  const clamp = (n: number) => Math.min(hi, Math.max(lo, n))

  const commit = (raw: string) => {
    const n = Number(raw.replace(/[^\d.-]/g, ''))
    setDraft(null)
    if (!Number.isFinite(n)) return
    onChange(clamp(n))
  }

  /** 화살표·방향키 공용 증감. big이면 열 배씩. */
  const nudge = (dir: 1 | -1, big = false) => {
    const d = dir * step * (big ? 10 : 1)
    // 부동소수 누적 오차로 1.8500000000000003 같은 값이 나오는 걸 막는다
    onChange(clamp(Number((value + d).toFixed(4))))
  }

  return (
    <>
      <input
        type="range"
        aria-label="슬라이더로 조절"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => onChange(Number(e.target.value))}
        className="np-range min-w-0 flex-1"
      />
      {/* 단위는 입력칸 위에 겹치지 않는다. 겹쳐 놓으면 자릿수가 늘 때마다
          숫자가 단위에 부딪혀 흔들려 보인다. 칸 밖에 고정 폭으로 둔다. */}
      <span className="flex shrink-0 items-center gap-[3px]">
        <span className="flex items-stretch">
          <input
            type="text"
            inputMode="decimal"
            aria-label="값 직접 입력"
            value={draft ?? value.toFixed(precision)}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') setDraft(null)
              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault()
                nudge(e.key === 'ArrowUp' ? 1 : -1, e.shiftKey)
              }
            }}
            className="h-[28px] w-[50px] rounded-l-ui border border-r-0 border-ui-border bg-ui-bg px-1.5 text-right text-[13px] tabular-nums text-ui-text focus:border-ui-accent"
          />

          {/* 세세한 조정용 화살표. Shift를 누르면 10배씩 움직인다. */}
          <span className="flex w-[15px] flex-col overflow-hidden rounded-r-ui border border-ui-border">
            <Stepper dir={1} onNudge={nudge} />
            <span className="h-px bg-ui-border" />
            <Stepper dir={-1} onNudge={nudge} />
          </span>
        </span>

        <span className="w-[16px] shrink-0 text-[10px] leading-none text-ui-text-dim">
          {suffix}
        </span>
      </span>
    </>
  )
}

/**
 * 값 증감 버튼.
 * 누르고 있으면 계속 올라가도록 반복을 넣었다 — 행간을 0.05씩 옮길 때
 * 스무 번 클릭하게 두면 화살표를 만든 의미가 없다.
 */
function Stepper({
  dir,
  onNudge,
}: {
  dir: 1 | -1
  onNudge: (dir: 1 | -1, big: boolean) => void
}) {
  const timers = useRef<{ delay?: ReturnType<typeof setTimeout>; tick?: ReturnType<typeof setInterval> }>({})

  const stop = () => {
    clearTimeout(timers.current.delay)
    clearInterval(timers.current.tick)
    timers.current = {}
  }

  const start = (e: React.PointerEvent) => {
    // 입력칸의 포커스를 뺏지 않는다
    e.preventDefault()
    const big = e.shiftKey
    onNudge(dir, big)
    timers.current.delay = setTimeout(() => {
      timers.current.tick = setInterval(() => onNudge(dir, big), 55)
    }, 380)
  }

  useEffect(() => stop, [])

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={dir === 1 ? '값 올리기' : '값 내리기'}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      className="grid flex-1 place-items-center bg-ui-bg text-ui-text-dim hover:bg-ui-surface-2 hover:text-ui-text active:bg-ui-accent-soft"
    >
      <svg width="7" height="4" viewBox="0 0 7 4" fill="none" aria-hidden="true">
        <path
          d={dir === 1 ? 'M1 3.2 3.5 0.8 6 3.2' : 'M1 0.8 3.5 3.2 6 0.8'}
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

export function NumberBox({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-[30px] w-full rounded-ui border border-ui-border bg-ui-bg px-1.5 text-[12px] tabular-nums text-ui-text"
    />
  )
}

/**
 * 드롭다운.
 *
 * 네이티브 <select>는 OS가 그리기 때문에 앱 테마와 따로 논다 — 특히 어두운
 * 테마에서 목록만 흰 창으로 튄다. 그래서 버튼 + 목록으로 직접 만들었다.
 * 키보드(↑↓ Home End Enter Esc)와 타입어헤드는 유지한다.
 */
export function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string; group?: string }[]
  onChange: (v: T) => void
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const current = options.find((o) => o.value === value)
  const groups = [...new Set(options.map((o) => o.group))]

  useEffect(() => {
    if (!open) return
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, options, value])

  // 열렸을 때 선택된 항목이 보이도록
  useEffect(() => {
    if (!open) return
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const commit = (v: T) => {
    onChange(v)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault()
      setOpen(true)
      return
    }
    if (!open) return

    if (e.key === 'Escape') return setOpen(false)
    if (e.key === 'Enter') {
      e.preventDefault()
      return commit(options[active].value)
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const d = e.key === 'ArrowDown' ? 1 : -1
      return setActive((i) => (i + d + options.length) % options.length)
    }
    if (e.key === 'Home') return setActive(0)
    if (e.key === 'End') return setActive(options.length - 1)

    // 타입어헤드
    if (e.key.length === 1) {
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()))
      if (i >= 0) setActive(i)
    }
  }

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className={[
          'np-field flex h-[30px] w-full items-center gap-1 rounded-ui border bg-ui-bg px-2 text-left text-[12px] text-ui-text',
          open ? 'border-ui-accent' : 'border-ui-border hover:border-ui-border-strong',
        ].join(' ')}
      >
        <span className="min-w-0 flex-1 truncate">{current?.label ?? ''}</span>
        <svg
          width="9"
          height="6"
          viewBox="0 0 9 6"
          fill="none"
          aria-hidden="true"
          className="shrink-0 text-ui-text-dim transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        >
          <path d="M1 1.2 4.5 4.7 8 1.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          className="np-pop absolute left-0 right-0 top-[33px] z-50 max-h-[248px] overflow-y-auto rounded-ui-lg border border-ui-border bg-ui-surface p-1 shadow-[var(--ui-shadow-pop)]"
        >
          {groups.map((g) => (
            <div key={g ?? '-'}>
              {g && (
                <div className="px-2 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ui-text-dim">
                  {g}
                </div>
              )}
              {options
                .filter((o) => o.group === g)
                .map((o) => {
                  const i = options.indexOf(o)
                  return (
                    <div
                      key={o.value}
                      role="option"
                      aria-selected={o.value === value}
                      data-active={i === active}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => commit(o.value)}
                      className={[
                        'flex cursor-pointer items-center gap-1.5 rounded-ui px-2 py-[5px] text-[12px] transition-colors duration-100',
                        i === active ? 'bg-ui-accent-soft text-ui-text' : 'text-ui-text-dim',
                      ].join(' ')}
                    >
                      <span
                        className="h-[5px] w-[5px] shrink-0 rounded-full transition-opacity"
                        style={{
                          background: 'var(--ui-accent)',
                          opacity: o.value === value ? 1 : 0,
                        }}
                      />
                      <span className="truncate">{o.label}</span>
                    </div>
                  )
                })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: ReactNode; title?: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex min-w-0 flex-1 rounded-ui border border-ui-border bg-ui-bg p-[2px]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          onClick={() => onChange(o.value)}
          className={[
            'grid h-[23px] flex-1 place-items-center rounded-[2px] text-[12px] transition-colors',
            value === o.value
              ? 'bg-ui-accent text-ui-accent-text'
              : 'text-ui-text-dim hover:text-ui-text',
          ].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ColorBox({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="np-color h-[30px] w-[30px] shrink-0 cursor-pointer rounded-ui border border-ui-border bg-transparent p-[2px]"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="h-[30px] w-full min-w-0 rounded-ui border border-ui-border bg-ui-bg px-1.5 font-mono text-[12px] uppercase text-ui-text"
      />
    </>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-0.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="np-check"
      />
      <span className="text-[12px] text-ui-text">{label}</span>
    </label>
  )
}

export function TextBox({
  value,
  placeholder,
  onChange,
}: {
  value: string
  placeholder?: string
  onChange: (v: string) => void
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-[30px] w-full min-w-0 rounded-ui border border-ui-border bg-ui-bg px-1.5 text-[12px] text-ui-text placeholder:text-ui-text-dim/60"
    />
  )
}
