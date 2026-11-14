// UI-only state (open sheets/dialogs, context menu, toasts, layout preferences).
// Domain state lives in store.ts; this never talks to the backend.

import { create } from "zustand";
import type { ColumnKey } from "./columns";
import { t } from "./i18n";
import type { Category } from "./types";

export type Sheet =
  | { kind: "settings"; section?: string }
  | { kind: "scheduler"; queueId?: string }
  | { kind: "grabber"; projectId?: string | null }
  | { kind: "whatsnew" }
  | { kind: "analytics" };

export type Dialog =
  | { kind: "category"; category?: Category }
  | { kind: "properties"; id: string }
  | { kind: "delete"; ids: string[]; trash: boolean; withFiles?: boolean }
  | { kind: "batch" }
  | { kind: "speedLimit"; ids: string[] }
  | { kind: "refreshUrl"; id: string };

export type MenuEntry =
  | {
      label: string;
      icon?: import("../design/icons/names").IconName;
      kbd?: string;
      danger?: boolean;
      disabled?: boolean;
      checked?: boolean;
      onSelect?: () => void;
      submenu?: MenuEntry[];
    }
  | { separator: true }
  | { heading: string };

export interface MenuState {
  entries: MenuEntry[];
  x: number;
  y: number;
  /** Anchor rect height so menus opened from buttons drop below them. */
  minWidth?: number;
}

export type ToastKind = "info" | "success" | "error";
export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
  action?: { label: string; run: () => void };
}

const LS = "jenzo.ui";

export type AppMode = "jdm" | "jtm";

interface Persisted {
  layoutV?: number;
  appMode: AppMode;
  sidebarCollapsed: boolean;
  collapsedSections: Record<string, boolean>;
  bottomOpen: boolean;
  bottomTab: "connections" | "speed" | "info" | "files" | "trackers";
  bottomHeight: number;
  widths: Partial<Record<ColumnKey, number>>;
}

function load(): Persisted {
  const fallback: Persisted = {
    layoutV: 2,
    appMode: "jdm",
    sidebarCollapsed: false,
    collapsedSections: { tools: true, grabber: true },
    bottomOpen: true,
    bottomTab: "connections",
    bottomHeight: 248,
    widths: {},
  };
  try {
    const raw = JSON.parse(localStorage.getItem(LS) ?? "{}");
    const parsed: Persisted = { ...fallback, ...raw };
    if (raw.layoutV !== 2) {
      parsed.layoutV = 2;
      parsed.widths = {};
      parsed.collapsedSections = { tools: true, grabber: true, ...(raw.collapsedSections ?? {}) };
      try {
        localStorage.setItem(LS, JSON.stringify(parsed));
      } catch {
        /* ignore */
      }
    }
    if (typeof document !== "undefined") document.documentElement.dataset.mode = parsed.appMode;
    return parsed;
  } catch {
    if (typeof document !== "undefined") document.documentElement.dataset.mode = fallback.appMode;
    return fallback;
  }
}

function save(p: Persisted) {
  try {
    localStorage.setItem(LS, JSON.stringify(p));
  } catch {
    /* storage unavailable (private mode / preview) */
  }
}

export type StatusFilter = "all" | "active" | "queued" | "completed" | "failed";

interface UiState extends Persisted {
  filter: StatusFilter;
  setFilter: (f: StatusFilter) => void;
  setAppMode: (m: AppMode) => void;
  toggleAppMode: () => void;
  toggleSection: (id: string) => void;
  sheet: Sheet | null;
  dialog: Dialog | null;
  menu: MenuState | null;
  toasts: Toast[];
  searchFocus: number;
  dragOver: boolean;

  openSheet: (s: Sheet) => void;
  closeSheet: () => void;
  openDialog: (d: Dialog) => void;
  closeDialog: () => void;
  openMenu: (m: MenuState) => void;
  closeMenu: () => void;
  focusSearch: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setBottom: (p: Partial<Pick<Persisted, "bottomOpen" | "bottomTab" | "bottomHeight">>) => void;
  setWidth: (key: ColumnKey, w: number) => void;
  setWidths: (w: Partial<Record<ColumnKey, number>>) => void;
  resetWidths: () => void;
  setDragOver: (v: boolean) => void;
  dismissToast: (id: number) => void;
}

const persisted = (s: UiState): Persisted => ({
  layoutV: 2,
  appMode: s.appMode,
  sidebarCollapsed: s.sidebarCollapsed,
  collapsedSections: s.collapsedSections,
  bottomOpen: s.bottomOpen,
  bottomTab: s.bottomTab,
  bottomHeight: s.bottomHeight,
  widths: s.widths,
});

export const useUi = create<UiState>((set, get) => ({
  ...load(),
  filter: "all",
  setFilter: (filter) => set({ filter }),
  setAppMode: (appMode) => {
    set({ appMode });
    save(persisted(get()));
    document.documentElement.dataset.mode = appMode;
    window.dispatchEvent(new CustomEvent("jenzo-mode-change", { detail: appMode }));
  },
  toggleAppMode: () => {
    const next: AppMode = get().appMode === "jdm" ? "jtm" : "jdm";
    get().setAppMode(next);
  },
  toggleSection: (id) => {
    const cur = get().collapsedSections ?? {};
    set({ collapsedSections: { ...cur, [id]: !cur[id] } });
    save(persisted(get()));
  },
  sheet: null,
  dialog: null,
  menu: null,
  toasts: [],
  searchFocus: 0,
  dragOver: false,

  openSheet: (sheet) => set({ sheet, menu: null }),
  closeSheet: () => set({ sheet: null, menu: null }),
  openDialog: (dialog) => set({ dialog, menu: null }),
  closeDialog: () => set({ dialog: null, menu: null }),
  openMenu: (menu) => set({ menu }),
  closeMenu: () => set({ menu: null }),
  focusSearch: () => set({ searchFocus: get().searchFocus + 1 }),
  toggleSidebar: () => {
    set({ sidebarCollapsed: !get().sidebarCollapsed });
    save(persisted(get()));
  },
  setSidebarCollapsed: (sidebarCollapsed) => {
    set({ sidebarCollapsed });
    save(persisted(get()));
  },
  setBottom: (p) => {
    set(p);
    save(persisted(get()));
  },
  setWidth: (key, w) => {
    set({ widths: { ...get().widths, [key]: Math.round(w) } });
    save(persisted(get()));
  },
  setWidths: (widths) => {
    set({ widths });
    save(persisted(get()));
  },
  resetWidths: () => {
    set({ widths: {} });
    save(persisted(get()));
  },
  setDragOver: (dragOver) => set({ dragOver }),
  dismissToast: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}));

let toastSeq = 0;

export function toast(title: string, opts: { kind?: ToastKind; body?: string; action?: Toast["action"]; ms?: number } = {}) {
  const id = ++toastSeq;
  const entry: Toast = { id, kind: opts.kind ?? "info", title, body: opts.body, action: opts.action };
  useUi.setState((s) => ({ toasts: [...s.toasts.slice(-3), entry] }));
  const ms = opts.ms ?? (entry.kind === "error" ? 8000 : 4500);
  setTimeout(() => useUi.getState().dismissToast(id), ms);
  return id;
}

/** Run a backend call; failures become an error toast instead of an unhandled rejection. */
export async function attempt<T>(p: Promise<T>, failTitle = t("Something went wrong")): Promise<T | undefined> {
  try {
    return await p;
  } catch (e) {
    toast(failTitle, { kind: "error", body: e instanceof Error ? e.message : String(e) });
    return undefined;
  }
}
