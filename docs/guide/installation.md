# Installing Jenzo

Download the latest version from the **[Releases page](https://github.com/Jenzo0/jenzo-download-manager/releases/latest)**.

| Your system | Download | Notes |
|---|---|---|
| Windows 10 / 11 (64-bit) | `Jenzo_<version>_x64-setup.exe` | Recommended. Installs for your user account, no admin rights needed. |
| Windows (IT / all users) | `Jenzo_<version>_x64_en-US.msi` | Installs for all users; needs administrator rights. |
| Windows (no install) | `Jenzo-<version>-windows-x64-portable.zip` | Unzip anywhere (USB stick works). Settings stay next to `jenzo.exe`. |
| macOS 11+ — Apple Silicon (M1–M4) | `Jenzo_<version>_aarch64.dmg` | |
| macOS 11+ — Intel | `Jenzo_<version>_x64.dmg` | |
| Ubuntu, Debian, Mint, Pop!_OS, elementary | `Jenzo_<version>_amd64.deb` | |
| Fedora, openSUSE, RHEL | `Jenzo-<version>-1.x86_64.rpm` | |
| Any other Linux | `Jenzo_<version>_amd64.AppImage` | |

Every release also contains `SHA256SUMS.txt` so you can verify downloads.

After installing the app, **install the browser extension** — that is what lets Jenzo catch
downloads and videos from your browser: [browser-extension.md](browser-extension.md).

---

## Windows

1. Run `Jenzo_<version>_x64-setup.exe`.
2. Windows SmartScreen may say *"Windows protected your PC"* because the installer is not
   code-signed with a paid certificate. Click **More info → Run anyway**.
3. Jenzo starts and shows a short welcome tour. It sits in the system tray (bottom-right)
   while it works.

The installer also:
* registers Jenzo with Chrome, Edge, Brave, Opera, Vivaldi, Chromium and Firefox (so the
  extension can talk to the app),
* opens `magnet:` links and `.torrent` files with Jenzo,
* adds a Start-menu entry and an uninstaller (Settings → Apps → Jenzo → Uninstall).

**Portable version:** unzip, run `jenzo.exe`. Everything (settings, history, tools) stays in
the `data` folder next to it.

## macOS

1. Open the `.dmg` and drag **Jenzo** into **Applications**.
2. The app is not notarized by Apple (that needs a paid developer account), so macOS blocks
   it the first time — it may refuse to open, say it *"is damaged"*, or close it after a few
   seconds. Allow it once, either way:
   * **Terminal (simplest):**
     ```bash
     xattr -dr com.apple.quarantine /Applications/Jenzo.app
     ```
   * or open Jenzo once, then **System Settings → Privacy & Security** → scroll down →
     **Open Anyway** next to "Jenzo was blocked" → confirm with your password.

   Updates installed from inside Jenzo (it offers them by itself) don't need this again.
3. Optional but recommended for video downloads: `brew install ffmpeg` (Jenzo can also fetch a
   verified ffmpeg build by itself — Settings → Video & streams → Check tools).

## Linux

**Debian / Ubuntu family**

```bash
sudo apt install ./Jenzo_<version>_amd64.deb
```

**Fedora / openSUSE**

```bash
sudo dnf install ./Jenzo-<version>-1.x86_64.rpm      # openSUSE: sudo zypper install ./Jenzo-*.rpm
```

The package needs any `ffmpeg` (`/usr/bin/ffmpeg`): Fedora's `ffmpeg-free` or the full
`ffmpeg` from RPM Fusion both work, and Jenzo uses whichever is installed.

**AppImage (any distribution)**

```bash
chmod +x Jenzo_<version>_amd64.AppImage
./Jenzo_<version>_amd64.AppImage
```

The deb/rpm packages register Jenzo with Chrome, Chromium, Edge and Firefox for all users;
the app itself also registers Brave, Vivaldi and Opera for your user on every start.
`ffmpeg` is installed as a dependency of the deb/rpm packages (AppImage users: install
`ffmpeg` from your distribution for video features).

The tray icon needs an AppIndicator-capable desktop (KDE, Cinnamon, XFCE, MATE work out of the
box; on GNOME install the *AppIndicator and KStatusNotifierItem Support* extension).

## Updating

Install the newer version over the old one — your downloads, queues and settings are kept.
yt-dlp (used for video sites) updates itself automatically in the background.

## Uninstalling

* **Windows:** Settings → Apps → Jenzo → Uninstall (removes the browser registration too).
* **macOS:** drag Jenzo from Applications to the Trash. Settings live in
  `~/Library/Application Support/Jenzo` if you want to remove them as well.
* **Linux:** `sudo apt remove jenzo` / `sudo dnf remove jenzo`; settings live in
  `~/.local/share/jenzo`.
