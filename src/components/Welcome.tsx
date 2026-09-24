import React, { useState } from "react";
import { useProject } from "../store/ProjectContext";

export function Welcome() {
  const { state, chooseStoriesFolder, createNewStory, openRecent, forgetRecent, openProjectFromElsewhere } =
    useProject();
  const config = state.appConfig;
  const [creating, setCreating] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [busy, setBusy] = useState(false);

  // Still loading app settings from disk.
  if (!config) {
    return <div className="flex h-screen items-center justify-center bg-paper dark:bg-paper-dark" />;
  }

  async function handleCreate() {
    const title = titleDraft.trim();
    if (!title || busy) return;
    setBusy(true);
    await createNewStory(title);
    setBusy(false);
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-8 bg-paper px-6 dark:bg-paper-dark">
      <div className="flex flex-col items-center gap-3 text-center">
        <QuillMark />
        <h1 className="font-display text-2xl text-ink dark:text-ink-inverse">Inkbinder</h1>
        <p className="max-w-xs text-[13px] text-ink-faint">
          A quiet nook to write your novels ! Onward and upward ...
        </p>
      </div>

      {!config.storiesDir ? (
        <div className="flex flex-col items-center gap-2.5">
          <p className="max-w-xs text-center text-[12px] text-ink-faint">
            First, choose one folder where all your stories will live — Inkbinder will keep track of them from here on.
          </p>
          <button
            onClick={chooseStoriesFolder}
            className="rounded-full bg-ink px-5 py-2 text-[13px] font-medium text-paper transition-transform duration-150 ease-quill hover:scale-[1.02] dark:bg-ink-inverse dark:text-ink-dark"
          >
            Choose stories folder
          </button>
        </div>
      ) : (
        <div className="flex w-full max-w-sm flex-col items-stretch gap-5">
          {creating ? (
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setCreating(false);
                }}
                placeholder="Story title…"
                className="rounded-lg border border-ink/12 bg-paper px-3 py-2 text-center text-[14px] text-ink outline-none focus-visible:border-signal-amber dark:border-ink-inverse/15 dark:bg-paper-dark dark:text-ink-inverse"
              />
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setCreating(false)}
                  className="rounded-full px-3 py-1 text-[12px] text-ink-faint hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!titleDraft.trim() || busy}
                  className="rounded-full bg-ink px-4 py-1.5 text-[12px] font-medium text-paper disabled:opacity-40 dark:bg-ink-inverse dark:text-ink-dark"
                >
                  {busy ? "Creating…" : "Start writing"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="mx-auto rounded-full bg-ink px-5 py-2 text-[13px] font-medium text-paper transition-transform duration-150 ease-quill hover:scale-[1.02] dark:bg-ink-inverse dark:text-ink-dark"
            >
              + New story
            </button>
          )}

          {config.recentProjects.length > 0 && (
            <div>
              <h2 className="mb-2 text-center font-display text-[11px] uppercase tracking-[0.08em] text-ink-faint">
                Your stories
              </h2>
              <div className="scrollbar-quiet max-h-64 overflow-y-auto rounded-lg border border-ink/8 dark:border-ink-inverse/10">
                {config.recentProjects.map((p) => (
                  <div
                    key={p.path}
                    className="group flex items-center justify-between border-b border-ink/6 px-3 py-2 last:border-b-0 hover:bg-ink/5 dark:border-ink-inverse/8 dark:hover:bg-ink-inverse/10"
                  >
                    <button onClick={() => openRecent(p.path)} className="min-w-0 flex-1 text-left">
                      <div className="truncate text-[13px] text-ink dark:text-ink-inverse">{p.title}</div>
                      <div className="truncate text-[11px] text-ink-faint">
                        {new Date(p.lastOpened).toLocaleDateString()}
                      </div>
                    </button>
                    <button
                      title="Remove from this list"
                      onClick={() => forgetRecent(p.path)}
                      className="shrink-0 rounded px-1.5 py-1 text-ink-faint opacity-0 hover:bg-ink/10 hover:text-ink group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 text-[11px] text-ink-faint">
            <button onClick={chooseStoriesFolder} className="underline decoration-ink/20 underline-offset-4 hover:text-ink">
              Change stories folder
            </button>
            <span>·</span>
            <button
              onClick={openProjectFromElsewhere}
              className="underline decoration-ink/20 underline-offset-4 hover:text-ink"
            >
              Open a project from elsewhere
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuillMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-brass-400">
      <path d="M20 4c-6 1-11 6-13 13l-2 3 3-2c7-2 12-7 13-13a1 1 0 0 0-1-1Z" />
      <path d="M9 15 4 20" />
    </svg>
  );
}