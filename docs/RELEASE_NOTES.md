# Jenzo Download Manager (JDM & JTM) 1.6.1

Fast multi-connection download manager (**JDM**) and BitTorrent client (**JTM**) for Windows, Linux and macOS, by **Jenzo**.

## What's new in 1.6.1

### 🛠️ Window Geometry, Right-Side Clipping & Visual Audit Fixes
1. **Main Window Right-Edge Clipping & Missing Caption Controls (`—`, `□`, `×`) Fixed (`main.css`, `Toolbar.tsx`, `TitleRow.tsx`):**
   - Added `grid-template-columns: minmax(0, 1fr)` to `.sheet` so CSS Grid never expands `.sheet`'s implicit column width beyond the window frame when the toolbar contains many items (especially in `JTM` mode).
   - Restructured `Toolbar.tsx` into a flexible `.toolbar__actions` container (`flex: 1 1 0%; min-width: 0; overflow-x: auto;`) and a pinned `.toolbar__right` container (`flex: 0 0 auto; margin-inline-start: auto;`) so `Search`, `Settings`, `Minimize to Tray`, `Minimize (—)`, `Maximize / Restore (□)`, and `Close (×)` can **never** be pushed off the right side of the window at any resolution.
   - Wrapped the status filter segmented bar, density toggle, and `Columns` button in `TitleRow.tsx` inside `.titlerow__right` (`flex: 0 0 auto`) so they stay anchored on the right edge without clipping.
2. **Proportional Auto-Fit Table Columns (`columns.ts`, `ui.ts`):**
   - Updated `gridTemplate()` so all non-resized columns (`Name`, `Size`, `Status`, `Progress`, `Speed`, `Time left`, `Added`) use proportional `minmax(minPx, weightFr)` tracks with a compact `686px` minimum row width, ensuring every column through `Time left` and `Added` is 100% visible inside the window on `1366 × 768` displays without horizontal clipping.
   - Added layout schema migration (`layoutV: 2`) in `ui.ts` to reset stale pre-`1.6.1` column widths automatically.
3. **Native Monitor Work-Area Clamping & Default Window Size (`windows.rs`, `main.rs`, `tauri.conf.json`):**
   - Added `windows::ensure_window_in_work_area()` in Rust to automatically clamp the main window and all secondary windows (`capture`, `video`, `batch`, `complete`, `details`, `progress`, `torrent`, `model`, `tools`, `addurl`) inside the active monitor's `work_area()` (excluding the taskbar) on creation, restoration from `.window-state.json`, and tray restore.
   - Updated default main window size to `1160 × 660` (`minWidth: 840`, `minHeight: 500`) and tuned secondary window heights (`model: 610`, `video: 590`, `complete: 580 × 400`) so every window fits comfortably inside `1366 × 720` work areas.
   - Guarded `save_window_state` so minimized windows never overwrite saved window coordinates.
4. **Sidebar Vertical Fit & Section Defaults (`main.css`, `ui.ts`):**
   - Compacted `.sidebar` width (`216px`), `.side-item` height (`30px`), `.side-section` padding, and `.speedcard` height, and defaulted `Tools` and `Grabber` sections to collapsed on first load so top navigation items (`All downloads`, `Unfinished`, `Finished`, `Categories`, `Queues`) never scroll out of view on `768p` screens.
5. **Download Complete 5-Button Row Audit Fix (`windows.css`):**
   - Changed `.idm-complete__btns` from `repeat(4, minmax(0, 1fr))` to `repeat(auto-fit, minmax(84px, 1fr))` so archive completions (`Open`, `Open with...`, `Extract here`, `Open folder`, `Close`) stay on a single clean row instead of wrapping `Close` onto a second line.
6. **What's New Dialog Overhaul (`WhatsNewSheet.tsx`, `locales/*.json`):**
   - Replaced the legacy `NEW IN JDM 1.1.8` (`Lists of links`, `JDM on Linux`, `Dock icon on the Mac`) section and outdated `CHANGES` list with the actual `v1.6.1` and `v1.5.0` JDM & JTM features, fully localized across all 10 language packs.
7. **Official JDM Favicon & Brand Icon Synchronization (`favicon.ico`, `LogoMark.tsx`, `index.html`, `site/`, `assets/brand/`):**
   - Replaced all remaining legacy rainbow-triangle `favicon.ico`, `.png`, and `.svg` files across `source/site/`, `source/app/public/`, and `source/assets/brand/` with the official JDM icon (`source/app/src-tauri/icons/icon.ico`), and updated `LogoMark.tsx` to render the official JDM artwork.

See [CHANGELOG.md](https://github.com/Jenzo0/jenzo-download-manager/blob/main/CHANGELOG.md) for the full history.
