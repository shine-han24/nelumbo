import { create } from 'zustand'
import type { Block, DocMeta } from '@/types'

interface DocState {
  /** 에디터 문서를 조판용으로 평탄화한 결과. 미리보기의 유일한 입력. */
  blocks: Block[]
  meta: DocMeta
  setBlocks: (blocks: Block[]) => void
  setMeta: (patch: Partial<DocMeta>) => void
}

export const useDocStore = create<DocState>((set) => ({
  blocks: [],
  meta: { title: '', author: '', publisher: '', sourcePage: '' },
  setBlocks: (blocks) => set({ blocks }),
  setMeta: (patch) => set((s) => ({ meta: { ...s.meta, ...patch } })),
}))

/** 통계 패널용 — 블록에서 바로 뽑는다 */
export function docStats(blocks: Block[]) {
  const text = blocks.map((b) => b.text).join('\n')
  const noSpace = text.replace(/\s/g, '')
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  return {
    chars: text.length,
    charsNoSpace: noSpace.length,
    words,
    blocks: blocks.length,
    // 한국어 성인 평균 묵독 속도 ≈ 분당 500~600자. 보수적으로 500.
    readMinutes: Math.max(1, Math.round(noSpace.length / 500)),
  }
}
