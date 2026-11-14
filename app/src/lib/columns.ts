// Download table column model. Visibility is persisted in settings.appearance.visibleColumns,
// widths (a per-viewer convenience) in localStorage.

import { tk } from "./i18n";
import type { SortKey } from "./store";

export type ColumnKey =
  | "name"
  | "size"
  | "status"
  | "progress"
  | "speed"
  | "eta"
  | "lastTry"
  | "added"
  | "saveDir"
  | "category"
  | "description";

export interface ColumnDef {
  key: ColumnKey;
  /** Marked for translation: show it with `t(label)`. */
  label: string;
  width: number;
  min: number;
  flex?: number;
  align?: "end";
  sort?: SortKey;
}

export const COLUMNS: ColumnDef[] = [
  { key: "name", label: tk("Name"), width: 220, min: 150, flex: 2.3, sort: "name" },
  { key: "size", label: tk("Size"), width: 72, min: 58, flex: 0.72, align: "end", sort: "size" },
  { key: "status", label: tk("Status"), width: 104, min: 82, flex: 1.0, sort: "status" },
  { key: "progress", label: tk("Progress"), width: 136, min: 104, flex: 1.35, sort: "progress" },
  { key: "speed", label: tk("Speed"), width: 72, min: 58, flex: 0.72, align: "end", sort: "speed" },
  { key: "eta", label: tk("Time left"), width: 68, min: 56, flex: 0.68, align: "end", sort: "eta" },
  { key: "lastTry", label: tk("Last try"), width: 96, min: 72, flex: 0.9, align: "end", sort: "lastTry" },
  { key: "added", label: tk("Added"), width: 94, min: 72, flex: 0.92, align: "end", sort: "added" },
  { key: "saveDir", label: tk("Folder"), width: 150, min: 90, flex: 1.2, sort: "dir" },
  { key: "category", label: tk("Category"), width: 90, min: 68, flex: 0.85, sort: "category" },
  { key: "description", label: tk("Description"), width: 150, min: 90, flex: 1.2 },
];

export const COLUMN_KEYS = COLUMNS.map((c) => c.key);

/** Visible columns in canonical order; the name column is always shown. */
export function resolveColumns(visible: string[] | undefined): ColumnDef[] {
  const set = new Set(visible?.length ? visible : ["name", "size", "status", "progress", "speed", "eta", "added"]);
  set.add("name");
  return COLUMNS.filter((c) => set.has(c.key));
}

export function toggleColumn(visible: string[], key: ColumnKey): string[] {
  if (key === "name") return visible;
  const set = new Set(visible);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  return COLUMN_KEYS.filter((k) => set.has(k) || k === "name");
}

/** CSS grid template: leading checkbox (28px), sequential row # (30px), columns (proportional minmax by default, or fixed px when manually resized), trailing actions (32px). */
export function gridTemplate(cols: ColumnDef[], widths: Partial<Record<ColumnKey, number>>): string {
  const parts = cols.map((c) => {
    const custom = widths[c.key];
    if (c.key === "name") {
      const base = Math.max(c.min, custom ?? c.min);
      return `minmax(${base}px, ${c.flex ?? 2.3}fr)`;
    }
    if (custom != null) {
      return `${Math.max(c.min, custom)}px`;
    }
    return `minmax(${c.min}px, ${c.flex ?? 1}fr)`;
  });
  return `28px 30px ${parts.join(" ")} 32px`;
}

/** Minimum width of the whole row, so narrow windows scroll horizontally instead of squashing. */
export function minRowWidth(cols: ColumnDef[], widths: Partial<Record<ColumnKey, number>>): number {
  return (
    28 +
    30 +
    32 +
    16 +
    cols.reduce((sum, c) => {
      const custom = widths[c.key];
      return sum + Math.max(c.min, custom ?? c.min);
    }, 0)
  );
}

/** Proportionally fits visible columns into the given container width (in px). */
export function fitColumnsToWidth(cols: ColumnDef[], containerWidth: number): Partial<Record<ColumnKey, number>> {
  const fixedChrome = 28 + 30 + 32 + 24; // checkbox + # + more + horizontal padding
  const available = Math.max(480, containerWidth - fixedChrome);
  const nonName = cols.filter((c) => c.key !== "name");
  const baseOther = nonName.reduce((s, c) => s + c.width, 0);
  const baseName = 220;
  const totalBase = baseName + baseOther;
  const scale = Math.min(1.25, Math.max(0.68, available / totalBase));
  const out: Partial<Record<ColumnKey, number>> = {};
  let usedOther = 0;
  for (const c of nonName) {
    const w = Math.max(c.min, Math.round(c.width * scale));
    out[c.key] = w;
    usedOther += w;
  }
  out.name = Math.max(150, Math.round(available - usedOther));
  return out;
}
