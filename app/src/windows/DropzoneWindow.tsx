import { useEffect, useState } from "react";
import { LogoMark } from "../components/LogoMark";
import { WindowFrame } from "../components/WindowFrame";
import { Icon } from "../design/icons";
import { api } from "../lib/api";
import { formatSpeed } from "../lib/format";
import { t } from "../lib/i18n";
import { useApp } from "../lib/store";
import { attempt } from "../lib/ui";
import { handleDrop } from "../lib/drop";

/** Floating drop target: drag links or .torrent files onto the orb. Double-click opens Jenzo. */
export default function DropzoneWindow() {
  const [over, setOver] = useState(false);
  const [flash, setFlash] = useState(false);
  const liveSpeed = useApp((s) => Object.values(s.progress).reduce((sum, p) => sum + (p.speed ?? 0), 0));
  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(false), 900);
    return () => window.clearTimeout(timer);
  }, [flash]);
  return (
    <WindowFrame kind="dropzone" bare className="dropzone-frame">
      <div
        className={`dropzone${over ? " is-over" : ""}${flash ? " is-done" : ""}`}
        data-tauri-drag-region
        role="button"
        tabIndex={0}
        aria-label={t("Drop links here to download. Double-click to open JDM.")}
        data-tip={t("Drop links here · double-click opens JDM")}
        onDoubleClick={() => void attempt(api.showMain())}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setOver(false);
          await handleDrop(e.dataTransfer);
          setFlash(true);
        }}
      >
        {flash ? <Icon name="check" size={34} strokeWidth={2} className="text-success" /> : <LogoMark size={50} />}
        {liveSpeed > 0 && !flash && (
          <span
            className="tnum"
            style={{
              position: "absolute",
              bottom: 6,
              fontSize: 9.5,
              fontWeight: 700,
              color: "#fff",
              background: "rgb(0 0 0 / 0.65)",
              padding: "1px 5px",
              borderRadius: 999,
              boxShadow: "0 0 8px rgb(var(--accent-rgb) / 0.6)",
              pointerEvents: "none",
            }}
          >
            {formatSpeed(liveSpeed)}
          </span>
        )}
        <button type="button" className="dropzone__close" aria-label={t("Hide drop zone")} onClick={() => void attempt(api.toggleDropzone())}>
          <Icon name="close" size={11} strokeWidth={2} />
        </button>
      </div>
    </WindowFrame>
  );
}
