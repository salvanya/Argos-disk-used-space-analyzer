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
  options_hash: string;
  direct_files: number;
  direct_folders: number;
  direct_bytes_known: number;
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

export interface LevelScanNode {
  name: string;
  path: string;
  nodeType: "file" | "folder" | "symlink";
  size: number | null;
  accessible: boolean;
  isLink: boolean;
  linkTarget: string | null;
}

export interface LevelScanResult {
  rootPath: string;
  folderPath: string;
  scannedAt: string;
  durationSeconds: number;
  accessible: boolean;
  isLink: boolean;
  directFiles: number;
  directFolders: number;
  directBytesKnown: number;
  errorCount: number;
  children: LevelScanNode[];
  optionsHash: string;
}
