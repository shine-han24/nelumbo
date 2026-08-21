import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { useDocStore } from '@/store/docStore'
import { useUiStore } from '@/store/uiStore'
import { useSpellStore } from '@/spell/spellStore'
import { loadSession, scheduleSave } from '@/store/autosave'
import { flattenDoc } from './flatten'
import { setEditor } from './editorRef'
import { PasteCleanup } from './extensions/PasteCleanup'
import { SmartTypography } from './extensions/SmartTypography'
import { SpellDecoration } from './extensions/SpellDecoration'
import { Toolbar } from './Toolbar'
import './editor.css'

const PLACEHOLDER = `<p>옮기고 싶은 문장을 여기에 붙여넣으세요.</p>
<p>드래그해서 굵게·기울임·밑줄·취소선을 입히거나 소제목으로 바꿀 수 있습니다. 오른쪽 미리보기는 입력과 동시에 다시 조판됩니다.</p>`

export function Editor() {
  const setBlocks = useDocStore((s) => s.setBlocks)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 발췌 조판에 코드 블록은 쓸 일이 없고, 서식 툴바만 복잡해진다
        codeBlock: false,
        code: false,
        link: false,
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      SmartTypography,
      SpellDecoration,
      PasteCleanup.configure({
        getOptions: () => useUiStore.getState().cleanup,
      }),
    ],
    content: PLACEHOLDER,
    editorProps: {
      attributes: {
        // 브라우저 기본 맞춤법 밑줄은 우리 밑줄과 겹쳐 읽기 어렵다
        class: 'np-editor-content',
        spellcheck: 'false',
        lang: 'ko',
      },
    },
    onUpdate: ({ editor }) => {
      const doc = editor.getJSON()
      setBlocks(flattenDoc(doc))
      useSpellStore.getState().markStale()
      scheduleSave(doc)
    },
  })

  useEffect(() => {
    if (!editor) return
    setEditor(editor)

    // 자동 저장본이 있으면 복구한다 — 탭이 닫혀도 작업이 남아야 한다
    void loadSession().then((saved) => {
      if (saved?.doc) editor.commands.setContent(saved.doc, { emitUpdate: false })
      setBlocks(flattenDoc(editor.getJSON()))
    })

    return () => setEditor(null)
  }, [editor, setBlocks])

  return (
    <div className="flex h-full min-w-0 flex-col border-r border-ui-border bg-ui-surface">
      <Toolbar editor={editor} />
      <div className="min-h-0 flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
