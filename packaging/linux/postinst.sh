#!/bin/sh
# Jenzo post-install: system-wide native messaging manifests so every user's browser
# can reach the app. (The app also registers per-user manifests on every start, which
# covers Brave, Vivaldi, Opera and custom profiles.)
set -e
HOST=/usr/bin/jenzo-native-host
CHROME_ID=gkjhkpplhodplkeeefopddeaggdlcile
FIREFOX_ID=jenzo@jenzo.dev

chromium_manifest() {
  cat <<JSON
{
  "name": "dev.jenzo.host",
  "description": "Jenzo Download Manager native messaging host",
  "path": "$HOST",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://$CHROME_ID/"]
}
JSON
}

firefox_manifest() {
  cat <<JSON
{
  "name": "dev.jenzo.host",
  "description": "Jenzo Download Manager native messaging host",
  "path": "$HOST",
  "type": "stdio",
  "allowed_extensions": ["$FIREFOX_ID"]
}
JSON
}

for dir in /etc/opt/chrome/native-messaging-hosts /etc/chromium/native-messaging-hosts /etc/opt/edge/native-messaging-hosts; do
  mkdir -p "$dir"
  chromium_manifest > "$dir/dev.jenzo.host.json"
done
for dir in /usr/lib/mozilla/native-messaging-hosts /usr/lib64/mozilla/native-messaging-hosts; do
  if [ -d "$(dirname "$dir")" ] || [ "$dir" = /usr/lib/mozilla/native-messaging-hosts ]; then
    mkdir -p "$dir"
    firefox_manifest > "$dir/dev.jenzo.host.json"
  fi
done

command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database -q /usr/share/applications || true
exit 0
