import { useEffect, useRef, useState } from 'react'
import { Check, Download, Save, Trash2, Upload } from 'lucide-react'
import type { UiTheme } from '@/types'
import { useStyleStore } from '@/store/styleStore'
import { useUiStore } from '@/store/uiStore'
import { TYPE_PRESETS, presetSnapshot } from '@/theme/typePresets'
import {
  deleteUserTheme,
  exportThemeFile,
  importThemeFile,
  listUserThemes,
  saveUserTheme,
  type UserTheme,
} from '@/theme/userThemes'
import { ColorBox, Row, Section } from '@/ui/Control'
import { deriveUiVars, type CustomUiTheme } from '@/theme/uiCustom'

const UI_THEMES: { id: UiTheme; label: string; swatch: string[] }[] = [
  { id: 'unha', label: '운하', swatch: ['#ffffff', '#d8e8fb', '#1668d8'] },
  { id: 'unha-night', label: '운하 밤', swatch: ['#0b0f14', '#16283a', '#6cb6ff'] },
  { id: 'sky', label: '하늘', swatch: ['#f4fafe', '#bfe2f2', '#0a7ea4'] },
  { id: 'ink', label: '먹', swatch: ['#000000', '#1a1a1a', '#ffffff'] },
]

const CUSTOM_FIELDS: { key: keyof CustomUiTheme; label: string }[] = [
  { key: 'bg', label: '바탕' },
  { key: 'surface', label: '패널' },
  { key: 'text', label: '글자' },
  { key: 'accent', label: '강조' },
  { key: 'border', label: '경계선' },
]

export function ThemePanel() {
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const custom = useUiStore((s) => s.custom)
  const setCustom = useUiStore((s) => s.setCustom)
  const presetId = useStyleStore((s) => s.presetId)
  const applySnapshot = useStyleStore((s) => s.applySnapshot)
  const snapshot = useStyleStore((s) => s.snapshot)

  const [userThemes, setUserThemes] = useState<UserTheme[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void listUserThemes().then(setUserThemes)
  }, [])

  const onSave = async () => {
    setUserThemes(await saveUserTheme(name, snapshot()))
    setName('')
  }

  const onImport = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    try {
      const { snapshot: s } = await importThemeFile(file)
      applySnapshot(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : '파일을 읽지 못했습니다.')
    }
  }

  return (
    <>
      <Section title="앱 화면 테마">
        <p className="-mt-1 mb-1 text-[11px] leading-relaxed text-ui-text-dim">
          편집 화면의 색만 바꿉니다. 오른쪽 결과물에는 영향을 주지 않습니다.
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {UI_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={[
                'flex items-center gap-2 rounded-ui border px-2 py-1.5 text-[12px] transition-colors',
                theme === t.id
                  ? 'border-ui-accent bg-ui-accent-soft text-ui-text'
                  : 'border-ui-border text-ui-text-dim hover:border-ui-border-strong',
              ].join(' ')}
            >
              <span className="flex overflow-hidden rounded-[2px] border border-ui-border">
                {t.swatch.map((c) => (
                  <span key={c} style={{ background: c }} className="h-3.5 w-2.5" />
                ))}
              </span>
              {t.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setTheme('custom')}
            className={[
              'col-span-2 flex items-center gap-2 rounded-ui border px-2 py-1.5 text-[12px] transition-colors',
              theme === 'custom'
                ? 'border-ui-accent bg-ui-accent-soft text-ui-text'
                : 'border-ui-border text-ui-text-dim hover:border-ui-border-strong',
            ].join(' ')}
          >
            <span className="flex overflow-hidden rounded-[2px] border border-ui-border">
              {[custom.bg, custom.surface, custom.accent].map((c, i) => (
                <span key={i} style={{ background: c }} className="h-3.5 w-2.5" />
              ))}
            </span>
            내가 만든 테마
          </button>
        </div>

        {theme === 'custom' && (
          <div className="mt-2 flex flex-col gap-1.5 rounded-ui border border-ui-border p-2">
            {CUSTOM_FIELDS.map((f) => (
              <Row key={f.key} label={f.label}>
                <ColorBox
                  value={custom[f.key]}
                  onChange={(v) => setCustom({ [f.key]: v } as Partial<CustomUiTheme>)}
                />
              </Row>
            ))}

            {/* 나머지 색은 이 다섯 가지에서 계산된다 — 무엇이 만들어졌는지 보여준다 */}
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <span className="text-[11px] text-ui-text-dim">자동 생성</span>
              {Object.entries(deriveUiVars(custom))
                .filter(([k]) => !['--ui-bg', '--ui-surface', '--ui-text', '--ui-accent', '--ui-border'].includes(k))
                .map(([k, v]) => (
                  <span
                    key={k}
                    title={`${k.replace('--ui-', '')} ${v}`}
                    style={{ background: v }}
                    className="h-4 w-4 rounded-[2px] border border-ui-border"
                  />
                ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="조판 프리셋">
        <div className="flex flex-col gap-1">
          {TYPE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applySnapshot(presetSnapshot(p.id), p.id)}
              className={[
                'rounded-ui border px-2 py-1.5 text-left transition-colors',
                presetId === p.id
                  ? 'border-ui-accent bg-ui-accent-soft'
                  : 'border-ui-border hover:border-ui-border-strong',
              ].join(' ')}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-medium text-ui-text">{p.label}</span>
                {presetId === p.id && <Check size={11} className="text-ui-accent" />}
              </div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="내 테마">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={name}
            placeholder="지금 설정을 저장할 이름"
            onChange={(e) => setName(e.target.value)}
            className="h-[30px] w-full min-w-0 rounded-ui border border-ui-border bg-ui-bg px-1.5 text-[12px] text-ui-text placeholder:text-ui-text-dim/60"
          />
          <button
            type="button"
            title="현재 설정 저장"
            onClick={() => void onSave()}
            className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-ui border border-ui-border text-ui-text-dim hover:text-ui-text"
          >
            <Save size={12} />
          </button>
        </div>

        {userThemes.length > 0 && (
          <div className="mt-1 flex flex-col gap-1">
            {userThemes.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-1 rounded-ui border border-ui-border px-1.5 py-1"
              >
                <button
                  type="button"
                  onClick={() => applySnapshot(t.snapshot)}
                  className="min-w-0 flex-1 truncate text-left text-[12px] text-ui-text hover:text-ui-accent"
                >
                  {t.label}
                </button>
                <button
                  type="button"
                  title="파일로 내보내기"
                  onClick={() => exportThemeFile(t.label, t.snapshot)}
                  className="grid h-5 w-5 place-items-center rounded-[2px] text-ui-text-dim hover:text-ui-text"
                >
                  <Download size={11} />
                </button>
                <button
                  type="button"
                  title="삭제"
                  onClick={() => void deleteUserTheme(t.id).then(setUserThemes)}
                  className="grid h-5 w-5 place-items-center rounded-[2px] text-ui-text-dim hover:text-ui-danger"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            void onImport(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mt-1 flex h-[30px] items-center justify-center gap-1.5 rounded-ui border border-ui-border text-[12px] text-ui-text-dim hover:text-ui-text"
        >
          <Upload size={12} />
          테마 파일 불러오기
        </button>
        {error && <p className="text-[11px] text-ui-danger">{error}</p>}
        <p className="text-[11px] leading-relaxed text-ui-text-dim">
          배경 이미지는 이 브라우저에만 저장되므로 테마 파일에는 담기지 않습니다.
        </p>
      </Section>
    </>
  )
}
