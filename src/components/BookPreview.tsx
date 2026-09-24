import React, { useMemo } from "react";
import { useProject } from "../store/ProjectContext";
import { renderMarkdown } from "../lib/markdown";
import { documentDescendants } from "../lib/manifest";

export function BookPreview() {
  const { state, getContent } = useProject();
  const manifest = state.manifest!;

  const manuscriptRootId = manifest.rootIds.find((id) => id !== manifest.trashId);
  const chapterIds = useMemo(
    () => (manuscriptRootId ? documentDescendants(manifest, manuscriptRootId) : []),
    [manifest, manuscriptRootId]
  );
  return (
    <div className="scrollbar-quiet h-full flex-1 overflow-y-auto bg-paper-dim/40 dark:bg-paper-darkdim/40">
      <div className="mx-auto max-w-[620px] px-10 py-16 sm:px-16">
        
        {/* Title Page Section */}
        <section className="flex min-h-[75vh] flex-col items-center justify-center text-center">
          <h1 className="font-display text-4xl text-ink dark:text-ink-inverse">{manifest.title}</h1>
          {/* @ts-ignore */}
          {manifest.author && (
            // @ts-ignore
            <p className="mt-4 text-[17px] font-serif text-ink-soft dark:text-ink-inverse/80">by {manifest.author}</p>
          )}
          {/* @ts-ignore */}
          {manifest.dedication && (
            // @ts-ignore
            <p className="mt-32 max-w-sm text-[15px] italic font-serif text-ink-soft dark:text-ink-inverse/80">"{manifest.dedication}"</p>
          )}
        </section>

        {chapterIds.length === 0 && (
          <p className="text-center text-sm text-ink-faint mt-20">
            Nothing in the Manuscript folder yet — add a chapter from the binder.
          </p>
        )}

        {chapterIds.map((id, i) => {
          const node = manifest.nodes[id];
          const text = getContent(id);
          return (
            <section key={id} className="mt-32">
              <div className="mb-10 text-center">
                <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
                  Chapter {i + 1}
                </p>
                <h2 className="font-display text-xl text-ink dark:text-ink-inverse">{node.title}</h2>
              </div>
              <article
                className="prose-manuscript font-serif text-[17px] leading-[1.85] text-ink dark:text-ink-inverse/90 [&>p]:mb-5 [&>p]:indent-6"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
              />
            </section>
          );
        })}

        <footer className="mt-32 text-center text-[11px] text-ink-faint">— End of manuscript —</footer>
      </div>
    </div>
  )
};