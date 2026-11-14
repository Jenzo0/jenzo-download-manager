First start of Jenzo
====================
Jenzo isn't notarized by Apple (that needs a paid developer account), so macOS blocks it
the first time. Allow it once: in Terminal run

    xattr -dr com.apple.quarantine "/Applications/Jenzo Download Manager.app"

or open Jenzo, then System Settings -> Privacy & Security -> "Open Anyway".

Jenzo browser extension
=======================

Chrome, Edge, Brave, Opera, Vivaldi, Helium: add it from the Chrome Web Store (it updates by itself):

    https://chromewebstore.google.com/detail/jenzo-download-manager/gkjhkpplhodplkeeefopddeaggdlcile

1. Open the link, click "Add to Chrome" (Brave: "Add to Brave"), then "Add extension".
   Edge first asks to allow extensions from other stores: click "Allow".
   Opera first offers its "Install Chrome Extensions" add-on: add it, then come back.
2. Pin the Jenzo icon (puzzle icon -> pin). It should say "Connected".

Jenzo walks you through this on first start, and any time in Settings -> Browser
integration. Added Jenzo by hand before (Developer mode -> Load unpacked)? Remove that copy
on chrome://extensions first: it doesn't update by itself.

Firefox and Zen (Jenzo isn't in Firefox Add-ons yet)
1. Open about:debugging#/runtime/this-firefox
2. "Load Temporary Add-on..." -> pick manifest.json in the folder Jenzo shows in
   Settings -> Browser integration (~/Library/Application Support/Jenzo/extension/firefox).
   Firefox forgets temporary add-ons on restart.
