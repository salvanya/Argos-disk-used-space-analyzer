export interface Breadcrumb {
  name: string;
  path: string;
}

function detectSeparator(path: string): "\\" | "/" {
  return path.includes("\\") ? "\\" : "/";
}

function stripTrailingSeparators(path: string): string {
  return path.replace(/[\\/]+$/, "");
}

function isDriveRoot(path: string): boolean {
  return /^[A-Za-z]:$/.test(path);
}

function rootLabel(path: string, separator: "\\" | "/"): string {
  if (isDriveRoot(path)) return `${path}${separator}`;
  const parts = path.split(/[\\/]+/).filter(Boolean);
  const last = parts[parts.length - 1];
  return last ?? path;
}

export function buildSegments(rootPath: string, currentPath: string): Breadcrumb[] {
  const separator = detectSeparator(rootPath);
  const normRootStripped = stripTrailingSeparators(rootPath);
  const normRoot = normRootStripped.length === 0 ? rootPath : normRootStripped;
  const normCurrent = stripTrailingSeparators(currentPath);

  const rootDisplayPath = isDriveRoot(normRoot) ? `${normRoot}${separator}` : normRoot;
  const rootSegment: Breadcrumb = {
    name: rootLabel(normRoot, separator),
    path: rootDisplayPath,
  };

  if (normCurrent === normRoot || normCurrent === rootDisplayPath) {
    return [rootSegment];
  }

  const rootPrefixWithSep = rootDisplayPath.endsWith(separator)
    ? rootDisplayPath
    : `${rootDisplayPath}${separator}`;

  if (!normCurrent.startsWith(rootPrefixWithSep)) {
    return [rootSegment];
  }

  const relative = normCurrent.slice(rootPrefixWithSep.length);
  const parts = relative.split(/[\\/]+/).filter(Boolean);

  const segments: Breadcrumb[] = [rootSegment];
  let accumulated = rootDisplayPath;
  for (const part of parts) {
    accumulated = accumulated.endsWith(separator)
      ? `${accumulated}${part}`
      : `${accumulated}${separator}${part}`;
    segments.push({ name: part, path: accumulated });
  }
  return segments;
}

export function parentOf(currentPath: string, rootPath: string): string | null {
  const separator = detectSeparator(rootPath);
  const normRootStripped = stripTrailingSeparators(rootPath);
  const normRoot = normRootStripped.length === 0 ? rootPath : normRootStripped;
  const normCurrent = stripTrailingSeparators(currentPath);

  const rootDisplayPath = isDriveRoot(normRoot) ? `${normRoot}${separator}` : normRoot;
  if (normCurrent === normRoot || normCurrent === rootDisplayPath) return null;

  const rootPrefixWithSep = rootDisplayPath.endsWith(separator)
    ? rootDisplayPath
    : `${rootDisplayPath}${separator}`;
  if (!normCurrent.startsWith(rootPrefixWithSep)) return null;

  const lastSep = Math.max(normCurrent.lastIndexOf("\\"), normCurrent.lastIndexOf("/"));
  if (lastSep < 0) return null;

  const parent = normCurrent.slice(0, lastSep);
  if (parent.length <= normRoot.length) return rootDisplayPath;
  return parent;
}
