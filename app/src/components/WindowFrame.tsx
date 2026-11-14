import { type ReactNode, useEffect } from "react";
import { Icon } from "../design/icons";
import { inTauri } from "../lib/api";
import { t } from "../lib/i18n";
import { win } from "../lib/win";

/** Preview sizes mirror `spec()` in src-tauri/src/windows.rs (used only in the browser preview). */
export const WINDOW_SIZES: Record<string, [number, number]> = {
  capture: [600, 440],
  batch: [820, 580],
  video: [680, 590],
  complete: [580, 410],
  details: [760, 580],
  torrent: [680, 580],
  model: [760, 610],
  tools: [640, 580],
  addurl: [600, 300],
  mini: [360, 220],
  dropzone: [112, 112],
};

interface Props {
  kind: keyof typeof WINDOW_SIZES;
  title?: ReactNode;
  icon?: ReactNode;
  /** Extra header controls (pin, mini…) before the caption buttons. */
  actions?: ReactNode;
  onClose?: () => void;
  minimizable?: boolean;
  maximizable?: boolean;
  trayMinimizable?: boolean;
  children: ReactNode;
  className?: string;
  bare?: boolean;
}

/**
 * Frame for undecorated, transparent secondary windows: rounded glass shell, draggable
 * title bar and its own caption buttons. Shows the native window after the first paint.
 * Outside Tauri the window is staged at its real size on a wallpaper for previews.
 */
export function WindowFrame({
  kind,
  title,
  icon,
  actions,
  onClose,
  minimizable = true,
  maximizable,
  trayMinimizable = true,
  children,
  className,
  bare,
}: Props) {
  useEffect(() => {
    // After the first paint; the timer covers webviews that pause animation frames while hidden.
    let shown = false;
    const show = () => {
      if (!shown) {
        shown = true;
        void win.show();
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(show));
    const timer = window.setTimeout(show, 120);
    return () => window.clearTimeout(timer);
  }, []);

  const close = onClose ?? (() => void win.close());
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented && !document.querySelector(".modal-scrim, .menu--floating")) close();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [close]);

  const frame = (
    <div className={`wframe glass-strong ${className ?? ""}`}>
      {!bare && (
        <header className="wtitle" data-tauri-drag-region>
          {icon}
          <span className="wtitle__text" data-tauri-drag-region>
            {title}
          </span>
          {actions}
          <div className="caption">
            {trayMinimizable && (
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
            )}
            {minimizable && (
              <button type="button" className="caption__btn" title={t("Minimize")} aria-label={t("Minimize")} onClick={() => void win.minimize()}>
                <Icon name="minimize" size={16} strokeWidth={1.25} />
              </button>
            )}
            {(maximizable ?? (kind === "details" || kind === "batch" || kind === "video")) && (
              <button type="button" className="caption__btn" title={t("Maximize")} aria-label={t("Maximize")} onClick={() => void win.toggleMaximize()}>
                <Icon name="maximize" size={14} strokeWidth={1.5} />
              </button>
            )}
            <button type="button" className="caption__btn caption__btn--close" title={t("Close")} aria-label={t("Close")} onClick={close}>
              <Icon name="close" size={16} strokeWidth={1.4} />
            </button>
          </div>
        </header>
      )}
      {children}
    </div>
  );

  if (inTauri) return frame;
  const [w, h] = WINDOW_SIZES[kind];
  return (
    <div className="preview-desktop">
      <div className="preview-window" style={{ width: w, height: h }}>
        {frame}
      </div>
    </div>
  );
}
