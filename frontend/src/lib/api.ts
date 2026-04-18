import type {
  AppConfig,
  FolderPickerResponse,
  ScanSummary,
  SystemInfo,
  WsMessage,
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

export function connectScanWs(
  token: string,
  root: string,
  forceRescan: boolean,
  onMessage: (msg: WsMessage) => void,
  onClose: () => void,
): WebSocket {
  const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${wsProto}//${window.location.host}/ws/scan`);

  ws.onopen = () => {
    ws.send(
      JSON.stringify({ token, root, options: {}, force_rescan: forceRescan }),
    );
  };

  ws.onmessage = (event: MessageEvent) => {
    const msg = JSON.parse(event.data as string) as WsMessage;
    onMessage(msg);
  };

  ws.onclose = onClose;

  return ws;
}
