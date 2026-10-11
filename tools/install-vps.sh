#!/usr/bin/env bash
# Install from an extracted repository archive on a fresh Ubuntu 24.04 VPS.
set -Eeuo pipefail
if [ "$(id -u)" != 0 ]; then echo 'Run as root'; exit 1; fi
SOURCE=$(cd "$(dirname "$0")/.." && pwd)
PUBLIC_URL=${1:?Usage: bash tools/install-vps.sh http://PUBLIC_IP [room-limit]}
ROOM_LIMIT=${2:-2}
if [[ ! $PUBLIC_URL =~ ^https?://[a-zA-Z0-9.:-]+$ ]]; then echo 'Invalid public URL'; exit 1; fi
if [[ ! $ROOM_LIMIT =~ ^[0-9]+$ ]] || (( ROOM_LIMIT < 1 || ROOM_LIMIT > 30 )); then echo 'Room limit must be 1..30'; exit 1; fi
if [ "$(uname -m)" != x86_64 ]; then echo 'This installer supports x86_64'; exit 1; fi
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends ca-certificates curl xz-utils nginx
WORK=$(mktemp -d /tmp/quarantine-install.XXXXXXXX)
cd "$WORK"
curl -fL --retry 3 https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt -o SHASUMS256.txt
NODE_ARCHIVE=$(awk '$2 ~ /^node-v24\.[0-9]+\.[0-9]+-linux-x64.tar.xz$/ {print $2; exit}' SHASUMS256.txt)
[ -n "$NODE_ARCHIVE" ] || { echo 'Node.js archive not found'; exit 1; }
curl -fL --retry 3 "https://nodejs.org/dist/latest-v24.x/$NODE_ARCHIVE" -o "$NODE_ARCHIVE"
awk -v archive="$NODE_ARCHIVE" '$2 == archive' SHASUMS256.txt > node.sha256
sha256sum -c node.sha256
install -d /opt/quarantine/node /opt/quarantine/app
tar -xJf "$NODE_ARCHIVE" -C /opt/quarantine/node --strip-components=1
export PATH=/opt/quarantine/node/bin:$PATH
APP=/opt/quarantine/app
for file in index.html style.css game.js core.js content.js controls.js music.js render.js simulation.js terrain.js netcode.js server.js package.json package-lock.json update-public.pem; do
  install -m 644 "$SOURCE/$file" "$APP/$file"
done
cp -a "$SOURCE/desktop" "$APP/"
install -d "$APP/assets"
install -m 644 "$SOURCE/assets/icon.png" "$APP/assets/icon.png"
cd "$APP"
npm ci --omit=dev --ignore-scripts --no-audit --no-fund
id quarantine >/dev/null 2>&1 || useradd --system --home-dir /var/lib/quarantine --shell /usr/sbin/nologin quarantine
cat > /etc/systemd/system/quarantine.service <<EOF
[Unit]
Description=Quarantine cooperative game server
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=quarantine
Group=quarantine
WorkingDirectory=/opt/quarantine/app
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=5173
Environment=QUARANTINE_PUBLIC_URL=$PUBLIC_URL
Environment=QUARANTINE_ROOM_LIMIT=$ROOM_LIMIT
ExecStart=/opt/quarantine/node/bin/node --max-old-space-size=256 /opt/quarantine/app/server.js
Restart=on-failure
RestartSec=3
StateDirectory=quarantine
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
MemoryMax=650M
LimitNOFILE=4096

[Install]
WantedBy=multi-user.target
EOF
cat > /etc/nginx/conf.d/quarantine-websocket.conf <<'EOF'
map $http_upgrade $quarantine_connection {
    default upgrade;
    '' close;
}
EOF
cat > /etc/nginx/sites-available/quarantine <<'EOF'
server {
    listen 80;
    server_name _;
    client_max_body_size 32k;
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $quarantine_connection;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
        proxy_read_timeout 65s;
    }
}
EOF
if [ -L /etc/nginx/sites-enabled/default ]; then
    mv /etc/nginx/sites-enabled/default /etc/nginx/quarantine-default-site.backup
fi
ln -sfn /etc/nginx/sites-available/quarantine /etc/nginx/sites-enabled/quarantine
nginx -t
systemctl daemon-reload
systemctl enable --now quarantine
systemctl restart quarantine
systemctl enable --now nginx
systemctl reload nginx
if command -v ufw >/dev/null && ufw status | grep -q '^Status: active'; then ufw allow 80/tcp; fi
for attempt in {1..15}; do
    if curl -fsS http://127.0.0.1/api/info; then printf '\nREADY: %s\n' "$PUBLIC_URL"; exit 0; fi
    sleep 1
done
journalctl -u quarantine -n 30 --no-pager
exit 1
