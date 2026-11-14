// Application state (zustand). Items and live progress are kept in separate maps so
// the 4 Hz progress stream only re-renders the rows that changed.

import { create } from "zustand";
import { api, onCoreEvent } from "./api";
import { NATIVE_SOUNDS, soundFile } from "./sounds";
import type {
  Bootstrap,
  Category,
  CoreEvent,
  DownloadItem,
  GrabberProject,
  Progress,
  Queue,
  Settings,
  Status,
} from "./types";

/** Sidebar selection: a category, a status group, a queue, a grabber project or trash. */
export type View =
  | { kind: "all" }
  | { kind: "category"; id: string }
  | { kind: "status"; id: "unfinished" | "finished" | "active" | "failed" }
  | { kind: "queue"; id: string }
  | { kind: "grabber"; id: string }
  | { kind: "trash" };

export type SortKey = "name" | "size" | "status" | "progress" | "speed" | "eta" | "added" | "lastTry" | "category" | "dir";

export interface AppState {
  ready: boolean;
  version: string;
  dataDir: string;
  items: Record<string, DownloadItem>;
  progress: Record<string, Progress>;
  categories: Category[];
  queues: Queue[];
  settings: Settings | null;
  grabberProjects: GrabberProject[];
  view: View;
  selection: string[];
  anchor: string | null;
  search: string;
  sort: { key: SortKey; dir: 1 | -1 };
  postAction: { action: string; deadline: number } | null;

  init: () => Promise<void>;
  setView: (v: View) => void;
  select: (ids: string[], anchor?: string | null) => void;
  setSearch: (s: string) => void;
  setSort: (key: SortKey) => void;
  applySettings: (s: Settings) => void;
}

const ACTIVE: Status[] = ["connecting", "downloading", "retrying", "processing"];

export const isActive = (s: Status) => ACTIVE.includes(s);

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  version: "",
  dataDir: "",
  items: {},
  progress: {},
  categories: [],
  queues: [],
  settings: null,
  grabberProjects: [],
  view: { kind: "all" },
  selection: [],
  anchor: null,
  search: "",
  sort: { key: "added", dir: -1 },
  postAction: null,

  init: async () => {
    if (get().ready) return;
    const [boot, native]: [Bootstrap, boolean] = await Promise.all([api.bootstrap(), api.nativeMaterial().catch(() => true)]);
    nativeMaterial = native;
    const items: Record<string, DownloadItem> = {};
    for (const i of boot.items) items[i.id] = i;
    set({
      ready: true,
      version: boot.version,
      dataDir: boot.dataDir,
      items,
      categories: boot.categories,
      queues: boot.queues,
      settings: boot.settings,
      grabberProjects: boot.grabberProjects,
    });
    applyAppearance(boot.settings);
    await onCoreEvent(handleEvent);
  },

  setView: (view) => set({ view, selection: [], anchor: null }),
  select: (ids, anchor) => set({ selection: ids, anchor: anchor === undefined ? get().anchor : anchor }),
  setSearch: (search) => set({ search }),
  setSort: (key) => {
    const cur = get().sort;
    set({ sort: { key, dir: cur.key === key ? (cur.dir === 1 ? -1 : 1) : key === "name" ? 1 : -1 } });
  },
  applySettings: (settings) => {
    set({ settings });
    applyAppearance(settings);
  },
}));

export function handleEvent(e: CoreEvent) {
  const st = useApp.getState();
  switch (e.type) {
    case "itemsAdded": {
      // Also the whole list again after the window missed events (see main.rs): live progress
      // of a download that has stopped meanwhile goes.
      const items = { ...st.items };
      const progress = { ...st.progress };
      let addedTorrent = false;
      for (const i of e.payload) {
        if (!st.items[i.id] && i.kind === "torrent") addedTorrent = true;
        items[i.id] = i;
        if (!isActive(i.status)) delete progress[i.id];
      }
      useApp.setState({ items, progress });
      if (addedTorrent && e.payload.length === 1) {
        void import("./ui").then(({ useUi }) => useUi.getState().setAppMode("jtm"));
      }
      break;
    }
    case "itemUpdated": {
      const prev = st.items[e.payload.id];
      const items = { ...st.items, [e.payload.id]: e.payload };
      // Drop stale live progress once a job stops.
      if (!isActive(e.payload.status) && st.progress[e.payload.id]) {
        const progress = { ...st.progress };
        delete progress[e.payload.id];
        useApp.setState({ items, progress });
      } else if (prev !== e.payload) {
        useApp.setState({ items });
      }
      break;
    }
    case "itemsRemoved": {
      const items = { ...st.items };
      const progress = { ...st.progress };
      for (const id of e.payload) {
        delete items[id];
        delete progress[id];
      }
      useApp.setState({ items, progress, selection: st.selection.filter((s) => !e.payload.includes(s)) });
      break;
    }
    case "progress": {
      // #41: progress that arrives after its download finished would keep the row "downloading"
      // until the window is opened again. A download that starts again always reports an active
      // status (itemUpdated) before its first progress, so a stopped item's progress is stale.
      const progress = { ...st.progress };
      for (const p of e.payload) {
        const item = st.items[p.id];
        if (!item || isActive(item.status)) progress[p.id] = p;
      }
      useApp.setState({ progress });
      break;
    }
    case "queuesChanged":
      useApp.setState({ queues: e.payload });
      break;
    case "categoriesChanged":
      useApp.setState({ categories: e.payload });
      break;
    case "settingsChanged":
      st.applySettings(e.payload);
      break;
    case "playSound":
      // On Linux the app plays it (once), not each window.
      if (!NATIVE_SOUNDS) playSound(e.payload.kind);
      break;
    case "postActionPending":
      useApp.setState({
        postAction: { action: e.payload.action.type, deadline: Date.now() + e.payload.seconds * 1000 },
      });
      break;
    case "grabber":
      if (e.payload.event.type === "finished") {
        api.grabberProjects().then((grabberProjects) => useApp.setState({ grabberProjects }));
      }
      break;
    default:
      break;
  }
}

/** Reflect appearance settings on <html> (theme, accent, density, glass, motion). */
/**
 * Whether the OS puts a material behind the window (Mica on Windows 11, vibrancy on macOS).
 * Without one (Linux, Windows 10) the window keeps its own background: a see-through canvas would
 * show the desktop, whatever it looks like, behind the light or dark theme.
 */
let nativeMaterial = true;

export function applyAppearance(s: Settings) {
  const root = document.documentElement;
  const a = s.appearance;
  const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
  const theme = a.theme === "system" ? (systemDark ? "dark" : "light") : a.theme;
  const mode = (root.dataset.mode as "jdm" | "jtm" | undefined) || "jdm";
  root.dataset.mode = mode;
  root.dataset.theme = theme;
  root.dataset.accent = mode === "jtm" ? (a.jtmAccent || "neon-emerald") : (a.accent || "jenzo");
  root.dataset.density = a.density;
  root.dataset.neon = String(a.neonGlow !== false);

  const transparentOn = a.windowTransparency !== false && !a.reduceTransparency;
  root.classList.toggle("no-blur", !transparentOn);
  root.dataset.transparent = String(transparentOn);

  if (transparentOn) {
    const level = Math.max(0, Math.min(100, a.transparencyLevel ?? 75));
    const tRatio = level / 100; // 0 = opaque, 1 = max transparency
    const isLight = theme === "light";
    const baseRgb = isLight ? "248 249 252" : "22 23 31";
    const strongRgb = isLight ? "250 250 253" : "20 21 29";
    const subtleRgb = isLight ? "248 249 252" : "18 19 26";
    const tintAlpha = (0.95 - tRatio * 0.68).toFixed(2);
    const strongAlpha = (0.98 - tRatio * 0.56).toFixed(2);
    const subtleAlpha = (0.90 - tRatio * 0.72).toFixed(2);
    const blurLg = Math.round(14 + tRatio * 34);
    root.style.setProperty("--glass-tint", `rgb(${baseRgb} / ${tintAlpha})`);
    root.style.setProperty("--glass-tint-strong", `rgb(${strongRgb} / ${strongAlpha})`);
    root.style.setProperty("--glass-tint-subtle", `rgb(${subtleRgb} / ${subtleAlpha})`);
    root.style.setProperty("--wframe-tint", `rgb(${strongRgb} / ${strongAlpha})`);
    root.style.setProperty("--blur-lg", `${blurLg}px`);
  } else {
    root.style.removeProperty("--glass-tint");
    root.style.removeProperty("--glass-tint-strong");
    root.style.removeProperty("--glass-tint-subtle");
    root.style.removeProperty("--wframe-tint");
    root.style.removeProperty("--blur-lg");
  }

  const reduced =
    a.motion === "reduced" || (a.motion === "system" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  root.classList.toggle("reduce-motion", !!reduced);
  root.classList.toggle("window-material", (a.windowMaterial && nativeMaterial) || transparentOn);
}

if (typeof window !== "undefined") {
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    const s = useApp.getState().settings;
    if (s) applyAppearance(s);
  });
  window.addEventListener("jenzo-mode-change", () => {
    const st = useApp.getState();
    st.select([]);
    if (st.settings) applyAppearance(st.settings);
  });
}

const soundCache: Record<string, HTMLAudioElement> = {};

/** Plays `kind`'s sound; `completeSound` previews a complete sound other than the chosen one. */
export function playSound(kind: string, completeSound?: string) {
  const s = useApp.getState().settings;
  if (!s?.sounds.enabled) return;
  if (NATIVE_SOUNDS) {
    void api.playSound(kind, completeSound).catch(() => undefined);
    return;
  }
  const file = soundFile(kind, completeSound ?? s.sounds.completeSound);
  const audio = (soundCache[file] ??= new Audio(`/sounds/${file}.wav`));
  audio.volume = Math.max(0, Math.min(1, s.sounds.volume));
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
}

/** Items visible in the current view, filtered by search, mode ("jdm" | "jtm") and sorted. */
export function visibleItems(st: AppState, mode?: "jdm" | "jtm"): DownloadItem[] {
  const { view, search, sort } = st;
  const q = search.trim().toLowerCase();
  const all = Object.values(st.items);
  const filtered = all.filter((i) => {
    if (mode === "jtm" && i.kind !== "torrent") return false;
    if (mode === "jdm" && i.kind === "torrent") return false;
    if (view.kind === "trash") {
      if (!i.trashed) return false;
    } else if (i.trashed) return false;
    switch (view.kind) {
      case "category":
        if (i.category !== view.id) return false;
        break;
      case "status":
        if (view.id === "finished" && i.status !== "completed") return false;
        if (view.id === "unfinished" && i.status === "completed") return false;
        if (view.id === "active" && !isActive(i.status) && i.status !== "queued") return false;
        if (view.id === "failed" && i.status !== "failed") return false;
        break;
      case "queue":
        if (i.queueId !== view.id) return false;
        break;
      case "grabber":
        if (i.grabberProject !== view.id) return false;
        break;
    }
    if (q && !i.fileName.toLowerCase().includes(q) && !i.url.toLowerCase().includes(q) && !i.description.toLowerCase().includes(q))
      return false;
    return true;
  });
  const prog = st.progress;
  const val = (i: DownloadItem): number | string => {
    switch (sort.key) {
      case "name":
        return i.fileName.toLowerCase();
      case "size":
        return i.size ?? -1;
      case "status":
        return i.status;
      case "progress":
        return prog[i.id]?.fraction ?? (i.size ? (prog[i.id]?.downloaded ?? i.downloaded) / i.size : i.status === "completed" ? 1 : 0);
      case "speed":
        return prog[i.id]?.speed ?? 0;
      case "eta":
        return prog[i.id]?.etaSecs ?? Number.MAX_SAFE_INTEGER;
      case "lastTry":
        return i.lastTryAt ?? 0;
      case "category":
        return i.category;
      case "dir":
        return i.saveDir.toLowerCase();
      case "added":
      default:
        return i.addedAt;
    }
  };
  // Inside a queue the user-defined order wins unless another column is chosen.
  const byQueue = view.kind === "queue" && sort.key === "added";
  return filtered.sort((a, b) => {
    if (byQueue) return a.position - b.position;
    const va = val(a);
    const vb = val(b);
    return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
  });
}

export function counts(st: AppState, mode?: "jdm" | "jtm") {
  const c = { all: 0, unfinished: 0, finished: 0, active: 0, failed: 0, trash: 0, byCategory: {} as Record<string, number>, byQueue: {} as Record<string, number>, jdmActive: 0, jtmActive: 0, jdmTotal: 0, jtmTotal: 0 };
  for (const i of Object.values(st.items)) {
    if (!i.trashed) {
      if (i.kind === "torrent") {
        c.jtmTotal++;
        if (isActive(i.status) || i.status === "queued") c.jtmActive++;
      } else {
        c.jdmTotal++;
        if (isActive(i.status) || i.status === "queued") c.jdmActive++;
      }
    }
    if (mode === "jtm" && i.kind !== "torrent") continue;
    if (mode === "jdm" && i.kind === "torrent") continue;
    if (i.trashed) {
      c.trash++;
      continue;
    }
    c.all++;
    if (i.status === "completed") c.finished++;
    else c.unfinished++;
    if (isActive(i.status) || i.status === "queued") c.active++;
    if (i.status === "failed") c.failed++;
    c.byCategory[i.category] = (c.byCategory[i.category] ?? 0) + 1;
    if (i.queueId) c.byQueue[i.queueId] = (c.byQueue[i.queueId] ?? 0) + 1;
  }
  return c;
}
