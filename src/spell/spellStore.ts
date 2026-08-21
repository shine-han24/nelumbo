import { create } from 'zustand'
import type { Block } from '@/types'
import type { SpellIssue, SpellProvider } from './types'
import { chunkBySentence } from './types'
import { barunHangulProvider } from './providers/barunhangul'

/**
 * 지금은 바른한글 정식 API 하나만 둔다.
 *
 * 규칙 기반 검사기(localRules)는 형태소 분석을 못 해서 문맥이 필요한 오류를
 * 놓치고, 그걸 "맞춤법 검사"라고 내놓으면 사용자가 결과를 믿어 버린다.
 * 어설픈 검사기보다 "준비 중"이 정직하다. 코드는 남겨 뒀으니 필요하면
 * 이 배열에 다시 넣기만 하면 된다.
 */
export const PROVIDERS: SpellProvider[] = [barunHangulProvider]

export interface FoundIssue extends SpellIssue {
  blockId: string
  blockIndex: number
  /** 무시 목록 대조용 서명 */
  sig: string
}

interface SpellState {
  providerId: string
  issues: FoundIssue[]
  running: boolean
  error: string | null
  /** 마지막 검사 이후 문서가 바뀌었는가 */
  stale: boolean
  ignored: Set<string>
  /** 사용자 사전 — 여기 등록된 표현은 지적하지 않는다 */
  dictionary: Set<string>

  setProvider: (id: string) => void
  run: (blocks: Block[]) => Promise<void>
  markStale: () => void
  ignore: (sig: string) => void
  addToDictionary: (word: string) => void
  removeIssue: (sig: string) => void
  clear: () => void
}

/** 같은 문단의 같은 자리, 같은 표현이면 같은 지적으로 본다 */
const signature = (blockIndex: number, i: SpellIssue) =>
  `${blockIndex}:${i.start}:${i.original}:${i.type}`

// 문단 텍스트 → 결과. 안 바뀐 문단은 다시 검사하지 않는다.
const cache = new Map<string, SpellIssue[]>()

export const useSpellStore = create<SpellState>((set, get) => ({
  providerId: 'barunhangul',
  issues: [],
  running: false,
  error: null,
  stale: false,
  ignored: new Set(),
  dictionary: new Set(),

  setProvider: (providerId) => {
    cache.clear()
    set({ providerId, issues: [], stale: true, error: null })
  },

  markStale: () => {
    if (!get().stale) set({ stale: true })
  },

  ignore: (sig) =>
    set((s) => ({
      ignored: new Set(s.ignored).add(sig),
      issues: s.issues.filter((i) => i.sig !== sig),
    })),

  addToDictionary: (word) =>
    set((s) => ({
      dictionary: new Set(s.dictionary).add(word),
      issues: s.issues.filter((i) => i.original !== word),
    })),

  removeIssue: (sig) => set((s) => ({ issues: s.issues.filter((i) => i.sig !== sig) })),

  clear: () => set({ issues: [], error: null, stale: false }),

  async run(blocks) {
    const { providerId, ignored, dictionary } = get()
    const provider = PROVIDERS.find((p) => p.id === providerId) ?? PROVIDERS[0]

    if (!provider.available()) {
      set({ error: provider.unavailableReason ?? '사용할 수 없는 검사기입니다.', issues: [] })
      return
    }

    set({ running: true, error: null })

    try {
      const found: FoundIssue[] = []

      for (let bi = 0; bi < blocks.length; bi++) {
        const block = blocks[bi]
        if (!block.text.trim()) continue

        const key = `${provider.id}::${block.text}`
        let result = cache.get(key)

        if (!result) {
          result = []
          // 공급자 한도에 맞춰 문장 경계에서 자르고, 오프셋은 원문 기준으로 되돌린다
          for (const chunk of chunkBySentence(block.text, provider.maxChunkChars)) {
            const issues = await provider.check(chunk.text)
            for (const issue of issues) {
              result.push({
                ...issue,
                start: issue.start + chunk.offset,
                end: issue.end + chunk.offset,
              })
            }
          }
          cache.set(key, result)
        }

        for (const issue of result) {
          const sig = signature(bi, issue)
          if (ignored.has(sig) || dictionary.has(issue.original)) continue
          found.push({ ...issue, blockId: block.id, blockIndex: bi, sig })
        }
      }

      set({ issues: found, running: false, stale: false })
    } catch (e) {
      set({
        running: false,
        error: e instanceof Error ? e.message : '검사에 실패했습니다.',
      })
    }
  },
}))
