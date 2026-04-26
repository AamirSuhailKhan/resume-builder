"use client";

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
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Safe debounce internally
  const debouncedUpdate = useCallback((newHtml: string) => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      onChange(newHtml);
    }, 300);
  }, [onChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
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
    onUpdate: ({ editor: e }) => {
      debouncedUpdate(e.getHTML());
    },
  });

  // Safe sync: Only push external value if editor HTML actually differs
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  // Sync editable flag (PDF export mode)
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
        debouncedUpdate(data.improved);
      }
    } catch (e) {
      console.error("[RichEditor] Improve failed:", e);
    } finally {
      setIsImproving(false);
    }
  }, [editor, sectionType, debouncedUpdate]);

  if (!isEditing) {
    return (
      <div
        className={twMerge("prose prose-sm max-w-none text-gray-800", className)}
        dangerouslySetInnerHTML={{ __html: value || "" }}
      />
    );
  }

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
