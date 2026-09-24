import React, { useEffect, useMemo, useRef, useState } from "react";
import { useProject } from "../store/ProjectContext";
import { wordCount } from "../lib/manifest";

export function Editor() {
  const { state, getContent, setContent, rename } = useProject();
  const activeId = state.ui.activeId;
  const node = activeId ? state.manifest?.nodes[activeId] : null;
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [titleDraft, setTitleDraft] = useState(node?.title ?? "");

  useEffect(() => setTitleDraft(node?.title ?? ""), [node?.id]);

  const text = activeId ? getContent(activeId) : "";
  const words = useMemo(() => wordCount(text), [text]);


  function applyFormat(format: "bold" | "italic") {
    const el = textRef.current;
    if (!el || !activeId) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    
    if (start === end) return; 

    const selected = text.slice(start, end);
    let wrapped = "";

    if (format === "bold") wrapped = `**${selected}**`;
    if (format === "italic") wrapped = `*${selected}*`;

    const newText = text.slice(0, start) + wrapped + text.slice(end);
    setContent(activeId, newText);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start, start + wrapped.length);
    }, 0);
  }

  if (!activeId || !node) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-2 text-ink-faint">
        <QuillIcon />
        <p className="font-display text-lg">No document selected</p>
        <p className="text-sm">Choose a chapter from the binder, or create a new one.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-ink/8 px-6 py-2.5 dark:border-ink-inverse/10">
        <input
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={() => titleDraft.trim() && rename(activeId, titleDraft.trim())}
          onKeyDown={(e) => e.key === "Enter" && textRef.current?.focus()}
          className="min-w-0 flex-1 bg-transparent font-display text-[15px] font-medium text-ink outline-none dark:text-ink-inverse"
        />
        
        {/* Minimalist Formatting Toolbar */}
        <div className="flex items-center gap-1 opacity-60 transition-opacity hover:opacity-100">
          <FormatButton onClick={() => applyFormat("bold")} label="B" className="font-bold" />
          <FormatButton onClick={() => applyFormat("italic")} label="I" className="italic font-serif" />
        </div>
      </div>

      <div className="flex-1 paper-grain">
        <div className="mx-auto h-full max-w-[680px] px-9 sm:px-12">
          <textarea
            ref={textRef}
            value={text}
            onChange={(e) => setContent(activeId, e.target.value)}
            placeholder="Begin writing…"
            spellCheck
            className="scrollbar-quiet h-full w-full resize-none bg-transparent pt-10 pb-[60vh] font-mono text-[14.5px] leading-[1.9] text-ink outline-none placeholder:text-ink-faint dark:text-ink-inverse/90"          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-ink/8 px-6 py-1.5 text-[11px] text-ink-faint dark:border-ink-inverse/10">
        <span className="font-mono">{words.toLocaleString()} words</span>
        {node.wordGoal ? (
          <span className="font-mono">
            {Math.min(100, Math.round((words / node.wordGoal) * 100))}% of {node.wordGoal.toLocaleString()} goal
          </span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

function FormatButton({ onClick, label, className }: { onClick: () => void; label: string; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded text-[13px] text-ink-soft hover:bg-ink/5 hover:text-ink dark:text-ink-inverse/80 dark:hover:bg-ink-inverse/10 dark:hover:text-ink-inverse ${className || ""}`}
    >
      {label}
    </button>
  );
}

function QuillIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M20 4c-6 1-11 6-13 13l-2 3 3-2c7-2 12-7 13-13a1 1 0 0 0-1-1Z" />
      <path d="M9 15 4 20" />
    </svg>
  );
}