"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

interface WYSIWYGEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function WYSIWYGEditor({ content, onChange, placeholder }: WYSIWYGEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder || "Start writing..." }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [editor, content]);

  const ToolBtn = ({ onClick, active, children }: { onClick: () => void; active: boolean; children: React.ReactNode }) => (
    <button
      onClick={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        "p-1.5 rounded transition-colors",
        active ? "bg-saga-100 text-saga-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      )}
      type="button"
    >
      {children}
    </button>
  );

  if (!editor) return <div className="h-[300px] bg-gray-50 rounded-lg animate-pulse" />;

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50 rounded-t-lg flex-wrap">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
          <Bold className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
          <Italic className="w-4 h-4" />
        </ToolBtn>
        <span className="w-px h-5 bg-gray-300 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })}>
          <Heading1 className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>
          <Heading2 className="w-4 h-4" />
        </ToolBtn>
        <span className="w-px h-5 bg-gray-300 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>
          <List className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
          <ListOrdered className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>
          <Quote className="w-4 h-4" />
        </ToolBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
