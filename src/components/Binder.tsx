import React, { useState, useMemo } from "react";
import { useProject } from "../store/ProjectContext";
import type { BinderNode } from "../types";
import { BinderRow } from "./BinderRow";
import { wordCount } from "../lib/manifest"; // <-- Added to count total words

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  revised: "Revising",
  final: "Final",
};

export function Binder() {
  const { state, addDocument, addFolder, reorder, moveNode } = useProject();
  const manifest = state.manifest!;
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(manifest.rootIds)
  );
  const [dragId, setDragId] = useState<string | null>(null);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleDrop(targetParentId: string, targetIndex: number) {
    if (!dragId) return;
    const dragNode = manifest.nodes[dragId];
    if (!dragNode) return;
    if (dragNode.parentId === targetParentId) {
      const kids = manifest.nodes[targetParentId].children.filter((c) => c !== dragId);
      kids.splice(targetIndex, 0, dragId);
      reorder(targetParentId, kids);
    } else {
      moveNode(dragId, targetParentId, targetIndex);
    }
    setDragId(null);
  }

  const manuscriptRoot = manifest.rootIds.filter((id) => id !== manifest.trashId);
  const trashRoot = manifest.trashId;

  // Calculate the total word count for the entire project
  const totalWords = useMemo(() => {
    let count = 0;
    for (const node of Object.values(manifest.nodes)) {
      // Only count documents that are not in the trash
      if (node.kind === "document" && node.parentId !== manifest.trashId) {
        // Read directly from state.contents to keep it live
        const text = state.contents[node.id] || ""; 
        count += wordCount(text);
      }
    }
    return count;
  }, [manifest.nodes, state.contents, manifest.trashId]);

  return (
    <div className="flex h-full flex-col bg-paper-dim/60 dark:bg-paper-darkdim/60">
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="font-display text-[13px] tracking-wide text-ink-soft dark:text-ink-inverse/70">
          Binder
        </span>
        <div className="flex items-center gap-1">
          <button
            title="New folder"
            onClick={() => addFolder(manuscriptRoot[0] ?? manifest.rootIds[0])}
            className="rounded px-1.5 py-1 text-ink-faint hover:bg-ink/5 hover:text-ink dark:hover:bg-ink-inverse/10 dark:hover:text-ink-inverse"
          >
            <FolderPlusIcon />
          </button>
          <button
            title="New document"
            onClick={() => addDocument(manuscriptRoot[0] ?? manifest.rootIds[0])}
            className="rounded px-1.5 py-1 text-ink-faint hover:bg-ink/5 hover:text-ink dark:hover:bg-ink-inverse/10 dark:hover:text-ink-inverse"
          >
            <DocPlusIcon />
          </button>
        </div>
      </div>

      <div className="scrollbar-quiet flex-1 overflow-y-auto px-2 pb-3">
        {manuscriptRoot.map((id) => (
          <BinderRow
            key={id}
            id={id}
            depth={0}
            expanded={expanded}
            onToggle={toggle}
            dragId={dragId}
            setDragId={setDragId}
            onDrop={handleDrop}
          />
        ))}

        <div className="my-2 border-t border-ink/10" />

        <BinderRow
          id={trashRoot}
          depth={0}
          expanded={expanded}
          onToggle={toggle}
          dragId={dragId}
          setDragId={setDragId}
          onDrop={handleDrop}
          isTrash
        />
      </div>

      {/* New Progress Widget at the bottom */}
      <ProjectProgress totalWords={totalWords} />
    </div>
  );
}

function ProjectProgress({ totalWords }: { totalWords: number }) {
  const milestones = [
    { label: "Short Story", max: 7500 },
    { label: "Novelette", max: 17500 },
    { label: "Novella", max: 40000 },
    { label: "Novel", max: 80000 },
    { label: "Epic", max: 120000 },
  ];

  const currentIdx = milestones.findIndex((m) => totalWords < m.max);
  const next = currentIdx === -1 ? milestones[milestones.length - 1] : milestones[currentIdx];
  const prevMax = currentIdx <= 0 ? 0 : milestones[currentIdx - 1].max;
  
  // Calculate percentage progress toward the *next* milestone
  const progressToNext = currentIdx === -1 ? 1 : (totalWords - prevMax) / (next.max - prevMax);

  return (
    <div className="shrink-0 border-t border-ink/8 px-4 py-3 dark:border-ink-inverse/10">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-display text-[10px] uppercase tracking-wider text-ink-faint">
          {currentIdx === -1 ? "Opus Achieved" : `Next: ${next.label}`}
        </span>
        <span className="font-mono text-[11px] text-ink-soft dark:text-ink-inverse/70">
          {totalWords.toLocaleString()} w
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/5 dark:bg-ink-inverse/10">
        <div
          className="h-full rounded-full bg-signal-amber transition-all duration-700 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progressToNext * 100))}%` }}
        />
      </div>
    </div>
  );
}

// ... Keep your existing FolderPlusIcon, DocPlusIcon, and statusLabel exactly as they are below this point.

function FolderPlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      <path d="M12 11v5M9.5 13.5h5" />
    </svg>
  );
}
function DocPlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5M9.5 14.5h5M9.5 17.5h5" />
    </svg>
  );
}

export function statusLabel(s?: string) {
  return s ? STATUS_LABEL[s] ?? s : "";
}

export type { BinderNode };
