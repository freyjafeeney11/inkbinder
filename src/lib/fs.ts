/**
 * A thin storage abstraction so the app runs two ways:
 *  - Inside Tauri: real files on disk, written atomically by the Rust
 *    commands in `src-tauri/src/commands.rs` (temp file + rename), so a
 *    crash mid-save can never corrupt a chapter.
 *  - In a plain browser (e.g. `npm run dev` without `tauri dev`): a
 *    localStorage-backed virtual filesystem, so the app still works for
 *    development without a native build.
 */

export const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/tauri");
  return tauriInvoke<T>(cmd, args);
}

const VFS_KEY = "inkbinder:vfs";
type VirtualFS = Record<string, string>;

function loadVfs(): VirtualFS {
  try {
    const raw = localStorage.getItem(VFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveVfs(vfs: VirtualFS) {
  localStorage.setItem(VFS_KEY, JSON.stringify(vfs));
}

export async function readFile(path: string): Promise<string | null> {
  if (isTauri) return invoke<string | null>("read_text_file", { path });
  const vfs = loadVfs();
  return path in vfs ? vfs[path] : null;
}

export async function writeFile(path: string, contents: string): Promise<void> {
  if (isTauri) {
    await invoke<void>("write_text_file_atomic", { path, contents });
    return;
  }
  const vfs = loadVfs();
  vfs[path] = contents;
  saveVfs(vfs);
}

export async function deleteFile(path: string): Promise<void> {
  if (isTauri) {
    await invoke<void>("delete_path", { path });
    return;
  }
  const vfs = loadVfs();
  delete vfs[path];
  saveVfs(vfs);
}

export async function ensureDir(path: string): Promise<void> {
  if (isTauri) await invoke<void>("ensure_dir", { path });
}

export async function pickProjectDirectory(): Promise<string | null> {
  if (isTauri) {
    const { open } = await import("@tauri-apps/api/dialog");
    const selected = await open({ directory: true, multiple: false, title: "Choose a folder for your stories" });
    return typeof selected === "string" ? selected : null;
  }
  return "demo-stories";
}

export function join(...parts: string[]): string {
  return parts.join(isTauri ? "/" : ":");
}