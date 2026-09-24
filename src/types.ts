export type NodeKind = "folder" | "document";

// Combined statuses from both versions
export type DocStatus = "todo" | "draft" | "revising" | "revised" | "final";

export interface BinderNode {
  id: string;
  kind: NodeKind;
  title: string;
  children: string[]; // ids, folders only
  parentId: string | null;
  // Document-only metadata (undefined for folders)
  status?: DocStatus;
  synopsis?: string;
  labelColor?: string | null;
  wordGoal?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectManifest {
  formatVersion: 1;
  id: string;
  title: string;
  author?: string;  
  dedication?: string;   
  rootIds: string[]; 
  nodes: Record<string, BinderNode>;
  trashId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpenDocState {
  activeId: string | null;
  distractionFree: boolean; 
  showBinder: boolean;
  showInspector: boolean;
}

export interface ProjectHandle {
  path: string | null;
}

export interface RecentProject {
  id: string;
  title: string;
  path: string;
  lastOpened: string;
}

/** App-level settings, stored once per install — not per project. */
export interface AppConfig {
  /** The single folder new stories get created inside, e.g. ~/Documents/Inkbinder Stories. */
  storiesDir: string | null;
  recentProjects: RecentProject[];
}