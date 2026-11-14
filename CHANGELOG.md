# Changelog — Jenzo Download Manager (JDM & JTM)

All notable changes, features, visual refinements, and bug fixes for **Jenzo Download Manager** are documented in this file.

---

## [1.6.1] — 2026-11-14

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

---

## [1.6.0] — 2026-11-14

### ✨ Major New Features (10 Power Upgrades)
1. **BitTorrent (`JTM`) Deep File Selector & Live Progress (`BottomPane.tsx`):**
   - Added a dedicated **Files** tab in the bottom inspector for torrents (`JTM`), showing per-file sizes, individual progress bars, percentage completion, and checkboxes to toggle which files inside a multi-file torrent are downloaded (`torrentSelectFiles`).
2. **BitTorrent (`JTM`) Tracker Manager & One-Click Tracker Booster (`BottomPane.tsx`, `Toolbar.tsx`, `itemMenu.ts`):**
   - Added a **Trackers** tab in the bottom inspector displaying all configured trackers for the selected torrent.
   - Added **Boost Trackers** (`boost_torrent_trackers`) in the toolbar, context menu, and Trackers tab to inject a curated list of 20 high-speed public UDP/HTTP trackers (`ngosang/trackerslist`) into active torrents.
3. **BitTorrent (`JTM`) Seeding Ratio & Upload Speed Limiter (`SettingsSheet.tsx`, `jobs.rs`, `jenzo-torrent`):**
   - Added configurable **Stop seeding when download completes** toggle, **Seed ratio limit** (e.g., `1.0`, `2.0`), and **Max upload speed (KB/s)** limit in **Settings → Speed & queues**.
4. **Optional Auto-Extract Archives (`SettingsSheet.tsx`, `CompleteWindow.tsx`, `capture.rs`):**
   - Added native `.zip` and `.tar.gz` / `.tgz` archive extraction (`extract_archive` command).
   - Made automatic extraction **100% optional** (default `OFF`) via **Settings → Downloads → Auto-extract archives when finished**, and added both an **"Auto-extract archives when finished"** checkbox and an instant **"Extract here"** button directly inside the **Download Complete** dialog whenever an archive is downloaded.
5. **SHA-256 Checksum Verifier & One-Click VirusTotal Lookup (`CompleteWindow.tsx`, `commands.rs`):**
   - Added streaming **Verify SHA-256** computation in the **Download Complete** dialog with one-click **Copy hash** and **VirusTotal** hash lookup.
6. **Smart Download Routing Rules Engine (`SettingsSheet.tsx`, `capture.rs`):**
   - Added customizable domain + extension routing rules (`SmartRouteRule`) in **Settings → Categories** to automatically route matching downloads (e.g., `github.com` + `exe,msi,zip`) to custom target folders.
7. **Live Media Preview / Watch While Downloading (`Toolbar.tsx`, `itemMenu.ts`, `BottomPane.tsx`):**
   - Added **Watch live** (`preview_item`) in the toolbar, right-click menu, and bottom inspector to open in-progress video/audio `.jenzopart` or sequential files in the default media player while downloading.
8. **Bandwidth & Speed Analytics Sheet (`AnalyticsSheet.tsx`, `Toolbar.tsx`):**
   - Added a dedicated **Bandwidth & Speed Analytics** modal (`AnalyticsSheet`) accessible from the toolbar (`chart` icon), displaying **Total Downloaded** (split across `JDM` & `JTM`), **All-Time Peak Speed**, **Average File Size**, **Active Connections**, and a **Category Breakdown** bar chart.
9. **Night Turbo Mode Toggle (`Toolbar.tsx`, `SettingsSheet.tsx`):**
   - Added a one-click **Night Turbo** bolt button in the main toolbar that bypasses global speed limits and boosts parallel queue concurrency to maximum (`8` concurrent jobs).
10. **Live Speed Badge in Floating Dropzone (`DropzoneWindow.tsx`):**
    - Upgraded the floating Always-on-Top **Dropzone** widget to show real-time aggregate download speed (`B/s`, `MB/s`) alongside active job count when downloads are running.

### 🛠️ UX, Window & Visual Bug Fixes
- **Browser Extension Unpacked Loader & Path Fix (`BrowserConnect.tsx`, `integration.rs`):**
  - Fixed a Windows extended-length path bug (`\\?\`) in `extension_folder` so the copied extension directory is always a clean standard Windows path (`D:\...\extension\chromium` or `C:\Program Files\...\extension\chromium`) that can be pasted directly into the Windows folder picker dialog.
  - Promoted the **Load unpacked extension** card to the top of **Settings → Browser integration** (expanded by default) with one-click **Copy folder & open {Browser}** buttons for Chrome, Edge, Brave, Vivaldi, Opera, Chromium, and Firefox (`edge://extensions`, `brave://extensions`, `chrome://extensions`, `about:debugging#/runtime/this-firefox`).
- **Default Window Geometry & Instant Resize Persistence (`tauri.conf.json`, `main.rs`, `windows.rs`, `columns.ts`):**
  - Adjusted default main window dimensions to `1240 × 760` (`minWidth: 880`, `minHeight: 540`) and compacted default table column widths so all columns (`#`, `Name`, `Size`, `Status`, `Progress`, `Speed`, `ETA`, `Added`) fit cleanly without clipping on the right side.
  - Added immediate window state persistence (`tauri_plugin_window_state`) on every `Resized`, `Moved`, and `CloseRequested` event so custom window dimensions and positions are remembered across restarts.
- **Download Complete Dialog Thumbnail Duration Badge Fix (`components.css`, `windows.css`):**
  - Fixed the `:30` / `6:30` video duration badge overflowing to the left of the thumbnail inside the **Download Complete** dialog by setting `.thumb { display: inline-block; position: relative; }` and `.idm-complete__icon { display: grid; place-items: center; overflow: hidden; }`.
- **Sequential Row Numbering (`#`), Bidirectional Title Fix & Auto-Fit Columns (`DownloadTable.tsx`, `TitleRow.tsx`, `columns.ts`, `main.css`):**
  - Added a dedicated sequential `#` index column (`1, 2, 3...`) for both **JDM** (direct downloads) and **JTM** (torrents).
  - Fixed mixed Arabic/English (`RTL`/`LTR`) download titles being truncated prematurely by applying `dir="auto"` and removing forced LTR box clamping.
  - Made all columns (including **Name**) resizable, added **double-click on any column border to auto-fit**, and added **Fit columns to window** + **Reset column widths** in the Columns menu and table header right-click menu.
- **Automated Build Retention Policy (`prune-builds.ps1`, `build.bat`):**
  - Added automatic pruning of old build artifacts so `build/installers`, `build/portable`, and `build/extension` always retain only **the current version (`v1.6.0`) and one previous version (`v1.5.0`)**, keeping the workspace clean and free of temporary files.

---

## [1.5.0] — 2026-11-14

### ✨ Features & Enhancements
- **Glass Transparency Toggle & Opacity Slider (`SettingsSheet.tsx`, `App.tsx`, `tokens.css`):**
  - Added full control over **Liquid Glass** window transparency in **Settings → Appearance** with an ON/OFF toggle and a `20%–100%` opacity slider (`--glass-opacity`).
- **JDM / JTM Mode Switcher Pill (`Sidebar.tsx`, `TitleRow.tsx`, `DownloadTable.tsx`, `tokens.css`):**
  - Added an interactive **JDM / JTM** sliding pill switcher next to the app logo in the sidebar header.
  - Switching between **JDM** (Direct Download Manager) and **JTM** (Jenzo Torrent Manager) dynamically transitions the workspace between direct downloads and BitTorrent jobs, with a dedicated **Emerald-Cyan** accent theme for `JTM`.
- **Collapsible Sidebar Sections (`Sidebar.tsx`, `ui.ts`):**
  - Made `Categories`, `Queues`, `Grabber`, and `Tools` collapsible with smooth chevron animations and persistent state.
- **Neon Glow Accent Presets (`tokens.css`, `SettingsSheet.tsx`):**
  - Added 3 vibrant neon accent themes (**Neon Cyber**, **Neon Laser**, **Neon Matrix**) with glowing hover effects (`--accent-glow`).
- **Liquid Glass Floating Action Pill Fix (`DownloadTable.tsx`, `main.css`):**
  - Fixed text overlap on row hover in the `Added` column by hiding `.added-cell__text` when the floating quick-action pill appears and giving the pill an opaque glass backdrop.
- **Developer Support Card & InstaPay QR (`SettingsSheet.tsx`):**
  - Added developer support card with the official **InstaPay QR Code** and direct support link (`https://ipn.eg/S/jenzo2/instapay/0t6Gvj`) in **About JDM**.

---

## [1.4.0] — 2026-11-08

### ✨ Features & Upgrades (Ported from Prism 1.2.4 + JDM Exclusive Enhancements)
- **Modernized Capture, Progress, Complete & Browser Integration Views:**
  - Redesigned `CaptureWindow.tsx`, `DetailsWindow.tsx`, `CompleteWindow.tsx`, and `BrowserConnect.tsx` with Liquid Glass cards, live 60-second SVG speed sparkline + `Now / Average / Peak` cards, 16-color connection segment bars, and disk free-space telemetry.
- **Synchronized Build Pipeline (`build.bat`):**
  - Unified `build.bat` to build Portable, NSIS Setup Installer, and Browser Extensions (`Chromium` + `Firefox`) in a single pipeline.

---

## [1.3.0] — 2026-11-01

### ✨ Initial Unified Architecture
- Multi-segment work-stealing HTTP/HTTPS/FTP/HLS/DASH engine (`jenzo-engine`), SQLite WAL persistence (`jenzo-core`), self-provisioning `yt-dlp` / `ffmpeg` / `deno` video pipeline (`jenzo-video`), embedded `librqbit` torrent engine (`jenzo-torrent`), and Native Messaging host (`jenzo-native-host`).
