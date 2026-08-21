import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { FoundIssue } from '@/spell/spellStore'
import { blockPositions, toDocRange } from '../editorRef'

export const spellPluginKey = new PluginKey<DecorationSet>('nelumboSpell')

const SET_ISSUES = 'nelumbo:setSpellIssues'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    spell: {
      setSpellIssues: (issues: FoundIssue[]) => ReturnType
    }
  }
}

/**
 * 맞춤법 지적을 에디터 본문에 물결 밑줄로 표시한다.
 *
 * 데코레이션은 문서 변경에 따라 map()으로 따라 움직인다.
 * 이게 없으면 타이핑하는 순간 밑줄이 원래 자리에 남아 엉뚱한 글자를 가리킨다.
 */
export const SpellDecoration = Extension.create({
  name: 'spellDecoration',

  addCommands() {
    return {
      setSpellIssues:
        (issues) =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(SET_ISSUES, issues))
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: spellPluginKey,

        state: {
          init: () => DecorationSet.empty,

          apply(tr, old) {
            const issues = tr.getMeta(SET_ISSUES) as FoundIssue[] | undefined

            if (issues) {
              const entries = blockPositions(tr.doc)
              const decorations: Decoration[] = []

              for (const issue of issues) {
                const entry = entries[issue.blockIndex]
                if (!entry?.isText) continue

                const { from, to } = toDocRange(entry, issue.start, issue.end)
                if (from < 0 || to > tr.doc.content.size || from >= to) continue

                decorations.push(
                  Decoration.inline(from, to, {
                    class: `np-spell np-spell-${issue.type}`,
                    'data-spell-sig': issue.sig,
                  }),
                )
              }
              return DecorationSet.create(tr.doc, decorations)
            }

            // 문서가 바뀌면 밑줄도 같이 밀린다
            return tr.docChanged ? old.map(tr.mapping, tr.doc) : old
          },
        },

        props: {
          decorations(state) {
            return spellPluginKey.getState(state)
          },
        },
      }),
    ]
  },
})
