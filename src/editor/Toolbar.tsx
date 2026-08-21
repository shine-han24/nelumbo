import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react'

export function Toolbar({ editor }: { editor: Editor | null }) {
  // Tiptap 3: 셀렉션이 바뀔 때만 다시 그리도록 상태를 구독한다.
  // 이게 없으면 버튼의 활성 표시가 갱신되지 않는다.
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive('bold'),
            italic: e.isActive('italic'),
            underline: e.isActive('underline'),
            strike: e.isActive('strike'),
            quote: e.isActive('blockquote'),
            h1: e.isActive('heading', { level: 1 }),
            h2: e.isActive('heading', { level: 2 }),
            h3: e.isActive('heading', { level: 3 }),
            left: e.isActive({ textAlign: 'left' }),
            center: e.isActive({ textAlign: 'center' }),
            right: e.isActive({ textAlign: 'right' }),
            justify: e.isActive({ textAlign: 'justify' }),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  })

  if (!editor || !state) {
    return <div className="np-chrome h-9 border-b border-ui-border" />
  }

  const chain = () => editor.chain().focus()

  return (
    <div className="np-chrome flex flex-wrap items-center gap-0.5 border-b border-ui-border px-2 py-1">
      <Btn active={state.bold} label="굵게 (Ctrl+B)" onClick={() => chain().toggleBold().run()}>
        <Bold size={14} />
      </Btn>
      <Btn active={state.italic} label="기울임 (Ctrl+I)" onClick={() => chain().toggleItalic().run()}>
        <Italic size={14} />
      </Btn>
      <Btn
        active={state.underline}
        label="밑줄 (Ctrl+U)"
        onClick={() => chain().toggleUnderline().run()}
      >
        <UnderlineIcon size={14} />
      </Btn>
      <Btn active={state.strike} label="취소선" onClick={() => chain().toggleStrike().run()}>
        <Strikethrough size={14} />
      </Btn>

      <Sep />

      <Btn
        active={state.h1}
        label="큰 제목"
        onClick={() => chain().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 size={14} />
      </Btn>
      <Btn
        active={state.h2}
        label="소제목"
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={14} />
      </Btn>
      <Btn
        active={state.h3}
        label="작은 제목"
        onClick={() => chain().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 size={14} />
      </Btn>
      <Btn active={state.quote} label="인용" onClick={() => chain().toggleBlockquote().run()}>
        <Quote size={14} />
      </Btn>
      <Btn label="구분선" onClick={() => chain().setHorizontalRule().run()}>
        <Minus size={14} />
      </Btn>

      <Sep />

      <Btn
        active={state.left}
        label="왼쪽 정렬"
        onClick={() => chain().setTextAlign('left').run()}
      >
        <AlignLeft size={14} />
      </Btn>
      <Btn
        active={state.center}
        label="가운데 정렬"
        onClick={() => chain().setTextAlign('center').run()}
      >
        <AlignCenter size={14} />
      </Btn>
      <Btn
        active={state.right}
        label="오른쪽 정렬"
        onClick={() => chain().setTextAlign('right').run()}
      >
        <AlignRight size={14} />
      </Btn>
      <Btn
        active={state.justify}
        label="양쪽 정렬"
        onClick={() => chain().setTextAlign('justify').run()}
      >
        <AlignJustify size={14} />
      </Btn>

      <Sep />

      <Btn label="되돌리기" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
        <Undo2 size={14} />
      </Btn>
      <Btn label="다시하기" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
        <Redo2 size={14} />
      </Btn>
    </div>
  )
}

function Btn({
  children,
  label,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={[
        'grid h-7 w-7 place-items-center rounded-ui transition-colors',
        active
          ? 'bg-ui-accent text-ui-accent-text'
          : 'text-ui-text-dim hover:bg-ui-surface-2 hover:text-ui-text',
        disabled ? 'cursor-default opacity-35 hover:bg-transparent' : '',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

const Sep = () => <span className="mx-1 h-4 w-px bg-ui-border" />
