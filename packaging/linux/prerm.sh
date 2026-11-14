#!/bin/sh
# Jenzo pre-remove: delete the system-wide native messaging manifests.
for f in /etc/opt/chrome/native-messaging-hosts/dev.jenzo.host.json \
         /etc/chromium/native-messaging-hosts/dev.jenzo.host.json \
         /etc/opt/edge/native-messaging-hosts/dev.jenzo.host.json \
         /usr/lib/mozilla/native-messaging-hosts/dev.jenzo.host.json \
         /usr/lib64/mozilla/native-messaging-hosts/dev.jenzo.host.json; do
  rm -f "$f"
done
exit 0
