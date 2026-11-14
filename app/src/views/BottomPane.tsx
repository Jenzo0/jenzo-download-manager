import { type ReactNode, useEffect, useRef, useState } from "react";
import { IconButton } from "../components/IconButton";
import { useItemDetails } from "../components/useItemDetails";
import { ConnectionLanes, FileMap, SpeedChart } from "../components/Visuals";
import { Icon } from "../design/icons";
import { actions } from "../lib/actions";
import { api } from "../lib/api";
import { formatBytes, formatClock, formatDate, formatDuration, formatSpeed } from "../lib/format";
import { t, tk } from "../lib/i18n";
import { fullPath } from "../lib/paths";
import { progressOf, statusView } from "../lib/present";
import { Ring } from "../lib/ring";
import { useApp } from "../lib/store";
import type { ItemDetails } from "../lib/types";
import { attempt, toast, useUi } from "../lib/ui";
import { formatRange, ltr } from "../lib/videoPart";
import { copyText } from "../lib/win";

const BASE_TABS = [
  { id: "connections", label: tk("Connections") },
  { id: "speed", label: tk("Speed") },
  { id: "info", label: tk("Info") },
] as const;

const TORRENT_TABS = [
  { id: "connections", label: tk("Connections") },
  { id: "speed", label: tk("Speed") },
  { id: "files", label: tk("Files") },
  { id: "trackers", label: tk("Trackers") },
  { id: "info", label: tk("Info") },
] as const;

/** Collapsible pane under the list showing the focused download (C-style engineering view). */
export function BottomPane() {
  const open = useUi((s) => s.bottomOpen);
  const tab = useUi((s) => s.bottomTab);
  const height = useUi((s) => s.bottomHeight);
  const focus = useApp((s) => s.selection[s.selection.length - 1] ?? null);
  const item = useApp((s) => (focus ? s.items[focus] : undefined));
  const needDetails = Boolean(item && (item.status !== "completed" || item.kind === "torrent"));
  const details = useItemDetails(needDetails ? focus : null, item?.status === "completed" ? 3000 : 500, open);
  const tabs = item?.kind === "torrent" ? TORRENT_TABS : BASE_TABS;
  const activeTab = tabs.some((x) => x.id === tab) ? tab : "connections";

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const y0 = e.clientY;
    const h0 = height;
    const max = Math.max(180, window.innerHeight - 320);
    const move = (ev: PointerEvent) => useUi.getState().setBottom({ bottomHeight: Math.min(max, Math.max(150, h0 - (ev.clientY - y0))) });
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.classList.remove("is-resizing-v");
    };
    document.body.classList.add("is-resizing-v");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // The pane only appears for a selection; with nothing selected the list gets the room.
  if (!open || !item) return null;
  return (
    <section className="pane" aria-label={t("Selected download")}>
      <div className="pane__resize" onPointerDown={startResize} aria-hidden="true" />
      <div className="pane__tabs" role="tablist">
        {tabs.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={activeTab === x.id} className={`pane__tab${activeTab === x.id ? " on" : ""}`} onClick={() => useUi.getState().setBottom({ bottomTab: x.id })}>
            {t(x.label)}
          </button>
        ))}
        <span className="spacer" />
        <span className="pane__file">
          <span className="ellipsis">{item.fileName}</span>
          {item.kind === "torrent" && details?.torrentProgress ? (
            <span className="badge badge--accent">{t("{count} peers", { count: details.torrentProgress.peersLive })}</span>
          ) : details?.segments.length ? (
            <span className="badge badge--accent">{t("{count} conn", { count: details.segments.filter((s) => s.state === "active").length })}</span>
          ) : null}
        </span>
        <IconButton icon="external" size={15} label={t("Open details window")} onClick={() => actions.details(item.id)} />
        <IconButton icon="chevron-down" size={15} label={t("Hide pane")} onClick={() => useUi.getState().setBottom({ bottomOpen: false })} />
      </div>
      <div className="pane__body">
        {activeTab === "connections" ? (
          <ConnectionsTab details={details} done={item.status === "completed"} />
        ) : activeTab === "speed" ? (
          <SpeedTab details={details} id={item.id} />
        ) : activeTab === "files" ? (
          <TorrentFilesTab details={details} saveDir={item.saveDir} />
        ) : activeTab === "trackers" ? (
          <TorrentTrackersTab details={details} id={item.id} />
        ) : (
          <InfoTab id={item.id} />
        )}
      </div>
    </section>
  );
}

function TorrentFilesTab({ details, saveDir }: { details: ItemDetails | null; saveDir: string }) {
  const files = details?.torrentMeta?.files ?? [];
  if (!files.length) {
    return <p className="pane__hint">{t("Torrent file list is available while active or after metadata is resolved.")}</p>;
  }
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {files.map((f) => (
        <div
          key={f.index}
          style={{
            display: "grid",
            gridTemplateColumns: "36px minmax(0, 1fr) 90px auto",
            alignItems: "center",
            gap: 10,
            padding: "5px 10px",
            borderRadius: 7,
            background: "var(--control-bg)",
            fontSize: 12,
          }}
        >
          <span className="t-mono text-tertiary">#{f.index + 1}</span>
          <span className="ellipsis" dir="auto" title={f.path}>
            {f.path}
          </span>
          <span className="tnum text-secondary" style={{ textAlign: "end" }}>
            {formatBytes(f.size)}
          </span>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => void api.revealPath(fullPath(saveDir, f.path))}
            title={t("Show in folder")}
          >
            <Icon name="folder-open" size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

function TorrentTrackersTab({ details, id }: { details: ItemDetails | null; id: string }) {
  const tp = details?.torrentProgress;
  const trackers = details?.trackers ?? [];
  const ratio =
    tp && tp.downloadedBytes > 0 ? (tp.uploadedBytes / tp.downloadedBytes).toFixed(2) : "0.00";
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
          <span>
            <span className="text-tertiary">{t("Peers")}: </span>
            <b className="tnum">{tp ? `${tp.peersLive} / ${tp.peersSeen}` : "—"}</b>
          </span>
          <span>
            <span className="text-tertiary">{t("Upload")}: </span>
            <b className="tnum">{tp ? formatSpeed(tp.uploadSpeed) : "—"}</b>
          </span>
          <span>
            <span className="text-tertiary">{t("Uploaded")}: </span>
            <b className="tnum">{tp ? formatBytes(tp.uploadedBytes) : "—"}</b>
          </span>
          <span>
            <span className="text-tertiary">{t("Seed ratio")}: </span>
            <b className="tnum">{ratio}x</b>
          </span>
        </div>
        <button
          type="button"
          className="btn btn--sm btn--primary"
          onClick={async () => {
            const count = await attempt(api.boostTorrentTrackers(id), t("Could not boost trackers"));
            if (count != null) toast(t("Trackers boosted ({count} added)", { count }), { kind: "success", ms: 2200 });
          }}
        >
          <Icon name="bolt" size={13} /> {t("Boost trackers")}
        </button>
      </div>
      {trackers.length ? (
        <div style={{ display: "grid", gap: 4 }}>
          {trackers.map((trUrl, idx) => (
            <div
              key={`${idx}-${trUrl}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "4px 10px",
                borderRadius: 6,
                background: "var(--control-bg)",
                fontSize: 11.5,
              }}
            >
              <span className="t-mono ellipsis selectable" title={trUrl}>
                {trUrl}
              </span>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={async () => {
                  if (await copyText(trUrl)) toast(t("Copied"), { kind: "success", ms: 1200 });
                }}
              >
                <Icon name="copy" size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="pane__hint">{t("DHT & Peer Exchange active — click Boost trackers to inject fast public trackers.")}</p>
      )}
    </div>
  );
}

function ConnectionsTab({ details, done }: { details: ItemDetails | null; done: boolean }) {
  if (done) return <p className="pane__hint">{t("Download complete — no open connections.")}</p>;
  if (!details) return <p className="pane__hint">{t("Loading…")}</p>;
  const size = details.item.size ?? 0;
  const unit = details.item.kind === "hls" || details.item.kind === "dash" ? "segments" : "bytes";
  return (
    <div className="pane__conn">
      <div className="pane__map">
        <span>{t("File map")}</span>
        <FileMap segments={details.segments} size={size} unit={unit} />
        <span className="tnum">{t("{count} segments", { count: details.segments.length })}</span>
      </div>
      <ConnectionLanes segments={details.segments} unit={unit} />
    </div>
  );
}

function SpeedTab({ details, id }: { details: ItemDetails | null; id: string }) {
  const progress = useApp((s) => s.progress[id]);
  const ring = useRef(new Ring(120));
  const [, force] = useState(0);
  // Seed with the core's history, then append live progress samples.
  useEffect(() => {
    ring.current = new Ring(120);
  }, [id]);
  useEffect(() => {
    if (details && ring.current.size === 0) details.speedHistory.slice(-120).forEach((v) => ring.current.push(v));
  }, [details]);
  useEffect(() => {
    if (progress) {
      ring.current.push(progress.speed);
      force((n) => n + 1);
    }
  }, [progress]);
  const samples = ring.current.values();
  const avg = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
  return (
    <div className="pane__speed">
      <SpeedChart samples={samples} height={140} />
      <div className="sstats">
        <Stat k={t("Now")} v={formatSpeed(progress?.speed)} />
        <Stat k={t("Average")} v={formatSpeed(avg)} />
        <Stat k={t("Peak")} v={formatSpeed(ring.current.max())} />
        <Stat k={t("Time left")} v={formatDuration(progress?.etaSecs)} />
      </div>
    </div>
  );
}

const Stat = ({ k, v }: { k: string; v: ReactNode }) => (
  <div className="sstat">
    <div className="k">{k}</div>
    <div className="v tnum">{v}</div>
  </div>
);

function InfoTab({ id }: { id: string }) {
  const item = useApp((s) => s.items[id]);
  const progress = useApp((s) => s.progress[id]);
  const cat = useApp((s) => s.categories.find((c) => c.id === item?.category)?.name);
  const queue = useApp((s) => s.queues.find((q) => q.id === item?.queueId)?.name);
  if (!item) return null;
  const p = progressOf(item, progress);
  const rows: [string, ReactNode, string?][] = [
    [t("Address"), item.url, item.url],
    ...(item.finalUrl && item.finalUrl !== item.url ? ([[t("Final address"), item.finalUrl, item.finalUrl]] as [string, ReactNode, string][]) : []),
    [t("Saved to"), fullPath(item.saveDir, item.fileName), fullPath(item.saveDir, item.fileName)],
    ...(item.media?.section
      ? ([[t("Part of the video"), `${ltr(formatRange(item.media.section))} · ${formatClock(item.media.section.end - item.media.section.start)}`]] as [string, ReactNode][])
      : []),
    [t("Status"), statusView(item, progress).detail],
    [t("Size"), t("{done} of {total}", { done: formatBytes(p.done), total: formatBytes(p.total) })],
    [t("Resume"), item.resumable === false ? t("Not supported — restarts from zero") : item.resumable ? t("Supported") : t("Unknown")],
    [t("Category"), cat ?? item.category],
    [t("Queue"), queue ?? "—"],
    [t("Connections"), String(item.connections)],
    [t("Speed limit"), item.speedLimit ? `${formatBytes(item.speedLimit)}/s` : t("None")],
    [t("Added"), formatDate(item.addedAt)],
    [t("Finished"), formatDate(item.finishedAt)],
    [t("Checksum"), item.checksum || "—"],
    ...(item.description ? ([[t("Description"), item.description]] as [string, ReactNode][]) : []),
  ];
  return (
    <dl className="kv">
      {rows.map(([k, v, copy]) => (
        <div key={k} className="kv__row">
          <dt>{k}</dt>
          <dd className={copy ? "t-mono selectable" : "selectable"}>
            {v}
            {copy && (
              <button type="button" className="kv__copy" aria-label={t("Copy {field}", { field: k })} data-tip={t("Copy")} onClick={() => void copyText(copy)}>
                <Icon name="copy" size={13} />
              </button>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
