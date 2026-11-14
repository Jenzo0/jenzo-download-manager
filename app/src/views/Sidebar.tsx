import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { BrandTile } from "../components/LogoMark";
import { openMenuAt } from "../components/MenuHost";
import { Sparkline } from "../components/Visuals";
import { Icon, type IconName } from "../design/icons";
import { actions, patchSettings } from "../lib/actions";
import { api, type IntegrationStatus } from "../lib/api";
import { formatBytes, formatSpeed } from "../lib/format";
import { t, tr } from "../lib/i18n";
import { categoryIcon, displayName } from "../lib/present";
import { Ring } from "../lib/ring";
import { type AppState, counts, useApp, type View } from "../lib/store";
import { openTools, selectedMediaPaths } from "../lib/tools";
import { attempt, useUi } from "../lib/ui";

const same = (a: View, b: View) => a.kind === b.kind && ("id" in a ? a.id : "") === ("id" in b ? b.id : "");

function NavItem({ view, icon, label, extra, onContext, collapsed }: { view: View; icon: IconName; label: string; extra?: ReactNode; onContext?: (e: React.MouseEvent) => void; collapsed?: boolean }) {
  const current = useApp((s) => same(s.view, view));
  return (
    <button
      type="button"
      className="side-item"
      aria-current={current ? "true" : undefined}
      data-tip={collapsed ? label : undefined}
      onClick={() => useApp.getState().setView(view)}
      onContextMenu={
        onContext &&
        ((e) => {
          e.preventDefault();
          onContext(e);
        })
      }
    >
      <Icon name={icon} size={16} />
      <span className="side-item__label">{label}</span>
      {extra}
    </button>
  );
}

const Count = ({ n }: { n: number }) => <span className="count">{n}</span>;

/** A Tools entry: opens the Tools window (with the selected finished media files, if any). */
function ToolItem({ icon, label, tab, collapsed }: { icon: IconName; label: string; tab: "convert" | "shrink"; collapsed?: boolean }) {
  return (
    <button type="button" className="side-item" data-tip={collapsed ? label : undefined} onClick={() => openTools({ tab, paths: selectedMediaPaths() })}>
      <Icon name={icon} size={16} />
      <span className="side-item__label">{label}</span>
    </button>
  );
}

export function Sidebar() {
  const collapsed = useUi((s) => s.sidebarCollapsed);
  const appMode = useUi((s) => s.appMode);
  const collapsedSections = useUi((s) => s.collapsedSections);
  const items = useApp((s) => s.items);
  const c = useMemo(() => counts({ items } as AppState, appMode), [items, appMode]);
  const categories = useApp((s) => s.categories);
  const queues = useApp((s) => s.queues);
  const projects = useApp((s) => s.grabberProjects);
  const ui = useUi.getState;
  const catHidden = !!collapsedSections?.categories && !collapsed;
  const queueHidden = !!collapsedSections?.queues && !collapsed;
  const toolsHidden = !!collapsedSections?.tools && !collapsed;
  const grabberHidden = !!collapsedSections?.grabber && !collapsed;
  // The list scrolls without a scrollbar: a soft fade at an edge says there's more there (with
  // the Tools section, Grabber and Trash can be below the edge in a small window).
  const navRef = useRef<HTMLElement>(null);
  const [moreBelow, setMoreBelow] = useState(false);
  const [moreAbove, setMoreAbove] = useState(false);
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const check = () => {
      setMoreAbove(nav.scrollTop > 2);
      setMoreBelow(nav.scrollTop + nav.clientHeight < nav.scrollHeight - 2);
    };
    check();
    nav.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(nav);
    for (const child of Array.from(nav.children)) ro.observe(child);
    return () => {
      nav.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [categories.length, queues.length, projects.length, catHidden, queueHidden, toolsHidden, grabberHidden]);

  const categoryMenu = (id: string) => (e: React.MouseEvent) => {
    const cat = useApp.getState().categories.find((x) => x.id === id);
    if (!cat) return;
    openMenuAt({ x: e.clientX, y: e.clientY }, [
      { label: t("Edit category…"), icon: "rename", onSelect: () => ui().openDialog({ kind: "category", category: cat }) },
      { label: t("Open folder"), icon: "folder-open", disabled: !cat.saveDir, onSelect: () => cat.saveDir && void attempt(api.openPath(cat.saveDir)) },
      { separator: true },
      { label: t("Delete category"), icon: "delete", danger: true, disabled: cat.builtin, onSelect: () => void attempt(api.deleteCategory(cat.id), t("Could not delete the category")) },
    ]);
  };
  const queueMenu = (id: string) => (e: React.MouseEvent) => {
    const q = useApp.getState().queues.find((x) => x.id === id);
    if (!q) return;
    openMenuAt({ x: e.clientX, y: e.clientY }, [
      q.running
        ? { label: t("Stop queue"), icon: "stop-queue", onSelect: () => void attempt(api.stopQueue(q.id)) }
        : { label: t("Start queue"), icon: "start-queue", onSelect: () => void attempt(api.startQueue(q.id)) },
      { label: t("Edit schedule…"), icon: "scheduler", onSelect: () => ui().openSheet({ kind: "scheduler", queueId: q.id }) },
      { separator: true },
      { label: t("Delete queue"), icon: "delete", danger: true, disabled: q.builtin, onSelect: () => void attempt(api.deleteQueue(q.id), t("Could not delete the queue")) },
    ]);
  };

  return (
    <aside className={collapsed ? "sidebar sidebar--collapsed glass" : "sidebar glass"} aria-label={t("Library")}>
      <div className="brand" data-tauri-drag-region>
        <BrandTile size={30} />
        <div className="mode-switch no-drag" role="tablist" aria-label={t("Switch workspace")}>
          <button
            type="button"
            role="tab"
            aria-selected={appMode === "jdm"}
            className={`mode-switch__btn${appMode === "jdm" ? " is-active" : ""}`}
            data-tip={appMode === "jdm" ? t("Jenzo Download Manager") : t("Switch to JDM (Downloads)")}
            onClick={() => useUi.getState().setAppMode("jdm")}
          >
            <Icon name="download" size={14} strokeWidth={2.1} />
            <span className="mode-switch__label">JDM</span>
            {appMode !== "jdm" && c.jdmActive > 0 && <span className="mode-switch__dot status-dot status-dot--live" />}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={appMode === "jtm"}
            className={`mode-switch__btn mode-switch__btn--jtm${appMode === "jtm" ? " is-active" : ""}`}
            data-tip={appMode === "jtm" ? t("Jenzo Torrent Manager") : t("Switch to JTM (Torrents)")}
            onClick={() => useUi.getState().setAppMode("jtm")}
          >
            <Icon name="magnet" size={14} strokeWidth={2.1} />
            <span className="mode-switch__label">JTM</span>
            {appMode !== "jtm" && c.jtmActive > 0 && <span className="mode-switch__dot status-dot status-dot--live" />}
          </button>
        </div>
        <button
          type="button"
          className="tb-btn brand__collapse no-drag"
          aria-label={collapsed ? t("Expand sidebar") : t("Collapse sidebar")}
          aria-expanded={!collapsed}
          data-tip={collapsed ? t("Expand sidebar") : t("Collapse sidebar")}
          onClick={() => useUi.getState().toggleSidebar()}
        >
          <Icon name="sidebar" size={17} />
        </button>
      </div>
      <nav className="nav" ref={navRef} data-more-below={moreBelow || undefined} data-more-above={moreAbove || undefined}>
        <NavItem view={{ kind: "all" }} icon={appMode === "jtm" ? "magnet" : "all"} label={appMode === "jtm" ? t("All torrents") : t("All downloads")} extra={<Count n={c.all} />} collapsed={collapsed} />
        <NavItem view={{ kind: "status", id: "unfinished" }} icon="unfinished" label={t("Unfinished")} extra={<Count n={c.unfinished} />} collapsed={collapsed} />
        <NavItem view={{ kind: "status", id: "finished" }} icon="finished" label={t("Finished")} extra={<Count n={c.finished} />} collapsed={collapsed} />

        <Section
          id="categories"
          title={t("Categories")}
          collapsed={catHidden}
          count={categories.length}
          onToggle={() => ui().toggleSection("categories")}
          onAdd={() => ui().openDialog({ kind: "category" })}
          addLabel={t("New category")}
        />
        {!catHidden &&
          categories.map((cat) => (
            <NavItem
              key={cat.id}
              view={{ kind: "category", id: cat.id }}
              icon={categoryIcon(cat)}
              label={displayName(cat.name)}
              extra={<Count n={c.byCategory[cat.id] ?? 0} />}
              onContext={categoryMenu(cat.id)}
              collapsed={collapsed}
            />
          ))}

        <Section
          id="queues"
          title={t("Queues")}
          collapsed={queueHidden}
          count={queues.length}
          onToggle={() => ui().toggleSection("queues")}
          onAdd={() => ui().openSheet({ kind: "scheduler", queueId: "new" })}
          addLabel={t("New queue")}
        />
        {!queueHidden &&
          queues.map((q) => (
            <NavItem
              key={q.id}
              view={{ kind: "queue", id: q.id }}
              icon={q.schedule.enabled && !q.running ? "status-scheduled" : "queue"}
              label={displayName(q.name)}
              onContext={queueMenu(q.id)}
              collapsed={collapsed}
              extra={
                q.running ? (
                  <span className="q-live" data-tip={t("Running")}>
                    <span className="status-dot status-dot--live" />
                    {c.byQueue[q.id] ?? 0}
                  </span>
                ) : q.schedule.enabled && q.schedule.startTime ? (
                  <span className="q-time" data-tip={t("Next scheduled start")}>
                    {q.schedule.startTime}
                  </span>
                ) : (
                  <Count n={c.byQueue[q.id] ?? 0} />
                )
              }
            />
          ))}

        <Section id="tools" title={t("Tools")} collapsed={toolsHidden} count={3} onToggle={() => ui().toggleSection("tools")} />
        {!toolsHidden && (
          <>
            <ToolItem icon="convert" label={t("Convert")} tab="convert" collapsed={collapsed} />
            <ToolItem icon="shrink" label={t("Make smaller")} tab="shrink" collapsed={collapsed} />
            <button
              type="button"
              className="side-item"
              title={collapsed ? undefined : t("Download a model from Hugging Face")}
              data-tip={collapsed ? t("AI models") : undefined}
              onClick={() => void attempt(api.openWindow("model"))}
            >
              <Icon name="model" size={16} />
              <span className="side-item__label">{t("AI models")}</span>
            </button>
          </>
        )}

        <Section
          id="grabber"
          title={t("Grabber")}
          collapsed={grabberHidden}
          count={projects.length}
          onToggle={() => ui().toggleSection("grabber")}
          onAdd={() => ui().openSheet({ kind: "grabber", projectId: null })}
          addLabel={t("New grabber project")}
        />
        {!grabberHidden &&
          projects.map((p) => (
            <NavItem
              key={p.id}
              view={{ kind: "grabber", id: p.id }}
              icon="grabber-project"
              label={p.name}
              extra={<Count n={p.results.files?.length ?? 0} />}
              collapsed={collapsed}
              onContext={(e) =>
                openMenuAt({ x: e.clientX, y: e.clientY }, [
                  { label: t("Open project…"), icon: "grabber", onSelect: () => ui().openSheet({ kind: "grabber", projectId: p.id }) },
                  { separator: true },
                  { label: t("Delete project"), icon: "delete", danger: true, onSelect: () => void attempt(api.deleteGrabberProject(p.id).then(() => api.grabberProjects()).then((g) => useApp.setState({ grabberProjects: g }))) },
                ])
              }
            />
          ))}
        <NavItem
          view={{ kind: "trash" }}
          icon="trash"
          label={t("Trash")}
          extra={<Count n={c.trash} />}
          collapsed={collapsed}
          onContext={(e) => openMenuAt({ x: e.clientX, y: e.clientY }, [{ label: t("Empty trash"), icon: "delete", danger: true, disabled: !c.trash, onSelect: () => void attempt(api.emptyTrash(), t("Could not empty the trash")) }])}
        />
      </nav>
      <SpeedCard />
      <SideFooter />
    </aside>
  );
}

function Section({
  title,
  collapsed,
  count,
  onToggle,
  onAdd,
  addLabel,
}: {
  id: string;
  title: string;
  collapsed?: boolean;
  count?: number;
  onToggle?: () => void;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <div className={`side-section${collapsed ? " side-section--collapsed" : ""}`}>
      <button
        type="button"
        className="side-section__toggle"
        aria-expanded={!collapsed}
        onClick={onToggle}
        data-tip={collapsed ? t("Expand") : t("Collapse")}
      >
        <Icon name={collapsed ? "chevron-right" : "chevron-down"} size={12} strokeWidth={2.2} className="side-section__chev" />
        <span className="t-overline">{title}</span>
        {collapsed && count !== undefined && count > 0 && <span className="side-section__badge">{count}</span>}
      </button>
      {onAdd ? (
        <button type="button" className="side-section__add" aria-label={addLabel} data-tip={addLabel} onClick={onAdd}>
          <Icon name="plus" size={14} />
        </button>
      ) : (
        <span className="side-section__add" style={{ visibility: "hidden" }} aria-hidden="true" />
      )}
    </div>
  );
}

/** Total speed with a 60-sample sparkline (1 sample/s, component-level ring buffer). */
function SpeedCard() {
  const ring = useRef(new Ring(60));
  const [samples, setSamples] = useState<number[]>([]);
  const limiter = useApp((s) => s.settings?.downloads.speedLimiterEnabled ?? false);
  const limit = useApp((s) => s.settings?.downloads.speedLimit ?? 0);
  const active = useApp((s) => Object.values(s.progress).filter((p) => p.speed > 0).length);
  const [peak, setPeak] = useState(0);

  useEffect(() => {
    const sample = () => {
      const total = Object.values(useApp.getState().progress).reduce((sum, p) => sum + (p.speed || 0), 0);
      ring.current.push(total);
      setSamples(ring.current.values());
      setPeak((p) => Math.max(p, total));
    };
    sample();
    const timer = window.setInterval(sample, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const now = samples[samples.length - 1] ?? 0;
  const [num, unit] = useMemo(() => {
    const s = formatSpeed(now);
    if (s === "—") return ["0", "B/s"];
    const i = s.indexOf(" ");
    return [s.slice(0, i), s.slice(i + 1)];
  }, [now]);

  return (
    <section className="speedcard" aria-label={t("Total speed")}>
      <div className="speedcard__top">
        <span className="t-overline">{t("Total speed")}</span>
        {active > 0 && <span className="badge badge--accent">{t("{count} active", { count: active })}</span>}
      </div>
      <div className="speedcard__val tnum">
        {num}
        <small>{unit}</small>
      </div>
      <Sparkline samples={samples.length > 1 ? samples : [0, 0]} />
      <div className="speedcard__row">
        <button type="button" className="linklike" onClick={() => void actions.toggleLimiter()} data-tip={t("Toggle speed limiter")} data-kbd="Ctrl L">
          <Icon name="speed-limiter" size={13} /> {tr("Limit {limit}", { limit: <b>{limiter ? `${formatBytes(limit)}/s` : t("Off")}</b> })}
        </button>
        <span>{tr("Peak {speed}", { speed: <b>{formatSpeed(peak)}</b> })}</span>
      </div>
    </section>
  );
}

function SideFooter() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const theme = useApp((s) => s.settings?.appearance.theme ?? "system");
  useEffect(() => {
    const load = () => void api.integrationStatus().then(setStatus, () => setStatus(null));
    load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const ok = !!status?.extensionConnected;
  const resolved = document.documentElement.dataset.theme;
  const nextTheme = theme === "dark" ? "glass" : theme === "glass" ? "light" : "dark";
  const themeTip =
    theme === "dark"
      ? t("Theme: dark")
      : theme === "glass"
        ? t("Theme: Liquid Glass")
        : theme === "light"
          ? t("Theme: light")
          : t("Theme: system");
  const themeIcon: IconName = resolved === "light" ? "sun" : resolved === "glass" ? "star" : "moon";
  return (
    <div className="side-foot">
      <button
        type="button"
        className="side-foot__status"
        onClick={() => useUi.getState().openSheet({ kind: "settings", section: "browser" })}
        data-tip={ok ? t("The browser extension is connected") : t("Set up browser integration")}
      >
        <Icon name="browser" size={15} />
        <span className={`side-foot__dot status-dot ${ok ? "status-dot--live" : ""}`} />
        <span className="ellipsis">
          {tr("Browser {status}", { status: <span className={ok ? "text-success" : "text-warning"}>{status ? (ok ? t("connected") : t("not connected")) : "…"}</span> })}
        </span>
      </button>
      <button
        type="button"
        className="tb-btn"
        aria-label={t("Toggle theme")}
        data-tip={themeTip}
        onClick={() => void patchSettings({ appearance: { theme: nextTheme } })}
      >
        <Icon name={themeIcon} size={16} />
      </button>
      <button type="button" className="tb-btn" aria-label={t("Settings")} data-tip={t("Settings")} data-kbd="Ctrl ," onClick={() => useUi.getState().openSheet({ kind: "settings" })}>
        <Icon name="settings" size={16} />
      </button>
    </div>
  );
}
