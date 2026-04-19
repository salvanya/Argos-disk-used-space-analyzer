import type {
  AppConfig,
  FolderPickerResponse,
  LevelScanNode,
  LevelScanResult,
  ScanSummary,
  SystemInfo,
} from "./types";

let _token = "";

export function setToken(token: string): void {
  _token = token;
}

function authHeaders(): HeadersInit {
  return { "X-Argos-Token": _token };
}

async function get<T>(path: string, authed = true): Promise<T> {
  const resp = await fetch(path, { headers: authed ? authHeaders() : {} });
  if (!resp.ok) throw new Error(`GET ${path} → ${resp.status}`);
  return resp.json() as Promise<T>;
}

export async function fetchConfig(): Promise<AppConfig> {
  return get<AppConfig>("/api/config", false);
}

export async function fetchSystemInfo(): Promise<SystemInfo> {
  return get<SystemInfo>("/api/system/info");
}

export async function openFolderPicker(): Promise<FolderPickerResponse> {
  return get<FolderPickerResponse>("/api/folder-picker");
}

export async function listScans(): Promise<ScanSummary[]> {
  return get<ScanSummary[]>("/api/scans");
}

async function del(path: string, body: unknown): Promise<void> {
  const resp = await fetch(path, {
    method: "DELETE",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const detail = await resp
      .json()
      .then((j: { detail?: string }) => j.detail ?? resp.statusText)
      .catch(() => resp.statusText);
    throw new Error(detail);
  }
}

async function post(path: string, body: unknown): Promise<void> {
  const resp = await fetch(path, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const detail = await resp
      .json()
      .then((j: { detail?: string }) => j.detail ?? resp.statusText)
      .catch(() => resp.statusText);
    throw new Error(detail);
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(path, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const detail = await resp
      .json()
      .then((j: { detail?: string }) => j.detail ?? resp.statusText)
      .catch(() => resp.statusText);
    throw new Error(detail);
  }
  return resp.json() as Promise<T>;
}

export async function openInExplorer(path: string): Promise<void> {
  return post("/api/fs/open", { path });
}

export async function relaunchAdmin(): Promise<void> {
  return post("/api/system/relaunch-admin", {});
}

export async function deleteAllScans(): Promise<void> {
  const resp = await fetch("/api/scans", {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!resp.ok) throw new Error(`DELETE /api/scans → ${resp.status}`);
}

export async function deleteItem(path: string, permanent: boolean): Promise<void> {
  return del("/api/fs/item", { path, permanent, confirm: true });
}

export interface ScanOptionsPayload {
  include_hidden?: boolean;
  include_system?: boolean;
  exclude?: string[];
}

interface WireLevelScanNode {
  name: string;
  path: string;
  node_type: "file" | "folder" | "symlink";
  size: number | null;
  accessible: boolean;
  is_link: boolean;
  link_target: string | null;
}

interface WireLevelScanResult {
  root_path: string;
  folder_path: string;
  scanned_at: string;
  duration_seconds: number;
  accessible: boolean;
  is_link: boolean;
  direct_files: number;
  direct_folders: number;
  direct_bytes_known: number;
  error_count: number;
  children: WireLevelScanNode[];
  options_hash: string;
}

function nodeFromWire(n: WireLevelScanNode): LevelScanNode {
  return {
    name: n.name,
    path: n.path,
    nodeType: n.node_type,
    size: n.size,
    accessible: n.accessible,
    isLink: n.is_link,
    linkTarget: n.link_target,
  };
}

function resultFromWire(r: WireLevelScanResult): LevelScanResult {
  return {
    rootPath: r.root_path,
    folderPath: r.folder_path,
    scannedAt: r.scanned_at,
    durationSeconds: r.duration_seconds,
    accessible: r.accessible,
    isLink: r.is_link,
    directFiles: r.direct_files,
    directFolders: r.direct_folders,
    directBytesKnown: r.direct_bytes_known,
    errorCount: r.error_count,
    children: r.children.map(nodeFromWire),
    optionsHash: r.options_hash,
  };
}

export async function scanLevel(
  rootPath: string,
  folderPath: string,
  options: ScanOptionsPayload = {},
  forceRescan = false,
): Promise<LevelScanResult> {
  const wire = await postJson<WireLevelScanResult>("/api/scan/level", {
    root: rootPath,
    path: folderPath,
    options,
    force_rescan: forceRescan,
  });
  return resultFromWire(wire);
}

export async function invalidateLevel(
  rootPath: string,
  folderPath: string,
  recursive: boolean,
): Promise<void> {
  return del("/api/scan/level", { root: rootPath, path: folderPath, recursive });
}
