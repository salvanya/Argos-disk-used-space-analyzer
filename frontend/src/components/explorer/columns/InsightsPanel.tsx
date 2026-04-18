import { useTranslation } from "react-i18next";
import { BarChart2, Folder, FileText } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useExplorerStore } from "../../../stores/explorerStore";
import { useScanStore } from "../../../stores/scanStore";
import { getDirectChildren } from "./contents/contentsUtils";
import { formatSize } from "./tree/treeUtils";
import {
  getPieData,
  getTopN,
  getSummaryStats,
  getTypeBreakdown,
} from "./insights/insightsUtils";

const TOP_N = 10;

export function InsightsPanel() {
  const { t } = useTranslation();
  const focusedPath = useExplorerStore((s) => s.focusedPath);
  const result = useScanStore((s) => s.result);

  const children =
    focusedPath && result ? getDirectChildren(result.root, focusedPath) : null;

  if (!children || children.length === 0) {
    return (
      <div className="glass flex h-full flex-col overflow-hidden">
        <PanelHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <BarChart2 size={28} className="text-white/15" />
          <p className="text-xs text-white/30">{t("explorer.insights.noData")}</p>
        </div>
      </div>
    );
  }

  const pieSlices = getPieData(children);
  const topItems = getTopN(children, TOP_N);
  const stats = getSummaryStats(children, result!.root);
  const breakdown = getTypeBreakdown(children);

  return (
    <div className="glass flex h-full flex-col overflow-hidden">
      <PanelHeader />
      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
        <SummaryStats stats={stats} />
        <PieSection slices={pieSlices} />
        <TopNSection items={topItems} n={TOP_N} />
        <TypeBreakdownSection rows={breakdown} />
      </div>
    </div>
  );
}

function PanelHeader() {
  const { t } = useTranslation();
  return (
    <div className="border-b border-white/10 px-4 py-3 shrink-0">
      <span className="text-xs font-semibold uppercase tracking-widest text-white/40">
        {t("explorer.insightsPanel")}
      </span>
    </div>
  );
}

interface SummaryStatsProps {
  stats: ReturnType<typeof getSummaryStats>;
}

function SummaryStats({ stats }: SummaryStatsProps) {
  const { t } = useTranslation();
  return (
    <section>
      <SectionTitle>{t("explorer.insights.summary")}</SectionTitle>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <StatTile label={t("explorer.insights.totalSize")} value={formatSize(stats.totalSize)} />
        <StatTile label={t("explorer.insights.files")} value={String(stats.fileCount)} />
        <StatTile label={t("explorer.insights.folders")} value={String(stats.folderCount)} />
        <StatTile
          label={t("explorer.insights.largestFile")}
          value={stats.largestFile ? stats.largestFile.name : "—"}
          title={stats.largestFile?.path}
        />
      </div>
    </section>
  );
}

interface StatTileProps {
  label: string;
  value: string;
  title?: string;
}

function StatTile({ label, value, title }: StatTileProps) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/8 px-3 py-2 min-w-0">
      <p className="text-[10px] text-white/40 uppercase tracking-wider truncate">{label}</p>
      <p className="text-sm font-semibold text-white/80 truncate mt-0.5" title={title}>{value}</p>
    </div>
  );
}

interface PieSectionProps {
  slices: ReturnType<typeof getPieData>;
}

function PieSection({ slices }: PieSectionProps) {
  const { t } = useTranslation();
  if (slices.length === 0) return null;
  return (
    <section>
      <SectionTitle>{t("explorer.insights.pieTitle")}</SectionTitle>
      <div className="mt-2 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="40%"
              outerRadius="65%"
              paddingAngle={2}
            >
              {slices.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatSize(value)}
              contentStyle={{
                background: "rgba(10,10,11,0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) =>
                value.length > 16 ? value.slice(0, 14) + "…" : value
              }
              wrapperStyle={{ fontSize: 11 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

interface TopNSectionProps {
  items: ReturnType<typeof getTopN>;
  n: number;
}

function TopNSection({ items, n }: TopNSectionProps) {
  const { t } = useTranslation();
  if (items.length === 0) return null;
  return (
    <section>
      <SectionTitle>{t("explorer.insights.topHeaviest", { n })}</SectionTitle>
      <ul className="mt-2 space-y-1.5">
        {items.map(({ node, pct }) => (
          <li key={node.path} className="group">
            <div className="flex items-center justify-between gap-2 text-xs mb-0.5">
              <span className="flex items-center gap-1.5 min-w-0">
                {node.node_type === "folder" ? (
                  <Folder size={11} className="shrink-0 text-accent-blue" />
                ) : (
                  <FileText size={11} className="shrink-0 text-white/40" />
                )}
                <span className="truncate text-white/70" title={node.path}>{node.name}</span>
              </span>
              <span className="shrink-0 text-white/40 font-mono">{formatSize(node.size)}</span>
            </div>
            <div className="h-0.5 w-full rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-accent-blue/60 transition-all"
                style={{ width: `${Math.max(pct * 100, 0.5)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface TypeBreakdownSectionProps {
  rows: ReturnType<typeof getTypeBreakdown>;
}

function TypeBreakdownSection({ rows }: TypeBreakdownSectionProps) {
  const { t } = useTranslation();
  if (rows.length === 0) return null;
  return (
    <section>
      <SectionTitle>{t("explorer.insights.typeBreakdown")}</SectionTitle>
      <div className="mt-2 space-y-1.5">
        {rows.map((row) => (
          <div key={row.category} className="text-xs">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-white/70 truncate">{row.category}</span>
              <span className="shrink-0 text-white/40 font-mono">
                {formatSize(row.size)}
                <span className="text-white/25 ml-1">({row.count})</span>
              </span>
            </div>
            <div className="h-0.5 w-full rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-violet-400/50 transition-all"
                style={{ width: `${Math.max(row.pct * 100, 0.5)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/35">
      {children}
    </h3>
  );
}
