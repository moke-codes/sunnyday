#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage:
  scripts/setup-feed-domain.sh \
    --domain feeds.example.com \
    --backend http://127.0.0.1:3000 \
    [--web-root /var/www/feeds]

What it does:
  1) Generates DID document at deploy/did/.well-known/did.json
  2) Generates Nginx server block template at deploy/nginx/<domain>.conf
  3) Generates env snippet at deploy/.env.feedgen

Notes:
  - This script does not edit /etc/nginx directly.
  - You still need DNS, TLS certificate, and a running feed-generator backend.
USAGE
}

domain=""
backend=""
web_root="/var/www/feeds"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      domain="${2:-}"
      shift 2
      ;;
    --backend)
      backend="${2:-}"
      shift 2
      ;;
    --web-root)
      web_root="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$domain" || -z "$backend" ]]; then
  echo "--domain and --backend are required." >&2
  usage
  exit 1
fi

if [[ ! "$domain" =~ ^[a-zA-Z0-9.-]+$ ]]; then
  echo "Invalid domain: $domain" >&2
  exit 1
fi

if [[ "$backend" != http://* && "$backend" != https://* ]]; then
  echo "--backend must start with http:// or https://" >&2
  exit 1
fi

did="did:web:${domain}"

mkdir -p deploy/nginx deploy/did/.well-known

cat > deploy/did/.well-known/did.json <<DIDJSON
{
  "@context": [
    "https://www.w3.org/ns/did/v1"
  ],
  "id": "${did}",
  "service": [
    {
      "id": "#bsky_fg",
      "type": "BskyFeedGenerator",
      "serviceEndpoint": "https://${domain}"
    }
  ]
}
DIDJSON

cat > "deploy/nginx/${domain}.conf" <<NGINXCONF
server {
  listen 80;
  server_name ${domain};
  return 301 https://\$host\$request_uri;
}

server {
  listen 443 ssl http2;
  server_name ${domain};

  # Configure these certificate paths (or use Certbot-managed includes).
  ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;

  location = /.well-known/did.json {
    root ${web_root};
    default_type application/json;
    add_header Access-Control-Allow-Origin "*";
    add_header Cache-Control "public, max-age=300";
  }

  location /xrpc/ {
    proxy_pass ${backend};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
NGINXCONF

cat > deploy/.env.feedgen <<ENVFILE
# Copy this into your app .env
VITE_BSKY_FEEDGEN_DID=${did}
ENVFILE

cat <<DONE
Generated files:
- deploy/did/.well-known/did.json
- deploy/nginx/${domain}.conf
- deploy/.env.feedgen

Next steps:
1. Copy DID file to server path:
   ${web_root}/.well-known/did.json
2. Install nginx conf:
   /etc/nginx/sites-available/${domain}.conf
   and symlink in /etc/nginx/sites-enabled/
3. Reload nginx:
   sudo nginx -t && sudo systemctl reload nginx
4. Set app env var:
   VITE_BSKY_FEEDGEN_DID=${did}
DONE
