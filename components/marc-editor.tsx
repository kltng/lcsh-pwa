"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarcEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  className?: string;
}

export function MarcEditor({ value, onChange, className }: MarcEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onChange(trimmed);
    }
    setEditing(false);
  }, [draft, value, onChange]);

  const discard = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      discard();
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      commit();
    }
  }

  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        rows={draft.split("\n").length + 1}
        className={cn(
          "w-full font-mono text-xs bg-muted p-3 rounded border border-ring ring-ring/50 ring-[3px] outline-none resize-y",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn("group relative cursor-pointer", className)}
      onClick={() => setEditing(true)}
    >
      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
        {value}
      </pre>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}
