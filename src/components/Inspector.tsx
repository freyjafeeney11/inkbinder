import React, { useState } from "react";
import { useProject } from "../store/ProjectContext";
import type { DocStatus } from "../types";
import { wordCount } from "../lib/manifest";

const STATUSES: { value: DocStatus; label: string; color: string }[] = [
  { value: "todo", label: "To draft", color: "#8A8171" },
  { value: "draft", label: "Draft", color: "#C1793B" },
  { value: "revised", label: "Revised", color: "#5C6E4E" },
  { value: "final", label: "Final", color: "#8B6A32" },
];

export function Inspector() {
  const { state, getContent, setStatus, setSynopsis, setWordGoal, setProjectMeta } = useProject();
  const [tab, setTab] = useState<"doc" | "book">("doc");
  
  const activeId = state.ui.activeId;
  const node = activeId ? state.manifest?.nodes[activeId] : null;
  const manifest = state.manifest;

  if (!manifest) return null;

  return (
    <div className="scrollbar-quiet flex h-full flex-col overflow-y-auto bg-paper-dim/30 dark:bg-paper-darkdim/30">
      {/* Tab Toggle */}
      <div className="flex border-b border-ink/8 text-[11px] font-medium uppercase tracking-wider text-ink-faint dark:border-ink-inverse/10">
        <button
          onClick={() => setTab("doc")}
          className={`flex-1 py-3 text-center transition-colors ${tab === "doc" ? "text-ink dark:text-ink-inverse shadow-[inset_0_-1px_0_0_currentColor]" : "hover:text-ink-soft dark:hover:text-ink-inverse/80"}`}
        >
          Chapter
        </button>
        <button
          onClick={() => setTab("book")}
          className={`flex-1 py-3 text-center transition-colors ${tab === "book" ? "text-ink dark:text-ink-inverse shadow-[inset_0_-1px_0_0_currentColor]" : "hover:text-ink-soft dark:hover:text-ink-inverse/80"}`}
        >
          Manuscript
        </button>
      </div>

      <div className="flex flex-col gap-6 px-5 py-6">
        {tab === "book" ? (
          <>
            <div>
              <SectionLabel>Author Name</SectionLabel>
              <input
                // @ts-ignore
                value={manifest.author ?? ""}
                // @ts-ignore
                onChange={(e) => setProjectMeta(e.target.value, manifest.dedication ?? "")}
                placeholder="Pen name..."
                className="w-full rounded border border-ink/10 bg-paper px-2.5 py-1.5 text-[13px] text-ink outline-none focus-visible:border-signal-amber dark:border-ink-inverse/15 dark:bg-paper-dark dark:text-ink-inverse"
              />
            </div>
            <div>
              <SectionLabel>Dedication</SectionLabel>
              <textarea
                // @ts-ignore
                value={manifest.dedication ?? ""}
                // @ts-ignore
                onChange={(e) => setProjectMeta(manifest.author ?? "", e.target.value)}
                placeholder="For..."
                rows={3}
                className="w-full resize-none rounded border border-ink/10 bg-paper px-2.5 py-2 text-[13px] leading-relaxed text-ink outline-none focus-visible:border-signal-amber dark:border-ink-inverse/15 dark:bg-paper-dark dark:text-ink-inverse"
              />
            </div>
          </>
        ) : !activeId || !node || node.kind !== "document" ? (
          <div className="pt-10 text-center text-[12px] text-ink-faint">
            Select a document to see its notes and status.
          </div>
        ) : (
          <>
            {/* ... Keep your existing Chapter UI (Status, Synopsis, Word Goal) here exactly as it was ... */}
            <div>
              <SectionLabel>Status</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStatus(activeId, s.value)}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                      node.status === s.value
                        ? "border-transparent bg-brass-100 text-ink dark:bg-brass-700/50 dark:text-ink-inverse"
                        : "border-ink/12 text-ink-soft hover:border-ink/25 dark:border-ink-inverse/15 dark:text-ink-inverse/70"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <SectionLabel>Synopsis</SectionLabel>
              <textarea
                value={node.synopsis ?? ""}
                onChange={(e) => setSynopsis(activeId, e.target.value)}
                placeholder="What happens in this chapter…"
                rows={6}
                className="w-full resize-none rounded-md border border-ink/10 bg-paper px-2.5 py-2 text-[12.5px] leading-relaxed text-ink outline-none placeholder:text-ink-faint focus-visible:border-signal-amber dark:border-ink-inverse/15 dark:bg-paper-dark dark:text-ink-inverse"
              />
            </div>

            <div>
              <SectionLabel>Word count</SectionLabel>
              <div className="flex items-center justify-between text-[12.5px] text-ink-soft dark:text-ink-inverse/70">
                <span className="font-mono">{wordCount(getContent(activeId)).toLocaleString()}</span>
                <label className="flex items-center gap-1.5 text-ink-faint">
                  goal
                  <input
                    type="number"
                    min={0}
                    value={node.wordGoal ?? ""}
                    onChange={(e) => setWordGoal(activeId, e.target.value ? Number(e.target.value) : null)}
                    placeholder="—"
                    className="w-16 rounded border border-ink/10 bg-paper px-1.5 py-0.5 text-right font-mono text-[12px] outline-none focus-visible:border-signal-amber dark:border-ink-inverse/15 dark:bg-paper-dark"
                  />
                </label>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 font-display text-[11px] uppercase tracking-[0.08em] text-ink-faint">
      {children}
    </h3>
  );
}