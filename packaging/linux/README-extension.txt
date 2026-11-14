Jenzo browser extension
=======================

  Chrome / Edge / Brave / Opera / Vivaldi / Helium / Chromium
    Add it from the Chrome Web Store (it updates by itself):
    https://chromewebstore.google.com/detail/jenzo-download-manager/gkjhkpplhodplkeeefopddeaggdlcile
    Click "Add to Chrome" (Brave: "Add to Brave"), then "Add extension".
    Added Jenzo by hand before? Remove that copy on chrome://extensions first.

  Firefox / Zen (Jenzo isn't in Firefox Add-ons yet)
    about:debugging#/runtime/this-firefox -> "Load Temporary Add-on" -> manifest.json
    in the `firefox` folder Jenzo shows in Settings -> Browser integration:

      deb / rpm   /usr/lib/Jenzo/extension
      AppImage    ~/.local/share/jenzo/extension (Jenzo copies it there: the AppImage's own
                  files move to a new place every time it starts)

    or jenzo-firefox.zip from the release page, unzipped into a folder that stays.

Jenzo registers its native messaging host automatically. Open Jenzo -> Settings ->
Browser integration to check the status or repair it with one click.
