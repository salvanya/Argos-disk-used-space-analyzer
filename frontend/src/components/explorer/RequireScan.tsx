import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useScanStore } from "../../stores/scanStore";

interface RequireScanProps {
  children: ReactNode;
}

export function RequireScan({ children }: RequireScanProps) {
  const result = useScanStore((s) => s.result);
  if (!result) return <Navigate to="/" replace />;
  return <>{children}</>;
}
