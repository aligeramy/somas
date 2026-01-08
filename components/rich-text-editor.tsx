"use client";

import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconBold,
  IconH1,
  IconH2,
  IconH3,
  IconItalic,
  IconLink,
  IconList,
  IconListNumbers,
  IconStrikethrough,
} from "@tabler/icons-react";
import { Color } from "@tiptap/extension-color";
import { Link } from "@tiptap/extension-link";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your content here...",
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextStyle,
      Color,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[200px] p-4 focus:outline-none",
        "data-placeholder": placeholder,
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="rich-text-editor overflow-hidden rounded-xl border">
      <div className="flex flex-wrap gap-1 border-b bg-muted/50 p-2">
        <Button
          className={`h-8 w-8 p-0 ${editor.isActive("bold") ? "bg-muted" : ""}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          size="sm"
          type="button"
          variant="ghost"
        >
          <IconBold className="h-4 w-4" />
        </Button>
        <Button
          className={`h-8 w-8 p-0 ${editor.isActive("italic") ? "bg-muted" : ""}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          size="sm"
          type="button"
          variant="ghost"
        >
          <IconItalic className="h-4 w-4" />
        </Button>
        <Button
          className={`h-8 w-8 p-0 ${editor.isActive("strike") ? "bg-muted" : ""}`}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          size="sm"
          type="button"
          variant="ghost"
        >
          <IconStrikethrough className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-6 w-px bg-border" />
        <Button
          className={`h-8 w-8 p-0 ${editor.isActive("heading", { level: 1 }) ? "bg-muted" : ""}`}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          size="sm"
          type="button"
          variant="ghost"
        >
          <IconH1 className="h-4 w-4" />
        </Button>
        <Button
          className={`h-8 w-8 p-0 ${editor.isActive("heading", { level: 2 }) ? "bg-muted" : ""}`}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          size="sm"
          type="button"
          variant="ghost"
        >
          <IconH2 className="h-4 w-4" />
        </Button>
        <Button
          className={`h-8 w-8 p-0 ${editor.isActive("heading", { level: 3 }) ? "bg-muted" : ""}`}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          size="sm"
          type="button"
          variant="ghost"
        >
          <IconH3 className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-6 w-px bg-border" />
        <Button
          className={`h-8 w-8 p-0 ${editor.isActive("bulletList") ? "bg-muted" : ""}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          size="sm"
          type="button"
          variant="ghost"
        >
          <IconList className="h-4 w-4" />
        </Button>
        <Button
          className={`h-8 w-8 p-0 ${editor.isActive("orderedList") ? "bg-muted" : ""}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          size="sm"
          type="button"
          variant="ghost"
        >
          <IconListNumbers className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-6 w-px bg-border" />
        <Button
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: "left" }) ? "bg-muted" : ""}`}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          size="sm"
          type="button"
          variant="ghost"
        >
          <IconAlignLeft className="h-4 w-4" />
        </Button>
        <Button
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: "center" }) ? "bg-muted" : ""}`}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          size="sm"
          type="button"
          variant="ghost"
        >
          <IconAlignCenter className="h-4 w-4" />
        </Button>
        <Button
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: "right" }) ? "bg-muted" : ""}`}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          size="sm"
          type="button"
          variant="ghost"
        >
          <IconAlignRight className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-6 w-px bg-border" />
        <Button
          className={`h-8 w-8 p-0 ${editor.isActive("link") ? "bg-muted" : ""}`}
          onClick={() => {
            const url = window.prompt("Enter URL:");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          size="sm"
          type="button"
          variant="ghost"
        >
          <IconLink className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
