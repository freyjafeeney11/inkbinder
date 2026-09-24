import React, { useState } from "react";
import { useProject } from "../store/ProjectContext";
import { wordCount } from "../lib/manifest";

const STATUS_COLOR: Record<string, string> = {
  todo: "#8A8171",
  draft: "#C1793B",
  revised: "#5C6E4E",
  final: "#8B6A32",
};

interface Props {
  id: string;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  dragId: string | null;
  setDragId: (id: string | null) => void;
  onDrop: (parentId: string, index: number) => void;
  isTrash?: boolean;
}

export function BinderRow({ id, depth, expanded, onToggle, dragId, setDragId, onDrop, isTrash }: Props) {
  const { state, setActive, rename, moveToTrash, restoreFromTrash, deleteForever, getContent } = useProject();
  const manifest = state.manifest!;
  const node = manifest.nodes[id];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node?.title ?? "");
  const [dropAt, setDropAt] = useState<"before" | "after" | "into" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  if (!node) return null;
  const isFolder = node.kind === "folder";
  const isOpen = expanded.has(id);
  const isActive = state.ui.activeId === id;
  const inTrash = node.parentId === manifest.trashId || isTrash;
  const count = node.kind === "document" ? wordCount(getContent(id)) : null;

  function commitRename() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== node.title) rename(id, trimmed);
    else setDraft(node.title);
    setEditing(false);
  }

  return (
    <div>
      <div
        draggable={!isTrash}
        onDragStart={(e) => {
          e.stopPropagation();
          setDragId(id);
        }}
        onDragOver={(e) => {
          if (!dragId || dragId === id) return;
          e.preventDefault();
          e.stopPropagation();
          const rect = (e.target as HTMLElement).closest("[data-row]")?.getBoundingClientRect();
          if (!rect) return;
          const frac = (e.clientY - rect.top) / rect.height;
          if (isFolder && frac > 0.3 && frac < 0.7) setDropAt("into");
          else setDropAt(frac < 0.5 ? "before" : "after");
        }}
        onDragLeave={() => setDropAt(null)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!dragId) return;
          const parent = manifest.nodes[node.parentId ?? ""];
          if (dropAt === "into" && isFolder) {
            onDrop(id, node.children.length);
          } else if (parent) {
            const idx = parent.children.indexOf(id);
            onDrop(node.parentId!, dropAt === "after" ? idx + 1 : idx);
          }
          setDropAt(null);
        }}
        data-row
        className={[
          "group flex items-center gap-1.5 rounded px-1.5 py-1.5 text-[13px] leading-tight cursor-pointer select-none",
          isActive ? "bg-brass-100/70 dark:bg-brass-700/40 text-ink dark:text-ink-inverse" : "text-ink-soft hover:bg-ink/5 dark:text-ink-inverse/80 dark:hover:bg-ink-inverse/10",
          dropAt === "before" ? "shadow-[inset_0_2px_0_0_theme(colors.signal.amber)]" : "",
          dropAt === "after" ? "shadow-[inset_0_-2px_0_0_theme(colors.signal.amber)]" : "",
          dropAt === "into" ? "ring-1 ring-signal-amber/70" : "",
        ].join(" ")}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => (isFolder ? onToggle(id) : setActive(id))}
        onDoubleClick={() => !isFolder && setEditing(true)}
      >
        {isFolder ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(id);
            }}
            className="text-ink-faint"
          >
            <ChevronIcon open={isOpen} />
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        <span className="shrink-0 text-ink-faint">
          {isTrash ? <TrashIcon /> : isFolder ? <FolderIcon open={isOpen} /> : <PageIcon />}
        </span>

        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(node.title);
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 rounded border border-signal-amber/60 bg-paper px-1 py-0 text-[13px] outline-none dark:bg-paper-dark"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate" onDoubleClick={() => setEditing(true)}>
            {node.title}
          </span>
        )}

        {!isFolder && !inTrash && (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: STATUS_COLOR[node.status ?? "draft"] }}
            title={node.status}
          />
        )}

        {count !== null && (
          <span className="shrink-0 pl-1 font-mono text-[10px] text-ink-faint opacity-0 group-hover:opacity-100">
            {count}
          </span>
        )}

        <div className="relative shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="rounded px-1 text-ink-faint opacity-0 hover:bg-ink/10 group-hover:opacity-100"
          >
            <DotsIcon />
          </button>
          {menuOpen && (
            <RowMenu
              onClose={() => setMenuOpen(false)}
              inTrash={!!inTrash}
              isRoot={!node.parentId}
              onRename={() => setEditing(true)}
              onDelete={() => moveToTrash(id)}
              onRestore={() => restoreFromTrash(id)}
              onDeleteForever={() => deleteForever(id)}
            />
          )}
        </div>
      </div>

      {isFolder && isOpen && (
        <div>
          {node.children.length === 0 && (
            <div className="py-1 text-[11px] text-ink-faint" style={{ paddingLeft: 24 + depth * 14 }}>
              Empty
            </div>
          )}
          {node.children.map((childId) => (
            <BinderRow
              key={childId}
              id={childId}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              dragId={dragId}
              setDragId={setDragId}
              onDrop={onDrop}
              isTrash={!!inTrash}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RowMenu({
  onClose,
  inTrash,
  isRoot,
  onRename,
  onDelete,
  onRestore,
  onDeleteForever,
}: {
  onClose: () => void;
  inTrash: boolean;
  isRoot: boolean;
  onRename: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onDeleteForever: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-6 z-20 w-40 overflow-hidden rounded-md border border-ink/10 bg-paper shadow-card dark:bg-paper-dark">
        {!inTrash && (
          <MenuItem
            label="Rename"
            onClick={() => {
              onRename();
              onClose();
            }}
          />
        )}
        {!inTrash && !isRoot && (
          <MenuItem
            label="Move to Trash"
            onClick={() => {
              onDelete();
              onClose();
            }}
          />
        )}
        {inTrash && (
          <>
            <MenuItem
              label="Restore"
              onClick={() => {
                onRestore();
                onClose();
              }}
            />
            <MenuItem
              label="Delete Forever"
              danger
              onClick={() => {
                onDeleteForever();
                onClose();
              }}
            />
          </>
        )}
      </div>
    </>
  );
}

function MenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`block w-full px-3 py-1.5 text-left text-[12.5px] hover:bg-ink/5 dark:hover:bg-ink-inverse/10 ${
        danger ? "text-signal-rust" : "text-ink-soft dark:text-ink-inverse/80"
      }`}
    >
      {label}
    </button>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={`transition-transform duration-150 ease-quill ${open ? "rotate-90" : ""}`}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={open ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" opacity={open ? 0.85 : 1}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}
function PageIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />
    </svg>
  );
}
function DotsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}
