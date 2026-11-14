import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { IconButton } from "../components/IconButton";
import { Icon } from "../design/icons";
import { actions, patchSettings } from "../lib/actions";
import { api } from "../lib/api";
import { formatBytes } from "../lib/format";
import { t } from "../lib/i18n";
import { canPause, canResume, displayName } from "../lib/present";
import { useApp } from "../lib/store";
import { attempt, toast, useUi } from "../lib/ui";
import { win } from "../lib/win";

export function Toolbar() {
  const selection = useApp((s) => s.selection);
  const sel = useApp(useShallow((s) => s.selection.map((id) => s.items[id]).filter(Boolean)));
  const view = useApp((s) => s.view);
  const queues = useApp((s) => s.queues);
  const limiter = useApp((s) => s.settings?.downloads.speedLimiterEnabled ?? false);
  const limit = useApp((s) => s.settings?.downloads.speedLimit ?? 0);
  const nightTurbo = useApp((s) => Boolean(s.settings?.downloads.nightTurbo));
  const appMode = useUi((s) => s.appMode);
  const hasFinished = useApp((s) =>
    Object.values(s.items).some(
      (i) => i.status === "completed" && !i.trashed && (appMode === "jtm" ? i.kind === "torrent" : i.kind !== "torrent"),
    ),
  );
  const ui = useUi.getState;

  const queue = queues.find((q) => q.id === (view.kind === "queue" ? view.id : "main")) ?? queues[0];
  const anyResumable = sel.some((i) => canResume(i.status) || i.status === "queued");
  const anyPausable = sel.some((i) => canPause(i.status));

  return (
    <header className="toolbar" data-tauri-drag-region role="toolbar" aria-label={t("Download actions")}>
      <div className="toolbar__actions" data-tauri-drag-region>
        {appMode === "jtm" ? (
          <>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void actions.openTorrentFile()}
              data-tip={t("Open .torrent file…")}
            >
              <Icon name="magnet" size={16} strokeWidth={2} />
              {t("Add Torrent")}
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={actions.openAddUrl}
              data-tip={t("Add Magnet or Torrent URL")}
              data-kbd="Ctrl N"
            >
              <Icon name="link" size={15} strokeWidth={1.8} />
              {t("Magnet URL")}
            </button>
            <IconButton
              icon="bolt"
              label={t("Boost trackers")}
              onClick={async () => {
                const st = useApp.getState();
                const targets = sel.filter((i) => i.kind === "torrent").length
                  ? sel.filter((i) => i.kind === "torrent")
                  : Object.values(st.items).filter((i) => i.kind === "torrent" && !i.trashed && i.status !== "completed");
                if (!targets.length) {
                  toast(t("Select an active torrent to boost trackers"), { kind: "info" });
                  return;
                }
                let total = 0;
                for (const tItem of targets) {
                  const n = await attempt(api.boostTorrentTrackers(tItem.id), t("Could not boost trackers"));
                  if (n) total += n;
                }
                toast(t("Trackers boosted ({count} added)", { count: total }), { kind: "success", ms: 2200 });
              }}
            />
            <IconButton
              icon="video"
              label={t("Watch live")}
              disabled={!sel.some((i) => i.kind === "torrent")}
              onClick={() => {
                const target = sel.find((i) => i.kind === "torrent");
                if (target) actions.open(target.id);
              }}
            />
          </>
        ) : (
          <button type="button" className="btn btn--primary" onClick={actions.openAddUrl} data-tip={t("Add a download address")} data-kbd="Ctrl N">
            <Icon name="plus" size={16} strokeWidth={2} />
            {t("Add URL")}
          </button>
        )}
        <IconButton icon="resume" label={t("Resume")} kbd="Space" disabled={!anyResumable} onClick={() => actions.resume(selection)} />
        <IconButton icon="pause" label={t("Pause")} kbd="Space" disabled={!anyPausable} onClick={() => actions.pause(selection)} />
        <IconButton icon="stop-all" label={t("Stop all")} onClick={actions.pauseAll} />
        <span className="tb-sep" />
        <IconButton icon="delete" label={t("Delete")} kbd="Del" disabled={!selection.length} onClick={() => actions.requestDelete(selection)} />
        <IconButton icon="delete-completed" label={t("Remove completed from the list")} disabled={!hasFinished} onClick={() => void attempt(api.removeCompleted(), t("Could not remove completed downloads"))} />
        <span className="tb-sep" />
        <IconButton icon="start-queue" label={queue ? t("Start {name}", { name: displayName(queue.name) }) : t("Start queue")} disabled={!queue || queue.running} onClick={() => queue && void attempt(api.startQueue(queue.id))} />
        <IconButton icon="stop-queue" label={queue ? t("Stop {name}", { name: displayName(queue.name) }) : t("Stop queue")} disabled={!queue || !queue.running} onClick={() => queue && void attempt(api.stopQueue(queue.id))} />
        <IconButton icon="scheduler" label={t("Scheduler")} onClick={() => ui().openSheet({ kind: "scheduler", queueId: queue?.id })} />
        <span className="tb-sep" />
        <IconButton className="tb-hide-compact" icon="grabber" label={t("Site grabber")} onClick={() => ui().openSheet({ kind: "grabber" })} />
        <IconButton className="tb-hide-compact" icon="batch" label={t("Batch download")} onClick={() => ui().openDialog({ kind: "batch" })} />
        <IconButton className="tb-hide-compact" icon="model" label={t("Download a model from Hugging Face")} onClick={() => void attempt(api.openWindow("model"))} />
        <IconButton
          icon="speed-limiter"
          label={limiter ? t("Speed limiter on · {limit}", { limit: `${formatBytes(limit)}/s` }) : t("Speed limiter off")}
          kbd="Ctrl L"
          pressed={limiter}
          onClick={() => void actions.toggleLimiter()}
        />
        <IconButton
          icon="moon"
          label={nightTurbo ? t("Night Turbo on · Uncapped speed & sleep when done") : t("Night Turbo mode")}
          pressed={nightTurbo}
          onClick={async () => {
            const next = !nightTurbo;
            await patchSettings({
              downloads: {
                nightTurbo: next,
                ...(next ? { speedLimiterEnabled: false } : {}),
              },
            });
            if (queue) {
              await attempt(
                api.upsertQueue({
                  ...queue,
                  schedule: {
                    ...queue.schedule,
                    onComplete: next ? { type: "sleep" } : { type: "none" },
                  },
                }),
              );
              if (next && !queue.running) await attempt(api.startQueue(queue.id));
            }
            toast(
              next ? t("Night Turbo activated") : t("Night Turbo turned off"),
              {
                kind: next ? "success" : "info",
                body: next ? t("Speed limits removed and PC will sleep when the queue finishes.") : undefined,
                ms: 3000,
              },
            );
          }}
        />
        <IconButton
          icon="activity"
          label={t("Bandwidth & speed analytics")}
          onClick={() => ui().openSheet({ kind: "analytics" })}
        />
        <IconButton icon="mini-mode" label={t("Mini window")} kbd="Ctrl Shift M" onClick={actions.toggleMini} />
      </div>
      <div className="toolbar__right">
        <SearchBox />
        <IconButton icon="options" label={t("Settings")} kbd="Ctrl ," onClick={() => ui().openSheet({ kind: "settings" })} />
        <Caption />
      </div>
    </header>
  );
}

function SearchBox() {
  const search = useApp((s) => s.search);
  const focusTick = useUi((s) => s.searchFocus);
  const appMode = useUi((s) => s.appMode);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focusTick) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [focusTick]);
  const placeholder = appMode === "jtm" ? t("Search torrents") : t("Search downloads");
  return (
    <label className="input search">
      <Icon name="search" size={15} />
      <input
        ref={ref}
        value={search}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => useApp.getState().setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            useApp.getState().setSearch("");
            ref.current?.blur();
          }
          if (e.key === "ArrowDown") document.querySelector<HTMLElement>(".table__body")?.focus();
        }}
      />
      {search ? (
        <button type="button" className="search__clear" aria-label={t("Clear search")} onClick={() => useApp.getState().setSearch("")}>
          <Icon name="close" size={13} />
        </button>
      ) : (
        <span className="kbd">Ctrl K</span>
      )}
    </label>
  );
}

function Caption() {
  const [max, setMax] = useState(false);
  useEffect(() => {
    let off: (() => void) | undefined;
    void win.isMaximized().then(setMax);
    void win.onResized(() => void win.isMaximized().then(setMax)).then((u) => (off = u));
    return () => off?.();
  }, []);
  return (
    <div className="caption">
      <button
        type="button"
        className="caption__btn caption__btn--tray"
        title={t("Minimize to system tray")}
        aria-label={t("Minimize to system tray")}
        onClick={() => void win.hideToTray()}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 3.5l5.5 5.5M9.5 4.5V9H5" />
          <path d="M3 12.5h10" />
          <circle cx="12" cy="10" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <button type="button" className="caption__btn" aria-label={t("Minimize")} onClick={() => void win.minimize()}>
        <Icon name="minimize" size={16} strokeWidth={1.25} />
      </button>
      <button type="button" className="caption__btn" aria-label={max ? t("Restore") : t("Maximize")} onClick={() => void win.toggleMaximize()}>
        <Icon name={max ? "restore" : "maximize"} size={14} strokeWidth={1.5} />
      </button>
      <button type="button" className="caption__btn caption__btn--close" aria-label={t("Close to tray")} onClick={() => void win.close()}>
        <Icon name="close" size={16} strokeWidth={1.4} />
      </button>
    </div>
  );
}
