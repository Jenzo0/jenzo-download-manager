import { useMemo } from "react";
import { Icon } from "../../design/icons";
import { actions } from "../../lib/actions";
import { formatBytes, formatSpeed } from "../../lib/format";
import { t } from "../../lib/i18n";
import { displayName } from "../../lib/present";
import { useApp } from "../../lib/store";
import { useUi } from "../../lib/ui";

export function AnalyticsSheet() {
  const itemsMap = useApp((s) => s.items);
  const progressMap = useApp((s) => s.progress);
  const categories = useApp((s) => s.categories);
  const peakRecorded = useApp((s) => s.settings?.downloads.peakSpeedBps ?? 0);

  const stats = useMemo(() => {
    const all = Object.values(itemsMap).filter((i) => !i.trashed);
    const liveSpeed = Object.values(progressMap).reduce((sum, p) => sum + (p.speed ?? 0), 0);
    const peakSpeed = Math.max(peakRecorded, liveSpeed);

    let totalBytes = 0;
    let jdmBytes = 0;
    let jtmBytes = 0;
    let jdmCount = 0;
    let jtmCount = 0;
    let completedCount = 0;
    let activeCount = 0;

    const byCat: Record<string, { count: number; bytes: number }> = {};

    for (const item of all) {
      const p = progressMap[item.id];
      const bytes = Math.max(item.downloaded ?? 0, p?.downloaded ?? 0, item.status === "completed" ? (item.size ?? 0) : 0);
      totalBytes += bytes;
      if (item.kind === "torrent") {
        jtmBytes += bytes;
        jtmCount += 1;
      } else {
        jdmBytes += bytes;
        jdmCount += 1;
      }
      if (item.status === "completed") completedCount += 1;
      if (item.status === "downloading" || item.status === "connecting") activeCount += 1;

      const catKey = item.category || "other";
      const cur = (byCat[catKey] ??= { count: 0, bytes: 0 });
      cur.count += 1;
      cur.bytes += bytes;
    }

    const catRows = categories
      .map((c) => ({
        id: c.id,
        name: displayName(c.name),
        icon: c.icon,
        count: byCat[c.id]?.count ?? 0,
        bytes: byCat[c.id]?.bytes ?? 0,
      }))
      .sort((a, b) => b.bytes - a.bytes);

    const topItems = [...all]
      .sort((a, b) => (b.size ?? b.downloaded ?? 0) - (a.size ?? a.downloaded ?? 0))
      .slice(0, 6);

    return {
      totalCount: all.length,
      completedCount,
      activeCount,
      totalBytes,
      jdmBytes,
      jtmBytes,
      jdmCount,
      jtmCount,
      liveSpeed,
      peakSpeed,
      catRows,
      topItems,
    };
  }, [itemsMap, progressMap, categories, peakRecorded]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "18px 22px", overflowY: "auto", height: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        <div className="sstat" style={{ padding: "14px 16px", borderRadius: 12, background: "var(--control-bg)", boxShadow: "inset 0 0 0 1px var(--border-subtle)" }}>
          <div className="k" style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>{t("Total downloaded")}</div>
          <div className="v tnum" style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: "var(--accent)" }}>
            {formatBytes(stats.totalBytes)}
          </div>
          <div className="t-small text-tertiary" style={{ marginTop: 4 }}>
            {t("{count} completed", { count: stats.completedCount })} · {t("{count} items", { count: stats.totalCount })}
          </div>
        </div>

        <div className="sstat" style={{ padding: "14px 16px", borderRadius: 12, background: "var(--control-bg)", boxShadow: "inset 0 0 0 1px var(--border-subtle)" }}>
          <div className="k" style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>{t("JDM · Direct & Video")}</div>
          <div className="v tnum" style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            {formatBytes(stats.jdmBytes)}
          </div>
          <div className="t-small text-tertiary" style={{ marginTop: 4 }}>
            {t("{count} items", { count: stats.jdmCount })}
          </div>
        </div>

        <div className="sstat" style={{ padding: "14px 16px", borderRadius: 12, background: "var(--control-bg)", boxShadow: "inset 0 0 0 1px var(--border-subtle)" }}>
          <div className="k" style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>{t("JTM · BitTorrent")}</div>
          <div className="v tnum" style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: "#10b981" }}>
            {formatBytes(stats.jtmBytes)}
          </div>
          <div className="t-small text-tertiary" style={{ marginTop: 4 }}>
            {t("{count} items", { count: stats.jtmCount })}
          </div>
        </div>

        <div className="sstat" style={{ padding: "14px 16px", borderRadius: 12, background: "var(--control-bg)", boxShadow: "inset 0 0 0 1px var(--border-subtle)" }}>
          <div className="k" style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>{t("Peak speed record")}</div>
          <div className="v tnum" style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            {stats.peakSpeed > 0 ? formatSpeed(stats.peakSpeed) : "—"}
          </div>
          <div className="t-small text-tertiary" style={{ marginTop: 4 }}>
            {t("Now")}: <b className="tnum">{formatSpeed(stats.liveSpeed)}</b>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, minHeight: 0, flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16, borderRadius: 12, background: "var(--control-bg)", boxShadow: "inset 0 0 0 1px var(--border-subtle)" }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{t("Bandwidth by category")}</div>
          <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
            {stats.catRows.map((c) => {
              const pct = stats.totalBytes > 0 ? Math.min(100, (c.bytes / stats.totalBytes) * 100) : 0;
              return (
                <div key={c.id} style={{ display: "grid", gap: 5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
                      {c.name} <span className="text-tertiary tnum">({c.count})</span>
                    </span>
                    <span className="tnum text-secondary">{formatBytes(c.bytes)}</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 999, background: "rgb(255 255 255 / 0.07)", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.max(pct, c.bytes > 0 ? 3 : 0)}%`,
                        height: "100%",
                        borderRadius: 999,
                        background: "var(--accent-gradient, var(--accent-solid))",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16, borderRadius: 12, background: "var(--control-bg)", boxShadow: "inset 0 0 0 1px var(--border-subtle)" }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{t("Largest downloads")}</div>
          {stats.topItems.length ? (
            <div style={{ display: "grid", gap: 6, marginTop: 2 }}>
              {stats.topItems.map((it, idx) => (
                <div
                  key={it.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px minmax(0, 1fr) 82px auto",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    borderRadius: 8,
                    background: "rgb(255 255 255 / 0.03)",
                    fontSize: 12,
                  }}
                >
                  <span className="t-mono text-tertiary">#{idx + 1}</span>
                  <span className="ellipsis" dir="auto" title={it.fileName}>
                    {it.fileName}
                  </span>
                  <span className="tnum text-secondary" style={{ textAlign: "end" }}>
                    {formatBytes(it.size ?? it.downloaded)}
                  </span>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      useUi.getState().closeSheet();
                      actions.reveal(it.id);
                    }}
                    title={t("Show in folder")}
                  >
                    <Icon name="folder-open" size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-tertiary t-small" style={{ marginTop: 12 }}>{t("No downloads recorded yet.")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
