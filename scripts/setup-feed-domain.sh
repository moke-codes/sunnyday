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
  2) Generates Nginx full config at deploy/nginx/<domain>.conf (HTTPS + DID + /xrpc/ proxy)
  3) Generates Nginx HTTP-only config at deploy/nginx/<domain>.http-only.conf (for obtaining TLS cert with certbot)
  4) Generates env snippet at deploy/.env.feedgen

Notes:
  - This script does not edit /etc/nginx or run certbot.
  - You still need DNS and a running feed-generator backend. Use the HTTP-only config first to get a cert, then switch to the full config.
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

  location /internal/ {
    proxy_pass ${backend};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
NGINXCONF

# HTTP-only config: use this first so nginx can start without a cert, then run certbot.
cat > "deploy/nginx/${domain}.http-only.conf" <<NGINXHTTP
# Use this config when you do not yet have a TLS cert. After running certbot, install the full config: deploy/nginx/${domain}.conf
server {
  listen 80;
  server_name ${domain};

  location = /.well-known/did.json {
    root ${web_root};
    default_type application/json;
    add_header Access-Control-Allow-Origin "*";
    add_header Cache-Control "public, max-age=300";
  }

  location / {
    return 200 'ok';
    add_header Content-Type text/plain;
  }
}
NGINXHTTP

cat > deploy/.env.feedgen <<ENVFILE
# Copy this into your app .env
VITE_BSKY_FEEDGEN_DID=${did}
ENVFILE

cat <<DONE
Generated files:
- deploy/did/.well-known/did.json
- deploy/nginx/${domain}.conf
- deploy/nginx/${domain}.http-only.conf
- deploy/.env.feedgen

Deploy steps (run on the server):

1. Copy DID document so Nginx can serve it:
   sudo mkdir -p ${web_root}/.well-known
   sudo cp deploy/did/.well-known/did.json ${web_root}/.well-known/did.json

2. If you do not yet have a TLS certificate for ${domain}:
   a) Install the HTTP-only config (so Nginx can start):
      sudo cp deploy/nginx/${domain}.http-only.conf /etc/nginx/sites-available/${domain}.conf
      sudo ln -sf /etc/nginx/sites-available/${domain}.conf /etc/nginx/sites-enabled/
      sudo nginx -t && sudo systemctl reload nginx
   b) Obtain certificate (e.g. certbot):
      sudo certbot --nginx -d ${domain} --non-interactive --agree-tos --register-unsafely-without-email
   c) Install the full config (HTTPS + DID + /xrpc/ proxy):
      sudo cp deploy/nginx/${domain}.conf /etc/nginx/sites-available/${domain}.conf
      sudo nginx -t && sudo systemctl reload nginx

   If you already have a certificate at /etc/letsencrypt/live/${domain}/:
   sudo cp deploy/nginx/${domain}.conf /etc/nginx/sites-available/
   sudo ln -sf /etc/nginx/sites-available/${domain}.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx

3. Set app env var (e.g. in .env):
   VITE_BSKY_FEEDGEN_DID=${did}

4. Verify DID resolution:
   curl -sS https://${domain}/.well-known/did.json
   (Should show "id":"${did}" and BskyFeedGenerator service.)
DONE
