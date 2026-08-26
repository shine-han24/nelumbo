import { useEffect } from 'react'
import { AlertTriangle, BookPlus, Check, EyeOff, Loader2, SpellCheck } from 'lucide-react'
import { useDocStore } from '@/store/docStore'
import { useSpellStore } from '@/spell/spellStore'
import { ISSUE_LABEL } from '@/spell/types'
import { applyAll, applyIssue, selectIssue } from '@/spell/applyIssue'
import { getEditor } from '@/editor/editorRef'
import { IconPistol } from '@/ui/icons'
import { Row, Section, Segmented } from '@/ui/Control'

export function SpellPanel() {
  const blocks = useDocStore((s) => s.blocks)
  const {
    remote,
    issues,
    running,
    progress,
    error,
    stale,
    weakOpt,
    probe,
    setWeak,
    run,
    ignore,
    addToDictionary,
    removeIssue,
  } = useSpellStore()

  // 서버에 키가 설정돼 있는지 한 번 물어본다 (빌드타임 플래그가 필요 없다)
  useEffect(() => {
    if (remote === 'unknown') void probe()
  }, [remote, probe])

  // 지적 목록이 바뀌면 에디터 밑줄을 갱신한다
  useEffect(() => {
    getEditor()?.commands.setSpellIssues(issues)
  }, [issues])

  if (remote === 'unknown') {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-[12px] text-ui-text-dim">
        <Loader2 size={14} className="animate-spin" />
        검사기 확인 중
      </div>
    )
  }

  if (remote === 'unconfigured') {
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
        <span className="text-ui-text-dim opacity-70">
          <IconPistol size={34} />
        </span>
        <p className="text-[13px] font-medium text-ui-text">맞춤법 검사기는 준비 중입니다</p>
        <p className="text-[11px] leading-relaxed text-ui-text-dim">
          바른한글 API 연동을 준비하고 있습니다.
          <br />
          연동이 끝나면 이 화면에서 바로 검사할 수 있습니다.
        </p>
      </div>
    )
  }

  const byType = issues.reduce<Record<string, number>>((acc, i) => {
    acc[i.type] = (acc[i.type] ?? 0) + 1
    return acc
  }, {})

  return (
    <>
      <Section title="검사">
        <Row label="규칙">
          <Segmented<'0' | '1'>
            value={String(weakOpt) as '0' | '1'}
            onChange={(v) => setWeak(v === '1' ? 1 : 0)}
            options={[
              { value: '0', label: '강하게', title: '강한 규칙 — 더 많이 잡아냅니다' },
              { value: '1', label: '느슨하게', title: '약한 규칙 — 확실한 것만 잡아냅니다' },
            ]}
          />
        </Row>

        <button
          type="button"
          disabled={running || !blocks.length}
          onClick={() => void run(blocks)}
          className="mt-1 flex h-[34px] items-center justify-center gap-1.5 rounded-ui bg-ui-accent text-[13px] font-medium text-ui-accent-text disabled:opacity-40"
        >
          {running ? <Loader2 size={12} className="animate-spin" /> : <SpellCheck size={12} />}
          {running
            ? progress
              ? `검사 중 ${progress.done}/${progress.total}문단`
              : '검사 중'
            : '맞춤법 검사'}
        </button>

        {running && (
          <p className="text-[12px] leading-relaxed text-ui-text-dim">
            문단 길이에 따라 몇 초씩 걸립니다. 한 번 검사한 문단은 다시 검사하지 않습니다.
          </p>
        )}

        {error && (
          <div className="flex items-start gap-1.5 rounded-ui bg-ui-danger/12 px-2 py-1.5 text-[12px] leading-snug text-ui-danger">
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
              className="ml-auto rounded-ui border border-ui-border px-2 py-1 text-[12px] text-ui-text hover:bg-ui-surface-2"
            >
              모두 적용
            </button>
          </div>
        )}

        {stale && issues.length > 0 && (
          <p className="text-[12px] text-ui-text-dim">
            검사 이후 글이 바뀌었습니다. 다시 검사하면 최신 결과를 볼 수 있습니다.
          </p>
        )}

        {!error && !running && issues.length === 0 && !stale && (
          <p className="text-[12px] text-ui-text-dim">지적할 부분을 찾지 못했습니다.</p>
        )}
      </Section>

      {issues.length > 0 && (
        <div className="flex flex-col">
          {issues.map((issue) => (
            <div
              key={issue.sig}
              className="border-b border-ui-border px-3 py-2.5 hover:bg-ui-surface-2"
            >
              <div className="flex items-baseline gap-1.5">
                <span className="rounded-[3px] bg-ui-accent-soft px-1.5 py-0.5 text-[11px] text-ui-accent">
                  {ISSUE_LABEL[issue.type]}
                </span>
                <button
                  type="button"
                  onClick={() => selectIssue(issue)}
                  className="min-w-0 truncate text-left text-[15px] text-ui-text underline decoration-ui-danger decoration-wavy underline-offset-[3px]"
                  title="본문에서 찾기"
                >
                  {issue.original}
                </button>
              </div>

              {issue.message && (
                <p className="mt-1.5 whitespace-pre-line text-[12px] leading-relaxed text-ui-text-dim">
                  {issue.message}
                </p>
              )}

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
                    className="flex items-center gap-1 rounded-ui bg-ui-accent px-2 py-1 text-[13px] text-ui-accent-text hover:opacity-90"
                  >
                    <Check size={12} />
                    {s}
                  </button>
                ))}
                <button
                  type="button"
                  title="이 지적 무시"
                  onClick={() => ignore(issue.sig)}
                  className="grid h-[26px] w-[26px] place-items-center rounded-ui text-ui-text-dim hover:bg-ui-bg hover:text-ui-text"
                >
                  <EyeOff size={13} />
                </button>
                <button
                  type="button"
                  title="사용자 사전에 추가"
                  onClick={() => addToDictionary(issue.original)}
                  className="grid h-[26px] w-[26px] place-items-center rounded-ui text-ui-text-dim hover:bg-ui-bg hover:text-ui-text"
                >
                  <BookPlus size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="px-3 py-3 text-[12px] leading-relaxed text-ui-text-dim">
        부산대학교 인공지능연구실과 (주)나라인포테크가 만든 바른한글 검사기를 씁니다.
        입력한 글은 검사할 때만 전송되고 저장되지 않습니다.
      </p>
    </>
  )
}
