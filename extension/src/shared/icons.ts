/** Inline SVG icons (drawn for Jenzo Download Manager (JDM); no third-party icon sets). */

let gradSeq = 0;

/** The JDM mark: 3D orange & electric-blue play-triangle ribbon enclosing a white download arrow & tray. */
export function jenzoMark(size = 18): string {
  const id = `jdm-g${++gradSeq}`;
  return `<svg class="jenzo-mark" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" aria-hidden="true">
<defs>
<linearGradient id="${id}t" x1="12" y1="6" x2="56" y2="34" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#ff9a1f"/><stop offset=".5" stop-color="#ffbe3d"/><stop offset="1" stop-color="#ff6200"/></linearGradient>
<linearGradient id="${id}lt" x1="14" y1="8" x2="14" y2="36" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#ff8814"/><stop offset="1" stop-color="#e04800"/></linearGradient>
<linearGradient id="${id}lb" x1="14" y1="30" x2="14" y2="58" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#0066ff"/><stop offset="1" stop-color="#003799"/></linearGradient>
<linearGradient id="${id}b" x1="14" y1="56" x2="56" y2="32" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#0044cc"/><stop offset=".55" stop-color="#0095ff"/><stop offset="1" stop-color="#00d0ff"/></linearGradient>
</defs>
<rect x="2" y="2" width="60" height="60" rx="16" fill="#0d1526" stroke="#ff8814" stroke-opacity=".45" stroke-width="1.5"/>
<path d="M13 15C13 11 17.2 8.8 20.6 10.8L22.8 18.5V34L13 41V15Z" fill="url(#${id}lt)"/>
<path d="M13 34L22.8 27V44.5L20.6 52.2C17.2 54.2 13 52 13 48V34Z" fill="url(#${id}lb)"/>
<path d="M15.5 51.8C18 53.8 21.4 53.5 24.8 51.5L51.2 36C55 33.7 55.4 29.2 52 26.8L43.5 25L22.5 42L15.5 51.8Z" fill="url(#${id}b)"/>
<path d="M15 11.2C17.8 8.8 21.6 9 25.2 11.1L51.8 26.4C55.4 28.5 55.4 33.2 51.8 35.4L44.8 31.2L22.5 18.8L15 11.2Z" fill="url(#${id}t)"/>
<path d="M29.5 21H33.5V31H37.8L31.5 37.5L25.2 31H29.5V21Z" fill="#fff"/>
<path d="M24 36V39.6C24 40.7 24.9 41.6 26 41.6H37C38.1 41.6 39 40.7 39 39.6V36" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

const s = (body: string, size = 16) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icons = {
  download: (n?: number) => s('<path d="M12 4v11"/><path d="m7 10.5 5 5 5-5"/><path d="M5 19.5h14"/>', n),
  chevronDown: (n?: number) => s('<path d="m7 10 5 5 5-5"/>', n),
  check: (n?: number) => s('<path d="m5 12.5 4.5 4.5L19 7.5"/>', n),
  link: (n?: number) =>
    s('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l2.8-2.8a4.5 4.5 0 0 0-6.4-6.4L11.6 6"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-2.8 2.8a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>', n),
  image: (n?: number) =>
    s('<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 4.5-4.5 3.5 3.5 2.5-2.5L20 19"/>', n),
  film: (n?: number) =>
    s('<rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="m10.5 9.5 4 2.5-4 2.5z" fill="currentColor"/>', n),
  audio: (n?: number) => s('<path d="M9 17.5V6l10-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>', n),
  stream: (n?: number) => s('<path d="M4 7h16M4 12h16M4 17h10"/><path d="m17 15 3 2-3 2z" fill="currentColor"/>', n),
  gear: (n?: number) =>
    s('<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.6 7.6 0 0 0 7 6.5l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4 1 2-3.4z"/>', n),
  external: (n?: number) => s('<path d="M14 4.5h5.5V10"/><path d="M19.5 4.5 11 13"/><path d="M18 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1H10"/>', n),
  alert: (n?: number) => s('<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.2"/><path d="M12 17.2h.01"/>', n),
  refresh: (n?: number) => s('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>', n),
  close: (n?: number) => s('<path d="m6.5 6.5 11 11M17.5 6.5l-11 11"/>', n),
};
