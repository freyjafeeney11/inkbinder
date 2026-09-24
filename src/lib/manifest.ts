import type { BinderNode, ProjectManifest } from "../types";

export function newId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}

export function makeNode(partial: Partial<BinderNode> & Pick<BinderNode, "kind" | "title" | "parentId">): BinderNode {
  const ts = now();
  return {
    id: newId(),
    children: [],
    status: partial.kind === "document" ? "draft" : undefined,
    synopsis: "",
    labelColor: null,
    wordGoal: null,
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

/** A fresh project: a Manuscript folder with one opening chapter, a Notes folder, and Trash. */
export function defaultManifest(title: string): ProjectManifest {
  const manuscript = makeNode({ kind: "folder", title: "Manuscript", parentId: null });
  const chapter1 = makeNode({ kind: "document", title: "Chapter 1", parentId: manuscript.id });
  const notes = makeNode({ kind: "folder", title: "Notes", parentId: null });
  const characters = makeNode({ kind: "document", title: "Characters", parentId: notes.id });
  const trash = makeNode({ kind: "folder", title: "Trash", parentId: null });

  manuscript.children = [chapter1.id];
  notes.children = [characters.id];

  const nodes: Record<string, BinderNode> = {
    [manuscript.id]: manuscript,
    [chapter1.id]: chapter1,
    [notes.id]: notes,
    [characters.id]: characters,
    [trash.id]: trash,
  };

  const ts = now();
  return {
    formatVersion: 1,
    id: newId(),
    title,
    rootIds: [manuscript.id, notes.id, trash.id],
    nodes,
    trashId: trash.id,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function charCount(text: string): number {
  return text.length;
}

/** All descendant document ids of a node, depth-first, for compile/word-count rollups. */
export function documentDescendants(manifest: ProjectManifest, nodeId: string): string[] {
  const node = manifest.nodes[nodeId];
  if (!node) return [];
  if (node.kind === "document") return [node.id];
  return node.children.flatMap((childId) => documentDescendants(manifest, childId));
}
