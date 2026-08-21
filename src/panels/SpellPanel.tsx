import { useEffect } from 'react'
import { AlertTriangle, BookPlus, Check, EyeOff, Loader2, SpellCheck } from 'lucide-react'
import { useDocStore } from '@/store/docStore'
import { PROVIDERS, useSpellStore } from '@/spell/spellStore'
import { ISSUE_LABEL } from '@/spell/types'
import { applyAll, applyIssue, selectIssue } from '@/spell/applyIssue'
import { getEditor } from '@/editor/editorRef'
import { IconPistol } from '@/ui/icons'
import { Row, Section, Select } from '@/ui/Control'

export function SpellPanel() {
  const blocks = useDocStore((s) => s.blocks)
  const {
    providerId,
    issues,
    running,
    error,
    stale,
    setProvider,
    run,
    ignore,
    addToDictionary,
    removeIssue,
  } = useSpellStore()

  const provider = PROVIDERS.find((p) => p.id === providerId)

  // 지적 목록이 바뀌면 에디터 밑줄을 갱신한다
  useEffect(() => {
    getEditor()?.commands.setSpellIssues(issues)
  }, [issues])

  const byType = issues.reduce<Record<string, number>>((acc, i) => {
    acc[i.type] = (acc[i.type] ?? 0) + 1
    return acc
  }, {})

  // 쓸 수 있는 검사기가 하나도 없으면 설정을 늘어놓을 이유가 없다.
  // 지금이 무슨 상태인지만 분명히 알려 준다.
  if (!provider?.available()) {
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
        <span className="text-ui-text-dim opacity-70">
          <IconPistol size={34} />
        </span>
        <p className="text-[13px] font-medium text-ui-text">맞춤법 검사기는 준비 중입니다</p>
        <p className="text-[11px] leading-relaxed text-ui-text-dim">
          바른한글((주)나라인포테크) 정식 API 연동을 준비하고 있습니다.
          <br />
          연동이 끝나면 이 화면에서 바로 검사할 수 있습니다.
        </p>
      </div>
    )
  }

  return (
    <>
      <Section title="검사기">
        {PROVIDERS.length > 1 && (
          <Row label="공급자">
            <Select
              value={providerId}
              onChange={setProvider}
              options={PROVIDERS.map((p) => ({
                value: p.id,
                label: p.available() ? p.label : `${p.label} — 준비 중`,
              }))}
            />
          </Row>
        )}

        <button
          type="button"
          disabled={running || !blocks.length}
          onClick={() => void run(blocks)}
          className="mt-1 flex h-[32px] items-center justify-center gap-1.5 rounded-ui bg-ui-accent text-[12px] font-medium text-ui-accent-text disabled:opacity-40"
        >
          {running ? <Loader2 size={12} className="animate-spin" /> : <SpellCheck size={12} />}
          {running ? '검사 중' : '맞춤법 검사'}
        </button>

        {error && (
          <div className="flex items-start gap-1.5 rounded-ui bg-ui-danger/12 px-2 py-1.5 text-[11px] leading-snug text-ui-danger">
            <AlertTriangle size={12} className="mt-px shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!error && !running && issues.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {Object.entries(byType).map(([type, n]) => (
              <span
                key={type}
                className="rounded-[3px] bg-ui-surface-2 px-1.5 py-0.5 text-[11px] text-ui-text-dim"
              >
                {ISSUE_LABEL[type as keyof typeof ISSUE_LABEL]} {n}
              </span>
            ))}
            <button
              type="button"
              onClick={() => {
                const n = applyAll(issues)
                useSpellStore.setState({ issues: [] })
                if (n) useSpellStore.getState().markStale()
              }}
              className="ml-auto rounded-ui border border-ui-border px-1.5 py-0.5 text-[11px] text-ui-text hover:bg-ui-surface-2"
            >
              모두 적용
            </button>
          </div>
        )}

        {stale && issues.length > 0 && (
          <p className="text-[11px] text-ui-text-dim">
            검사 이후 글이 바뀌었습니다. 다시 검사하면 최신 결과를 볼 수 있습니다.
          </p>
        )}

        {!error && !running && issues.length === 0 && !stale && (
          <p className="text-[11px] text-ui-text-dim">
            지적할 부분을 찾지 못했습니다.
          </p>
        )}
      </Section>

      {issues.length > 0 && (
        <div className="flex flex-col">
          {issues.map((issue) => (
            <div
              key={issue.sig}
              className="border-b border-ui-border px-3 py-2 hover:bg-ui-surface-2"
            >
              <div className="flex items-baseline gap-1.5">
                <span className="rounded-[3px] bg-ui-accent-soft px-1 py-px text-[10px] text-ui-accent">
                  {ISSUE_LABEL[issue.type]}
                </span>
                <button
                  type="button"
                  onClick={() => selectIssue(issue)}
                  className="min-w-0 truncate text-left text-[12px] text-ui-text underline decoration-ui-danger decoration-wavy underline-offset-2"
                  title="본문에서 찾기"
                >
                  {issue.original}
                </button>
              </div>

              <p className="mt-1 text-[11px] leading-snug text-ui-text-dim">{issue.message}</p>

              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                {issue.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      if (applyIssue(issue, s)) {
                        removeIssue(issue.sig)
                        useSpellStore.getState().markStale()
                      }
                    }}
                    className="flex items-center gap-1 rounded-ui bg-ui-accent px-1.5 py-0.5 text-[11px] text-ui-accent-text hover:opacity-90"
                  >
                    <Check size={9} />
                    {s}
                  </button>
                ))}
                <button
                  type="button"
                  title="이 지적 무시"
                  onClick={() => ignore(issue.sig)}
                  className="grid h-[22px] w-[22px] place-items-center rounded-ui text-ui-text-dim hover:bg-ui-bg hover:text-ui-text"
                >
                  <EyeOff size={10} />
                </button>
                <button
                  type="button"
                  title="사용자 사전에 추가"
                  onClick={() => addToDictionary(issue.original)}
                  className="grid h-[22px] w-[22px] place-items-center rounded-ui text-ui-text-dim hover:bg-ui-bg hover:text-ui-text"
                >
                  <BookPlus size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="px-3 py-3 text-[11px] leading-relaxed text-ui-text-dim">
        기본 검사기는 형태소 분석 없이 규칙으로만 판단합니다. 문맥이 필요한 오류(로서/로써,
        바람/바램 등)는 잡지 못하니 참고용으로 쓰세요.
      </p>
    </>
  )
}
