import type { AppConfig, RecentProject } from "../types";
import { invoke, isTauri, join, readFile, writeFile } from "./fs";

const CONFIG_FILENAME = "inkbinder-config.json";
const DEFAULT_CONFIG: AppConfig = { storiesDir: null, recentProjects: [] };

async function configPath(): Promise<string> {
  if (isTauri) {
    const dir = await invoke<string | null>("app_config_dir");
    return join(dir ?? ".", CONFIG_FILENAME);
  }
  return CONFIG_FILENAME; // flat key in the localStorage-backed virtual fs
}

export async function loadAppConfig(): Promise<AppConfig> {
  const raw = await readFile(await configPath());
  if (!raw) return DEFAULT_CONFIG;
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveAppConfig(config: AppConfig): Promise<void> {
  await writeFile(await configPath(), JSON.stringify(config, null, 2));
}

/** Turns "My Dark Fantasy Novel!" into "my-dark-fantasy-novel" for a folder name. */
export function slugify(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "untitled-story";
}

/** Adds/moves a project to the front of the recent list, deduped by path, capped at 12. */
export function upsertRecent(config: AppConfig, entry: RecentProject): AppConfig {
  const rest = config.recentProjects.filter((p) => p.path !== entry.path);
  return { ...config, recentProjects: [entry, ...rest].slice(0, 12) };
}

export function removeRecent(config: AppConfig, path: string): AppConfig {
  return { ...config, recentProjects: config.recentProjects.filter((p) => p.path !== path) };
}