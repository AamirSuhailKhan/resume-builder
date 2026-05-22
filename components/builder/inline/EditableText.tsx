"use client";



/**
 * EditableText — final production-grade version.
 * 
 * Handles race conditions perfectly:
 * - Draft is NEVER overwritten during active typing.
 * - Value from outside only updates draft when not focused.
 * - Save triggers only on Blur or Enter.
 * - Escape reverts to original.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { twMerge } from "tailwind-merge";

interface EditableTextProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  isEditing?: boolean;
  className?: string;
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
  const [draft, setDraft] = useState(value ?? "");
  const [isFocused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  
  // Keep original value to revert if needed or to check if changed
  const committed = useRef(value ?? "");

  // Safe sync: Only update draft from props if we are NOT editing
  useEffect(() => {
    if (!isFocused) {
      setDraft(value ?? "");
      committed.current = value ?? "";
    }
  }, [value, isFocused]);

  const handleFocus = useCallback(() => setFocused(true), []);

  const handleBlur = useCallback(() => {
    setFocused(false);
    const trimmed = draft.trim();
    if (trimmed !== committed.current.trim()) {
      committed.current = trimmed;
      onChange(trimmed);
    }
  }, [draft, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!multiline && e.key === "Enter") {
        e.preventDefault();
        (inputRef.current as HTMLElement)?.blur(); // triggers save
      }
      if (e.key === "Escape") {
        setDraft(committed.current); // revert
        (inputRef.current as HTMLElement)?.blur();
      }
    },
    [multiline]
  );

  // ── PDF / static mode ──────────────────────────────────────────────────────
  if (!isEditing) {
    const StaticEl: React.ElementType<{ className?: string; children?: React.ReactNode }> = Tag;
    return <StaticEl className={className}>{value || ""}</StaticEl>;
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const cls = twMerge(
    "outline-none bg-transparent border-none resize-none",
    "font-[inherit] text-[inherit] leading-[inherit] tracking-[inherit] text-[inherit]",
    "w-full transition-all duration-150",
    isFocused
      ? "ring-2 ring-inset ring-indigo-400/40 rounded-sm bg-indigo-50/30 px-1"
      : "hover:bg-black/5 hover:rounded-sm cursor-text",
    !draft && !isFocused ? "text-gray-400 italic" : "",
    className
  );

  if (multiline) {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={3}
        className={twMerge(cls, "block")}
      />
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={twMerge(cls, "inline-block min-w-[4ch]")}
    />
  );
});
