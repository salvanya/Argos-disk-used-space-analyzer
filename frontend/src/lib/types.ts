export interface SystemInfo {
  is_admin: boolean;
  platform: string;
}

export interface AppConfig {
  token: string;
}

export interface FolderPickerResponse {
  path: string | null;
}

export interface ScanSummary {
  root_path: string;
  scanned_at: string;
  total_files: number;
  total_folders: number;
  total_size: number;
  error_count: number;
  duration_seconds: number;
}

export interface ScanNode {
  name: string;
  path: string;
  node_type: "file" | "folder" | "symlink";
  size: number;
  accessible: boolean;
  is_link: boolean;
  link_target: string | null;
  children: ScanNode[];
}

export interface ScanResult {
  root: ScanNode;
  scanned_at: string;
  duration_seconds: number;
  total_files: number;
  total_folders: number;
  total_size: number;
  error_count: number;
}

export type WsMessage =
  | { type: "progress"; node_count: number }
  | { type: "complete"; result: ScanResult }
  | { type: "error"; message: string };
