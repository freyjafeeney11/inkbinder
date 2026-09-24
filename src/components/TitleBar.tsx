import React, { useEffect, useRef, useState } from "react";
import { useProject } from "../store/ProjectContext";

export function TitleBar({
  bookPreview,
  onToggleBookPreview,
  onExportPdf,
  onExportEpub,
}: {
  bookPreview: boolean;
  onToggleBookPreview: () => void;
  onExportPdf: () => void;
  onExportEpub: () => void;
}) {
  const { state, toggleBinder, toggleInspector, renameProject, closeProject } = useProject();
  const manifest = state.manifest!;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(manifest.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(manifest.title), [manifest.title]);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== manifest.title) renameProject(trimmed);
    else setDraft(manifest.title);
  }

  return (
    <div
      data-tauri-drag-region
      className="flex h-11 shrink-0 items-center justify-between border-b border-ink/8 pl-20 pr-3 dark:border-ink-inverse/10"
    >
      <div className="flex items-center gap-1.5">
        <IconButton title="Back to your stories" onClick={closeProject}>
          <LibraryIcon />
        </IconButton>
        <IconButton title="Toggle binder (⌘1)" active={state.ui.showBinder} onClick={toggleBinder}>
          <BinderIcon />
        </IconButton>
      </div>

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(manifest.title);
              setEditing(false);
            }
          }}
          className="max-w-[50%] rounded border border-signal-amber/60 bg-paper px-2 py-0.5 text-center font-display text-[13px] text-ink outline-none dark:bg-paper-dark dark:text-ink-inverse"
        />
      ) : (
        <button
          title="Click to rename"
          onClick={() => setEditing(true)}
          className="select-none truncate rounded px-2 font-display text-[13px] text-ink-soft hover:bg-ink/5 dark:text-ink-inverse/70 dark:hover:bg-ink-inverse/10"
        >
          {manifest.title}
        </button>
      )}

      <div className="flex items-center gap-1.5">
        <IconButton title="Preview as book" active={bookPreview} onClick={onToggleBookPreview}>
          <BookIcon />
        </IconButton>
        <IconButton title="Toggle inspector (⌘2)" active={state.ui.showInspector} onClick={toggleInspector}>
          <InspectorIcon />
        </IconButton>
        <ExportButton onExportPdf={onExportPdf} onExportEpub={onExportEpub} />
      </div>
    </div>
  );
}

function ExportButton({ onExportPdf, onExportEpub }: { onExportPdf: () => void; onExportEpub: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <IconButton title="Export" onClick={() => setOpen((v) => !v)}>
        <ExportIcon />
      </IconButton>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-36 overflow-hidden rounded-md border border-ink/10 bg-paper shadow-card dark:border-ink-inverse/15 dark:bg-paper-dark">
            <button
              onClick={() => {
                setOpen(false);
                onExportPdf();
              }}
              className="block w-full px-3 py-2 text-left text-[12.5px] text-ink-soft hover:bg-ink/5 dark:text-ink-inverse/80 dark:hover:bg-ink-inverse/10"
            >
              Export as PDF
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onExportEpub();
              }}
              className="block w-full px-3 py-2 text-left text-[12.5px] text-ink-soft hover:bg-ink/5 dark:text-ink-inverse/80 dark:hover:bg-ink-inverse/10"
            >
              Export as EPUB
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function IconButton({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`rounded-md p-1.5 transition-colors ${
        active
          ? "bg-brass-100 text-ink dark:bg-brass-700/50 dark:text-ink-inverse"
          : "text-ink-faint hover:bg-ink/5 hover:text-ink dark:hover:bg-ink-inverse/10 dark:hover:text-ink-inverse"
      }`}
    >
      {children}
    </button>
  );
}

function LibraryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M11 19 4 12l7-7M4 12h16" />
    </svg>
  );
}
function BinderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M9 4v16" />
    </svg>
  );
}
function InspectorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M15 4v16" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 5.5c2-1 5-1 8 0v14c-3-1-6-1-8 0V5.5ZM20 5.5c-2-1-5-1-8 0v14c3-1 6-1 8 0V5.5Z" />
    </svg>
  );
}
function ExportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3v12M7 8l5-5 5 5M5 21h14" />
    </svg>
  );
}