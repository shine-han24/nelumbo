import { Extension } from '@tiptap/core'
import { Fragment, Slice } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { cleanPastedText, type CleanOptions } from '../cleanText'

export interface PasteCleanupOptions {
  getOptions: () => CleanOptions & { enabled: boolean }
}

/**
 * 평문 붙여넣기를 가로채 정리한 뒤 문단으로 나눠 넣는다.
 * 서식이 실린 HTML 붙여넣기는 건드리지 않는다 — 사용자가 의도한 서식일 수 있다.
 */
export const PasteCleanup = Extension.create<PasteCleanupOptions>({
  name: 'pasteCleanup',

  addOptions() {
    return {
      getOptions: () => ({
        enabled: true,
        mergeSoftWraps: true,
        dropPageNumbers: true,
        smartTypography: true,
      }),
    }
  },

  addProseMirrorPlugins() {
    const getOptions = this.options.getOptions

    return [
      new Plugin({
        key: new PluginKey('nelumboPasteCleanup'),
        props: {
          handlePaste(view, event) {
            const opts = getOptions()
            if (!opts.enabled) return false

            const text = event.clipboardData?.getData('text/plain')
            const html = event.clipboardData?.getData('text/html')
            if (!text || html) return false

            const cleaned = cleanPastedText(text, opts)
            if (!cleaned) return false

            const { schema } = view.state
            const paragraphs = cleaned.split(/\n{2,}/)

            const nodes = paragraphs.map((para) => {
              const lines = para.split('\n')
              const content = lines.flatMap((line, i) => {
                const parts = []
                // 문단 안의 단일 개행은 강제 줄바꿈으로 살린다
                if (i > 0) parts.push(schema.nodes.hardBreak.create())
                if (line) parts.push(schema.text(line))
                return parts
              })
              return schema.nodes.paragraph.create(null, content)
            })

            // openStart/openEnd = 1 이라야 첫·마지막 문단이 커서 위치의
            // 문단과 자연스럽게 이어붙는다 (일반적인 붙여넣기 동작).
            const slice = new Slice(Fragment.fromArray(nodes), 1, 1)
            view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView())
            return true
          },
        },
      }),
    ]
  },
})
