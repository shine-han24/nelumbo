import { create } from 'zustand'
import type { Block } from '@/types'
import type { SpellIssue } from './types'
import { chunkBySentence } from './types'
import { barunHangulProvider, probeRemote, setWeakOpt, type WeakOpt } from './providers/barunhangul'

const provider = barunHangulProvider

export interface FoundIssue extends SpellIssue {
  blockId: string
  blockIndex: number
  /** 무시 목록 대조용 서명 */
  sig: string
}

/** 서버에 검사기가 설정돼 있는지 */
export type RemoteState = 'unknown' | 'ready' | 'unconfigured'

interface SpellState {
  remote: RemoteState
  issues: FoundIssue[]
  running: boolean
  /** 진행 상황 — 문단 단위 검사가 몇 초씩 걸려 표시가 필요하다 */
  progress: { done: number; total: number } | null
  error: string | null
  /** 마지막 검사 이후 문서가 바뀌었는가 */
  stale: boolean
  weakOpt: WeakOpt
  ignored: Set<string>
  /** 사용자 사전 — 여기 등록된 표현은 지적하지 않는다 */
  dictionary: Set<string>

  probe: () => Promise<void>
  setWeak: (v: WeakOpt) => void
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
// 문단마다 수 초가 걸리므로 이 캐시가 체감 속도를 좌우한다.
const cache = new Map<string, SpellIssue[]>()

/** 문단 하나를 검사한다 (필요하면 문장 경계에서 잘라 여러 번) */
async function checkBlock(text: string, weakOpt: WeakOpt): Promise<SpellIssue[]> {
  const key = `${weakOpt}::${text}`
  const hit = cache.get(key)
  if (hit) return hit

  const out: SpellIssue[] = []
  for (const chunk of chunkBySentence(text, provider.maxChunkChars)) {
    const issues = await provider.check(chunk.text)
    // 오프셋을 원문 기준으로 되돌린다
    for (const issue of issues) {
      out.push({ ...issue, start: issue.start + chunk.offset, end: issue.end + chunk.offset })
    }
  }
  cache.set(key, out)
  return out
}

/** 동시에 몇 개까지 보낼지 — 상류 API를 몰아치지 않으면서 체감 속도는 확보 */
const CONCURRENCY = 3

export const useSpellStore = create<SpellState>((set, get) => ({
  remote: 'unknown',
  issues: [],
  running: false,
  progress: null,
  error: null,
  stale: false,
  weakOpt: 0,
  ignored: new Set(),
  dictionary: new Set(),

  probe: async () => {
    set({ remote: (await probeRemote()) ? 'ready' : 'unconfigured' })
  },

  setWeak: (weakOpt) => {
    setWeakOpt(weakOpt)
    cache.clear() // 규칙 강도가 바뀌면 이전 결과는 못 쓴다
    set({ weakOpt, issues: [], stale: true })
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

  clear: () => set({ issues: [], error: null, stale: false, progress: null }),

  async run(blocks) {
    const { ignored, dictionary, weakOpt } = get()

    const targets = blocks
      .map((block, index) => ({ block, index }))
      .filter(({ block }) => block.text.trim().length > 0)

    if (targets.length === 0) {
      set({ issues: [], running: false, stale: false, error: null })
      return
    }

    set({ running: true, error: null, progress: { done: 0, total: targets.length } })

    try {
      const results: FoundIssue[][] = new Array(targets.length)
      let done = 0
      let cursor = 0

      // 문단 여러 개를 동시에 보낸다. 순차로 돌리면 문단마다 몇 초씩 쌓여
      // 긴 원고에서 하염없이 기다리게 된다.
      const worker = async () => {
        while (cursor < targets.length) {
          const at = cursor++
          const { block, index } = targets[at]
          const issues = await checkBlock(block.text, weakOpt)

          results[at] = issues
            .map((issue) => ({
              ...issue,
              blockId: block.id,
              blockIndex: index,
              sig: signature(index, issue),
            }))
            .filter((i) => !ignored.has(i.sig) && !dictionary.has(i.original))

          done++
          set({ progress: { done, total: targets.length } })
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker),
      )

      set({
        issues: results.flat().filter(Boolean),
        running: false,
        stale: false,
        progress: null,
      })
    } catch (e) {
      set({
        running: false,
        progress: null,
        error: e instanceof Error ? e.message : '검사에 실패했습니다.',
      })
    }
  },
}))
