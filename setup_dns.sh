#!/bin/bash

set -e

if [ "$EUID" -ne 0 ]; then
  echo "Run as root: sudo $0"
  exit 1
fi

echo "Configuring systemd-resolved to use Cloudflare 1.1.1.3 (for Families)..."
mkdir -p /etc/systemd/resolved.conf.d
cat > /etc/systemd/resolved.conf.d/cloudflare-dns.conf << 'EOF'
[Resolve]
DNS=1.1.1.3 1.0.0.3
FallbackDNS=8.8.8.8
EOF

echo "Restarting services..."
systemctl restart systemd-resolved

echo "Verifying..."
resolvectl status | grep -A2 "DNS Servers" | head -5
echo "Done."
