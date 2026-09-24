import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { AppConfig, BinderNode, DocStatus, OpenDocState, ProjectManifest } from "../types";
import { deleteFile, ensureDir, join, pickProjectDirectory, readFile, writeFile } from "../lib/fs";
import { defaultManifest, makeNode, now } from "../lib/manifest";
import { loadAppConfig, saveAppConfig, slugify, upsertRecent, removeRecent as removeRecentEntry } from "../lib/appconfig";

const MANIFEST_FILE = "manifest.json";
const DOCS_DIR = "documents";

function docPath(projectDir: string, id: string) {
  return join(projectDir, DOCS_DIR, `${id}.md`);
}

interface State {
  projectDir: string | null;
  manifest: ProjectManifest | null;
  contents: Record<string, string>; 
  ui: OpenDocState;
  loading: boolean;
  dirty: Set<string>;
  appConfig: AppConfig | null; 
}

type Action =
  | { type: "loaded"; projectDir: string; manifest: ProjectManifest }
  | { type: "closeProject" }
  | { type: "setManifest"; manifest: ProjectManifest }
  | { type: "setContent"; id: string; text: string; markClean?: boolean }
  | { type: "markSaved"; id: string }
  | { type: "setActive"; id: string | null }
  | { type: "toggleBinder" }
  | { type: "toggleInspector" }
  | { type: "toggleDistractionFree" }
  | { type: "setAppConfig"; config: AppConfig };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loaded":
      return { ...state, projectDir: action.projectDir, manifest: action.manifest, loading: false, contents: {}, dirty: new Set() };
    case "closeProject":
      return { ...state, projectDir: null, manifest: null, contents: {}, dirty: new Set(), ui: { ...state.ui, activeId: null } };
    case "setManifest":
      return { ...state, manifest: action.manifest };
    case "setContent": {
      const dirty = new Set(state.dirty);
      if (action.markClean) dirty.delete(action.id);
      else dirty.add(action.id);
      return { ...state, contents: { ...state.contents, [action.id]: action.text }, dirty };
    }
    case "markSaved": {
      const dirty = new Set(state.dirty);
      dirty.delete(action.id);
      return { ...state, dirty };
    }
    case "setActive":
      return { ...state, ui: { ...state.ui, activeId: action.id } };
    case "toggleBinder":
      return { ...state, ui: { ...state.ui, showBinder: !state.ui.showBinder } };
    case "toggleInspector":
      return { ...state, ui: { ...state.ui, showInspector: !state.ui.showInspector } };
    case "toggleDistractionFree":
      return { ...state, ui: { ...state.ui, distractionFree: !state.ui.distractionFree } };
    case "setAppConfig":
      return { ...state, appConfig: action.config };
    default:
      return state;
  }
}

const initialState: State = {
  projectDir: null,
  manifest: null,
  contents: {},
  loading: false,
  dirty: new Set(),
  appConfig: null,
  ui: { activeId: null, showBinder: true, showInspector: true, distractionFree: false },
};

interface Ctx {
  state: State;
  chooseStoriesFolder: () => Promise<void>;
  createNewStory: (title: string) => Promise<void>;
  openRecent: (path: string) => Promise<void>;
  forgetRecent: (path: string) => Promise<void>;
  openProjectFromElsewhere: () => Promise<void>;
  closeProject: () => void;
  renameProject: (title: string) => void;
  setActive: (id: string | null) => void;
  getContent: (id: string) => string;
  setContent: (id: string, text: string) => void;
  addDocument: (parentId: string, title?: string) => string;
  addFolder: (parentId: string, title?: string) => string;
  rename: (id: string, title: string) => void;
  setStatus: (id: string, status: DocStatus) => void;
  setSynopsis: (id: string, synopsis: string) => void;
  setWordGoal: (id: string, goal: number | null) => void;
  setLabelColor: (id: string, color: string | null) => void;
  moveToTrash: (id: string) => void;
  setProjectMeta: (author: string, dedication: string) => void;
  restoreFromTrash: (id: string) => void;
  deleteForever: (id: string) => void;
  reorder: (parentId: string, orderedChildIds: string[]) => void;
  moveNode: (id: string, newParentId: string, index: number) => void;
  toggleBinder: () => void;
  toggleInspector: () => void;
  toggleDistractionFree: () => void;
}

const ProjectCtx = createContext<Ctx | null>(null);

export function useProject(): Ctx {
  const ctx = useContext(ProjectCtx);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [saveTick, setSaveTick] = useState(0);

  useEffect(() => {
    loadAppConfig().then((config) => dispatch({ type: "setAppConfig", config }));
  }, []);

  const persistManifest = useCallback(async (projectDir: string, manifest: ProjectManifest) => {
    await writeFile(join(projectDir, MANIFEST_FILE), JSON.stringify(manifest, null, 2));
  }, []);

  const rememberProject = useCallback(async (projectDir: string, manifest: ProjectManifest) => {
    const base = stateRef.current.appConfig ?? { storiesDir: null, recentProjects: [] };
    const updated = upsertRecent(base, { id: manifest.id, title: manifest.title, path: projectDir, lastOpened: now() });
    dispatch({ type: "setAppConfig", config: updated });
    await saveAppConfig(updated);
  }, []);

  const openProjectAt = useCallback(
    async (projectDir: string, titleOverride?: string) => {
      dispatch({ type: "closeProject" });
      await ensureDir(projectDir);
      await ensureDir(join(projectDir, DOCS_DIR));
      const raw = await readFile(join(projectDir, MANIFEST_FILE));
      let manifest: ProjectManifest;
      if (raw) {
        manifest = JSON.parse(raw);
      } else {
        manifest = defaultManifest(titleOverride ?? "Untitled Story");
        await persistManifest(projectDir, manifest);
      }
      dispatch({ type: "loaded", projectDir, manifest });
      const firstDoc = Object.values(manifest.nodes).find((n) => n.kind === "document");
      if (firstDoc) dispatch({ type: "setActive", id: firstDoc.id });
      await rememberProject(projectDir, manifest);
    },
    [persistManifest, rememberProject]
  );

  const chooseStoriesFolder = useCallback(async () => {
    const dir = await pickProjectDirectory();
    if (!dir) return;
    const base = stateRef.current.appConfig ?? { storiesDir: null, recentProjects: [] };
    const updated: AppConfig = { ...base, storiesDir: dir };
    dispatch({ type: "setAppConfig", config: updated });
    await saveAppConfig(updated);
  }, []);

  const createNewStory = useCallback(
    async (title: string) => {
      const storiesDir = stateRef.current.appConfig?.storiesDir;
      if (!storiesDir) return;
      const base = slugify(title);
      let folderName = base;
      let attempt = 1;
      while (await readFile(join(storiesDir, folderName, MANIFEST_FILE))) {
        attempt += 1;
        folderName = `${base}-${attempt}`;
      }
      await openProjectAt(join(storiesDir, folderName), title);
    },
    [openProjectAt]
  );

  const openRecent = useCallback((path: string) => openProjectAt(path), [openProjectAt]);

  const forgetRecent = useCallback(async (path: string) => {
    const base = stateRef.current.appConfig ?? { storiesDir: null, recentProjects: [] };
    const updated = removeRecentEntry(base, path);
    dispatch({ type: "setAppConfig", config: updated });
    await saveAppConfig(updated);
  }, []);

  const openProjectFromElsewhere = useCallback(async () => {
    const dir = await pickProjectDirectory();
    if (!dir) return;
    await openProjectAt(dir);
  }, [openProjectAt]);

  const closeProject = useCallback(() => dispatch({ type: "closeProject" }), []);

  useEffect(() => {
    if (!state.projectDir || !state.manifest) return;
    const handle = setTimeout(() => {
      persistManifest(state.projectDir!, state.manifest!);
    }, 250);
    return () => clearTimeout(handle);
  }, [state.manifest, state.projectDir, persistManifest]);

  useEffect(() => {
    if (!state.projectDir || state.dirty.size === 0) return;
    const handle = setTimeout(async () => {
      const { projectDir, dirty, contents } = stateRef.current;
      if (!projectDir) return;
      for (const id of dirty) {
        await writeFile(docPath(projectDir, id), contents[id] ?? "");
        dispatch({ type: "markSaved", id });
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [saveTick, state.dirty, state.projectDir]);

  const ensureLoaded = useCallback(
    async (id: string) => {
      if (!state.projectDir) return;
      if (id in stateRef.current.contents) return;
      const text = await readFile(docPath(state.projectDir, id));
      dispatch({ type: "setContent", id, text: text ?? "", markClean: true });
    },
    [state.projectDir]
  );

  useEffect(() => {
    if (state.ui.activeId) ensureLoaded(state.ui.activeId);
  }, [state.ui.activeId, ensureLoaded]);

  const mutateManifest = useCallback((fn: (m: ProjectManifest) => ProjectManifest) => {
    const cur = stateRef.current.manifest;
    if (!cur) return;
    const next = fn(structuredClone(cur));
    next.updatedAt = now();
    dispatch({ type: "setManifest", manifest: next });
  }, []);

  const setActive = useCallback((id: string | null) => dispatch({ type: "setActive", id }), []);
  const getContent = useCallback((id: string) => stateRef.current.contents[id] ?? "", []);
  const setContent = useCallback((id: string, text: string) => {
    dispatch({ type: "setContent", id, text });
    setSaveTick((t) => t + 1);
  }, []);

  const addDocument = useCallback(
    (parentId: string, title = "New Chapter") => {
      const node = makeNode({ kind: "document", title, parentId });
      mutateManifest((m) => {
        m.nodes[node.id] = node;
        m.nodes[parentId].children.push(node.id);
        m.nodes[parentId].updatedAt = now();
        return m;
      });
      dispatch({ type: "setContent", id: node.id, text: "", markClean: true });
      setActive(node.id);
      return node.id;
    },
    [mutateManifest, setActive]
  );

  const addFolder = useCallback(
    (parentId: string, title = "New Folder") => {
      const node = makeNode({ kind: "folder", title, parentId });
      mutateManifest((m) => {
        m.nodes[node.id] = node;
        m.nodes[parentId].children.push(node.id);
        m.nodes[parentId].updatedAt = now();
        return m;
      });
      return node.id;
    },
    [mutateManifest]
  );

  const rename = useCallback(
    (id: string, title: string) => {
      mutateManifest((m) => {
        m.nodes[id].title = title;
        m.nodes[id].updatedAt = now();
        return m;
      });
    },
    [mutateManifest]
  );

  const renameProject = useCallback(
    (title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      mutateManifest((m) => {
        m.title = trimmed;
        return m;
      });
      const dir = stateRef.current.projectDir;
      const cfg = stateRef.current.appConfig;
      const manifest = stateRef.current.manifest;
      if (dir && cfg && manifest) {
        const updated = upsertRecent(cfg, { id: manifest.id, title: trimmed, path: dir, lastOpened: now() });
        dispatch({ type: "setAppConfig", config: updated });
        saveAppConfig(updated);
      }
    },
    [mutateManifest]
  );

  const setStatus = useCallback(
    (id: string, status: DocStatus) => {
      mutateManifest((m) => {
        m.nodes[id].status = status;
        m.nodes[id].updatedAt = now();
        return m;
      });
    },
    [mutateManifest]
  );

  const setSynopsis = useCallback(
    (id: string, synopsis: string) => {
      mutateManifest((m) => {
        m.nodes[id].synopsis = synopsis;
        m.nodes[id].updatedAt = now();
        return m;
      });
    },
    [mutateManifest]
  );

  const setWordGoal = useCallback(
    (id: string, goal: number | null) => {
      mutateManifest((m) => {
        m.nodes[id].wordGoal = goal;
        m.nodes[id].updatedAt = now();
        return m;
      });
    },
    [mutateManifest]
  );

  const setLabelColor = useCallback(
    (id: string, color: string | null) => {
      mutateManifest((m) => {
        m.nodes[id].labelColor = color;
        m.nodes[id].updatedAt = now();
        return m;
      });
    },
    [mutateManifest]
  );

  const setProjectMeta = useCallback(
    (author: string, dedication: string) => {
      mutateManifest((m) => {
        m.author = author;
        m.dedication = dedication;
        m.updatedAt = now();
        return m;
      });
    },
    [mutateManifest]
  );

  function detachFromParent(m: ProjectManifest, id: string) {
    const node = m.nodes[id];
    if (node.parentId && m.nodes[node.parentId]) {
      m.nodes[node.parentId].children = m.nodes[node.parentId].children.filter((c) => c !== id);
    } else {
      m.rootIds = m.rootIds.filter((c) => c !== id);
    }
  }

  const moveToTrash = useCallback(
    (id: string) => {
      mutateManifest((m) => {
        if (id === m.trashId) return m;
        detachFromParent(m, id);
        m.nodes[id].parentId = m.trashId;
        m.nodes[m.trashId].children.push(id);
        return m;
      });
      if (stateRef.current.ui.activeId === id) setActive(null);
    },
    [mutateManifest, setActive]
  );

  const restoreFromTrash = useCallback(
    (id: string) => {
      mutateManifest((m) => {
        detachFromParent(m, id);
        const target = m.rootIds[0] ?? null;
        m.nodes[id].parentId = target;
        if (target) m.nodes[target].children.push(id);
        else m.rootIds.unshift(id);
        return m;
      });
    },
    [mutateManifest]
  );

  const deleteForever = useCallback(
    (id: string) => {
      const dir = stateRef.current.projectDir;
      mutateManifest((m) => {
        const collect = (nid: string): string[] => [nid, ...(m.nodes[nid]?.children.flatMap(collect) ?? [])];
        const toRemove = collect(id);
        detachFromParent(m, id);
        for (const rid of toRemove) delete m.nodes[rid];
        if (dir) toRemove.forEach((rid) => deleteFile(docPath(dir, rid)));
        return m;
      });
    },
    [mutateManifest]
  );

  const reorder = useCallback(
    (parentId: string, orderedChildIds: string[]) => {
      mutateManifest((m) => {
        if (m.nodes[parentId]) m.nodes[parentId].children = orderedChildIds;
        return m;
      });
    },
    [mutateManifest]
  );

  const moveNode = useCallback(
    (id: string, newParentId: string, index: number) => {
      mutateManifest((m) => {
        detachFromParent(m, id);
        m.nodes[id].parentId = newParentId;
        const kids = m.nodes[newParentId].children;
        kids.splice(index, 0, id);
        return m;
      });
    },
    [mutateManifest]
  );

  const toggleBinder = useCallback(() => dispatch({ type: "toggleBinder" }), []);
  const toggleInspector = useCallback(() => dispatch({ type: "toggleInspector" }), []);
  const toggleDistractionFree = useCallback(() => dispatch({ type: "toggleDistractionFree" }), []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      chooseStoriesFolder,
      createNewStory,
      openRecent,
      forgetRecent,
      openProjectFromElsewhere,
      closeProject,
      renameProject,
      setActive,
      getContent,
      setContent,
      addDocument,
      addFolder,
      rename,
      setStatus,
      setSynopsis,
      setWordGoal,
      setProjectMeta,
      setLabelColor,
      moveToTrash,
      restoreFromTrash,
      deleteForever,
      reorder,
      moveNode,
      toggleBinder,
      toggleInspector,
      toggleDistractionFree,
    }),
    [
      state,
      chooseStoriesFolder,
      createNewStory,
      openRecent,
      forgetRecent,
      openProjectFromElsewhere,
      closeProject,
      renameProject,
      setActive,
      getContent,
      setContent,
      addDocument,
      addFolder,
      rename,
      setStatus,
      setSynopsis,
      setWordGoal,
      setLabelColor,
      moveToTrash,
      restoreFromTrash,
      deleteForever,
      reorder,
      moveNode,
      toggleBinder,
      toggleInspector,
      toggleDistractionFree,
    ]
  );

  return <ProjectCtx.Provider value={value}>{children}</ProjectCtx.Provider>;
}

export type { BinderNode };