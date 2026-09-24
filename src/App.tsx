import React, { useEffect, useState } from "react";
import { ProjectProvider, useProject } from "./store/ProjectContext";
import { TitleBar } from "./components/TitleBar";
import { Binder } from "./components/Binder";
import { Editor } from "./components/Editor";
import { Inspector } from "./components/Inspector";
import { Welcome } from "./components/Welcome";
import { BookPreview } from "./components/BookPreview";
import { buildEpub, downloadBlob } from "./lib/epub";

function Shell() {
  const { state, toggleBinder, toggleInspector, toggleDistractionFree, getContent } = useProject();
  const [bookPreview, setBookPreview] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "1") {
        e.preventDefault();
        toggleBinder();
      } else if (e.key === "2") {
        e.preventDefault();
        toggleInspector();
      } else if (e.key === "Enter") {
        e.preventDefault();
        toggleDistractionFree();
      } else if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        setBookPreview((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleBinder, toggleInspector, toggleDistractionFree]);

  function handleExportPdf() {
    if (!bookPreview) {
      setBookPreview(true);
      requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
    } else {
      window.print();
    }
  }

  async function handleExportEpub() {
    const blob = await buildEpub(state.manifest!, getContent);
    downloadBlob(blob, `${state.manifest!.title}.epub`);
  }

  if (state.loading) return <Welcome />;

  const df = state.ui.distractionFree;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-paper text-ink dark:bg-paper-dark dark:text-ink-inverse print:block print:h-auto print:w-auto print:overflow-visible print:bg-transparent">
      {!df && (
        <div className="print:hidden">
          <TitleBar
            bookPreview={bookPreview}
            onToggleBookPreview={() => setBookPreview((v) => !v)}
            onExportPdf={handleExportPdf}
            onExportEpub={handleExportEpub}
          />
        </div>
      )}
      
      <div className="flex min-h-0 flex-1 print:block print:h-auto print:min-h-0 print:overflow-visible">
        {!df && !bookPreview && state.ui.showBinder && (
          <aside className="w-[230px] shrink-0 border-r border-ink/8 shadow-panel dark:border-ink-inverse/10 print:hidden">
            <Binder />
          </aside>
        )}
        <main className="min-w-0 flex-1 print:block print:w-full print:overflow-visible">
          {bookPreview ? <BookPreview /> : <Editor />}
        </main>
        {!df && !bookPreview && state.ui.showInspector && (
          <aside className="w-[260px] shrink-0 border-l border-ink/8 dark:border-ink-inverse/10 print:hidden">
            <Inspector />
          </aside>
        )}
      </div>
      
      {df && (
        <button
          onClick={toggleDistractionFree}
          title="Exit distraction-free (⌘⏎)"
          className="fixed bottom-4 right-4 rounded-full bg-ink/5 px-3 py-1.5 text-[11px] text-ink-faint backdrop-blur hover:bg-ink/10 dark:bg-ink-inverse/10 print:hidden"
        >
          Exit focus
        </button>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ProjectProvider>
      <Gate />
    </ProjectProvider>
  );
}

function Gate() {
  const { state } = useProject();
  if (!state.manifest) return <Welcome />;
  return <Shell />;
}