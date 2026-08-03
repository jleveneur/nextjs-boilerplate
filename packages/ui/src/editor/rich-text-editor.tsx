"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

export type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  editable?: boolean;
  /** Accessible name for the contenteditable surface. */
  "aria-label"?: string;
};

export function RichTextEditor({
  value,
  onChange,
  className,
  editable = true,
  "aria-label": ariaLabel = "Rich text editor",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editable,
    editorProps: {
      attributes: {
        "aria-label": ariaLabel,
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML());
    },
  });

  if (editor === null) {
    return <div className={cn("bg-muted h-32 animate-pulse rounded-md", className)} />;
  }

  return (
    <div className={cn("border-border flex flex-col gap-2 rounded-md border", className)}>
      {editable ? (
        <div className="border-border flex flex-wrap gap-1 border-b p-2">
          <Button
            type="button"
            size="sm"
            variant={editor.isActive("bold") ? "default" : "outline"}
            onClick={() => {
              editor.chain().focus().toggleBold().run();
            }}
          >
            Bold
          </Button>
          <Button
            type="button"
            size="sm"
            variant={editor.isActive("italic") ? "default" : "outline"}
            onClick={() => {
              editor.chain().focus().toggleItalic().run();
            }}
          >
            Italic
          </Button>
          <Button
            type="button"
            size="sm"
            variant={editor.isActive("bulletList") ? "default" : "outline"}
            onClick={() => {
              editor.chain().focus().toggleBulletList().run();
            }}
          >
            List
          </Button>
        </div>
      ) : null}
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none px-3 py-2 focus:outline-none"
      />
    </div>
  );
}
