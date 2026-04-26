"use client";

/**
 * RichEditor — TipTap-powered multiline editor.
 *
 * SSR safety rules:
 * 1. `immediatelyRender: false` — prevents TipTap from touching the DOM during SSR.
 * 2. This file is always imported via `next/dynamic({ ssr: false })` from its parent.
 * 3. We guard against null editor before rendering <EditorContent>.
 * 4. External `value` prop is only pushed into the editor when NOT focused, preventing cursor jumps.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, Sparkles } from "lucide-react";
import { twMerge } from "tailwind-merge";

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** When false, renders sanitized HTML only (PDF-safe). */
  isEditing?: boolean;
  className?: string;
  sectionType?: "summary" | "experience_bullet";
}

export function RichEditor({
  value,
  onChange,
  placeholder = "Click to write...",
  isEditing = true,
  className,
  sectionType = "summary",
}: RichEditorProps) {
  const [isImproving, setIsImproving] = useState(false);
  const isFocusedRef = useRef(false);
  const lastExternalValue = useRef(value);

  const editor = useEditor({
    immediatelyRender: false, // ← SSR fix
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-gray-400 before:float-left before:pointer-events-none before:h-0 before:italic",
      }),
    ],
    content: value || "",
    editable: isEditing,
    onFocus: () => {
      isFocusedRef.current = true;
    },
    onBlur: ({ editor: e }) => {
      isFocusedRef.current = false;
      onChange(e.getHTML());
    },
  });

  // Sync external value → editor when not focused (e.g. AI improvement, version restore)
  useEffect(() => {
    if (!editor) return;
    if (isFocusedRef.current) return; // never clobber while user is typing
    if (value === lastExternalValue.current) return; // no-op if value hasn't changed

    lastExternalValue.current = value;
    // setContent without emitting onUpdate to avoid loops
    editor.commands.setContent(value || "");
  }, [value, editor]);

  // Sync editable flag (PDF export)
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(isEditing);
  }, [isEditing, editor]);

  const handleImprove = useCallback(async () => {
    if (!editor) return;
    setIsImproving(true);
    try {
      const res = await fetch("/api/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: sectionType,
          content: editor.getHTML(),
          tone: "professional",
          focus: "impact",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        editor.commands.setContent(data.improved);
        onChange(data.improved);
      }
    } catch (e) {
      console.error("[RichEditor] Improve failed:", e);
    } finally {
      setIsImproving(false);
    }
  }, [editor, sectionType, onChange]);

  // PDF / static mode — render sanitized HTML directly
  if (!isEditing) {
    return (
      <div
        className={twMerge("prose prose-sm max-w-none text-gray-800", className)}
        dangerouslySetInnerHTML={{ __html: value || "" }}
      />
    );
  }

  // Editor not yet mounted (SSR / first frame)
  if (!editor) {
    return (
      <div className={twMerge("h-16 bg-gray-50 animate-pulse rounded-md border border-gray-100", className)} />
    );
  }

  return (
    <>
      <BubbleMenu
        editor={editor}
        className="flex items-center bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-50"
      >
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
          className={twMerge("p-2.5 hover:bg-slate-700 transition-colors", editor.isActive("bold") && "bg-slate-700 text-indigo-300")}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
          className={twMerge("p-2.5 hover:bg-slate-700 transition-colors", editor.isActive("italic") && "bg-slate-700 text-indigo-300")}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
          className={twMerge("p-2.5 hover:bg-slate-700 transition-colors border-r border-slate-700", editor.isActive("bulletList") && "bg-slate-700 text-indigo-300")}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); handleImprove(); }}
          disabled={isImproving}
          className="px-4 py-2.5 hover:bg-slate-700 transition-colors flex items-center gap-1.5 text-sm font-bold text-indigo-300 disabled:opacity-50"
        >
          <Sparkles className={twMerge("h-3.5 w-3.5", isImproving && "animate-spin")} />
          {isImproving ? "Improving..." : "✨ Improve"}
        </button>
      </BubbleMenu>

      <EditorContent
        editor={editor}
        className={twMerge(
          "outline-none cursor-text prose prose-sm max-w-none",
          "[&_.tiptap]:outline-none [&_.tiptap]:min-h-[2rem]",
          "[&_.tiptap]:transition-all [&_.tiptap]:duration-150",
          "[&_.tiptap:hover]:bg-gray-50/80 [&_.tiptap:hover]:rounded-md",
          "[&_.tiptap:focus]:bg-indigo-50/30 [&_.tiptap:focus]:rounded-md [&_.tiptap:focus]:ring-2 [&_.tiptap:focus]:ring-inset [&_.tiptap:focus]:ring-indigo-400/40",
          className
        )}
      />
    </>
  );
}
