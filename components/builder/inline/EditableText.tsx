"use client";

/**
 * EditableText — production-grade inline editable text field.
 *
 * Key decisions:
 * - Uses a hidden <input> / <textarea> for actual editing (not contentEditable).
 *   contentEditable fights React's VDOM reconciliation and is extremely hard to
 *   keep stable across re-renders. A transparent input sitting on top of the
 *   display text is more predictable and accessible.
 * - The display element and the input are absolutely stacked so layout never shifts.
 * - Blur → save; Enter (single-line) → blur → save.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { twMerge } from "tailwind-merge";

interface EditableTextProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  /** When false, renders as static text (PDF mode). */
  isEditing?: boolean;
  className?: string;
  /** Wrapper element for the static display text. */
  as?: keyof React.JSX.IntrinsicElements;
  multiline?: boolean;
}

export const EditableText = React.memo(function EditableText({
  value,
  onChange,
  placeholder = "Click to edit",
  isEditing = true,
  className,
  as: Tag = "span",
  multiline = false,
}: EditableTextProps) {
  // Local draft — only synced up on blur/enter, not on every keystroke
  const [draft, setDraft] = useState(value ?? "");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  // Sync incoming value changes only when not actively editing
  useEffect(() => {
    if (!isFocused) {
      setDraft(value ?? "");
    }
  }, [value, isFocused]);

  const handleFocus = useCallback(() => setIsFocused(true), []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    const trimmed = draft.trim();
    if (trimmed !== (value ?? "").trim()) {
      onChange(trimmed);
    }
  }, [draft, value, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!multiline && e.key === "Enter") {
        e.preventDefault();
        inputRef.current?.blur();
      }
      if (e.key === "Escape") {
        setDraft(value ?? ""); // revert
        inputRef.current?.blur();
      }
    },
    [multiline, value]
  );

  // PDF / static mode — render plain element, no interactive layer
  if (!isEditing) {
    const StaticTag = Tag as any;
    return <StaticTag className={className}>{value}</StaticTag>;
  }

  const isEmpty = !draft;
  const sharedClasses = twMerge(
    "outline-none bg-transparent w-full resize-none",
    "transition-all duration-150",
    isFocused
      ? "ring-2 ring-inset ring-indigo-400/50 rounded bg-indigo-50/40"
      : "hover:bg-gray-100/60 hover:rounded cursor-text",
    isEmpty && !isFocused && "text-gray-400 italic",
    className
  );

  if (multiline) {
    return (
      <textarea
        ref={inputRef}
        value={isFocused ? draft : draft || placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={3}
        className={twMerge(sharedClasses, "block")}
        style={{ fontFamily: "inherit", fontSize: "inherit", fontWeight: "inherit", color: "inherit" }}
      />
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={isFocused ? draft : draft || placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={twMerge(sharedClasses, "inline-block min-w-[60px]")}
      style={{ fontFamily: "inherit", fontSize: "inherit", fontWeight: "inherit", color: "inherit" }}
    />
  );
});
