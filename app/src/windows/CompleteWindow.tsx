import { useState } from "react";
import { Checkbox } from "../components/Controls";
import { LogoMark } from "../components/LogoMark";
import { FileTile } from "../components/Visuals";
import { WindowFrame } from "../components/WindowFrame";
import { Icon } from "../design/icons";
import { patchSettings } from "../lib/actions";
import { api } from "../lib/api";
import { formatBytes } from "../lib/format";
import { t } from "../lib/i18n";
import { fullPath } from "../lib/paths";
import { useApp } from "../lib/store";
import { mediaPath } from "../lib/tools";
import { attempt, toast } from "../lib/ui";
import { copyText, openUrl, win } from "../lib/win";

const ARCHIVE_RE = /\.(zip|tar|tgz|tbz2|txz|7z|rar|tar\.gz|tar\.bz2|tar\.xz)$/i;

export default function CompleteWindow({ id }: { id: string }) {
  const item = useApp((s) => s.items[id]);
  const autoExtract = useApp((s) => Boolean(s.settings?.downloads.autoExtract));
  const [dontShow, setDontShow] = useState(false);
  const [sha256, setSha256] = useState<string | null>(null);
  const [hashing, setHashing] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const close = async () => {
    if (dontShow) await patchSettings({ general: { showCompletionDialog: false } });
    await win.close();
  };
  const run = async (p: Promise<void>, fail: string) => {
    await attempt(p, fail);
    await close();
  };

  const size = item?.size ?? item?.downloaded ?? 0;
  const path = item ? fullPath(item.saveDir, item.fileName) : "";
  const address = item?.finalUrl || item?.url || "";
  const media = mediaPath(item);
  const isArchive = Boolean(item?.fileName && ARCHIVE_RE.test(item.fileName));

  const handleHash = async () => {
    if (!path || hashing) return;
    setHashing(true);
    try {
      const h = await attempt(api.computeFileSha256(path), t("Could not compute SHA-256"));
      if (h) setSha256(h);
    } finally {
      setHashing(false);
    }
  };

  const handleExtract = async () => {
    if (!path || extracting) return;
    setExtracting(true);
    try {
      const outDir = await attempt(api.extractArchive(path), t("Could not extract archive"));
      if (outDir) {
        toast(t("Archive extracted"), { kind: "success", body: outDir });
        await api.revealPath(outDir);
      }
    } finally {
      setExtracting(false);
    }
  };

  return (
    <WindowFrame
      kind="complete"
      title={t("Download complete")}
      icon={<LogoMark size={17} glass="indigo" />}
      onClose={() => void close()}
      className="complete idm-complete"
    >
      <div className="wbody idm-complete__body">
        <div className="idm-complete__head">
          <div className="idm-complete__icon">
            {item ? <FileTile item={item} size={46} thumbWidth={54} /> : <Icon name="folder-open" size={38} />}
          </div>
          <div className="idm-complete__headline">
            <div className="idm-complete__title">{t("Download complete")}</div>
            <div className="idm-complete__sub tnum">
              {t("Downloaded {human} ({exact} Bytes)", {
                human: formatBytes(size),
                exact: size.toLocaleString("en-US"),
              })}
            </div>
          </div>
        </div>

        <div className="idm-complete__field">
          <label className="idm-complete__label">{t("Address")}</label>
          <input
            className="idm-input idm-input--readonly t-mono selectable"
            value={address}
            readOnly
            title={address}
          />
        </div>

        <div className="idm-complete__field">
          <label className="idm-complete__label">{t("The file saved as")}</label>
          <input
            className="idm-input idm-input--readonly t-mono selectable"
            value={path}
            readOnly
            title={path}
          />
        </div>

        <div className="idm-complete__btns">
          <button
            type="button"
            className="btn btn--primary idm-complete__btn"
            autoFocus
            disabled={!item}
            onClick={() => void run(api.openItem(id), t("Could not open the file"))}
          >
            {t("Open")}
          </button>
          <button
            type="button"
            className="btn idm-complete__btn"
            disabled={!item}
            onClick={() => void run(api.openWithItem(id), t("Could not open Open With dialog"))}
          >
            {t("Open with...")}
          </button>
          <button
            type="button"
            className="btn idm-complete__btn"
            disabled={!item}
            onClick={() => void run(api.revealItem(id), t("Could not open the folder"))}
          >
            {t("Open folder")}
          </button>
          <button type="button" className="btn idm-complete__btn" onClick={() => void close()}>
            {t("Close")}
          </button>
        </div>

        <div className="idm-complete__extras">
          <div className="idm-complete__extras-group">
            {!sha256 ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={!path || hashing}
                onClick={() => void handleHash()}
              >
                <Icon name="shield" size={13} /> {hashing ? t("Computing SHA-256…") : t("Verify SHA-256")}
              </button>
            ) : (
              <>
                <span className="idm-complete__hash selectable" title={sha256}>
                  {sha256}
                </span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={async () => {
                    if (await copyText(sha256)) toast(t("SHA-256 copied"), { kind: "success", ms: 1500 });
                  }}
                >
                  <Icon name="copy" size={12} /> {t("Copy")}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => void openUrl(`https://www.virustotal.com/gui/search/${sha256}`)}
                  title={t("Check file hash on VirusTotal")}
                >
                  <Icon name="globe" size={12} /> VirusTotal
                </button>
              </>
            )}
          </div>

          <div className="idm-complete__extras-group">
            {isArchive && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={!path || extracting}
                onClick={() => void handleExtract()}
              >
                <Icon name="compressed" size={13} /> {extracting ? t("Extracting…") : t("Extract here")}
              </button>
            )}
            <Checkbox
              checked={autoExtract}
              onChange={(v) => void patchSettings({ downloads: { autoExtract: v } })}
            >
              {t("Auto-extract archives")}
            </Checkbox>
          </div>
        </div>

        <div className="idm-complete__footer">
          <Checkbox checked={dontShow} onChange={setDontShow}>
            {t("Don't show this dialog again")}
          </Checkbox>

          {media && (
            <div className="idm-complete__tools">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => void run(api.openTools({ tab: "convert", paths: [media] }), t("Could not open Tools"))}
              >
                <Icon name="convert" size={13} /> {t("Convert")}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => void run(api.openTools({ tab: "shrink", paths: [media] }), t("Could not open Tools"))}
              >
                <Icon name="shrink" size={13} /> {t("Make smaller")}
              </button>
            </div>
          )}

          <button
            type="button"
            className="idm-drag-handle"
            draggable={Boolean(path)}
            onDragStart={(e) => {
              if (!path) return;
              e.dataTransfer.setData("text/plain", path);
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={async () => {
              if (path && (await copyText(path))) {
                toast(t("File path copied"), { kind: "success", ms: 1500 });
              }
            }}
            title={t("Drag file path or click to copy path")}
            aria-label={t("Drag file path or click to copy path")}
          >
            <svg width="20" height="18" viewBox="0 0 22 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 10V4.5a1 1 0 0 1 2 0V9" />
              <path d="M11 8V3.5a1 1 0 0 1 2 0V8" />
              <path d="M13 8.5V4.5a1 1 0 0 1 2 0V10" />
              <path d="M15 9.5V6.5a1 1 0 0 1 2 0V13a5 5 0 0 1-5 5H9.5a4.5 4.5 0 0 1-3.8-2.1L3.8 13a1.2 1.2 0 0 1 1.7-1.6L7 12.5V6a1 1 0 0 1 2 0" />
              <path d="M19 3l2 2-2 2M16 5h5" stroke="var(--accent)" strokeWidth="1.6" />
            </svg>
          </button>
        </div>
      </div>
    </WindowFrame>
  );
}
