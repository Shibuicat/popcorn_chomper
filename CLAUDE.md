# Popcorn Chomper

A Firefox browser extension that blocks adult content, manga/manhwa sites, and social media sites using the `webRequest` API.

## How it works

The extension intercepts all outgoing network requests via `browser.webRequest.onBeforeRequest` and cancels requests that match a blocked domain or pattern.

There are three blocking mechanisms in `popcorn_chomper.js`:

1. **Exact domain match** (`blockedDomainsObj`) — a hardcoded object of domains mapped to `true`. If the request hostname is in this object, the request is cancelled.

2. **Pattern match** (`patterns`) — a set of keyword strings. If the request hostname contains any of these keywords, the request is cancelled. Useful for catching variants and subdomains without listing every one explicitly (e.g. `porn` catches `pornhub.com`, `xporn.net`, etc).

3. **Social media root-only block** (`known_social_media_sites`) — blocks only the root path (`pathname.length === 1`) of known social media sites. This allows deep links to work while blocking the homepage/feed. Currently only `www.instagram.com` is active here.

## File structure

- `popcorn_chomper.js` — all blocking logic
- `manifest.json` — extension manifest (Manifest V2, Firefox)
- `icons/favicon.png` — extension icon
- `publish.sh` — packaging script

## Manifest

Uses Manifest V2 with `webRequestBlocking` permission, which is required for synchronously cancelling requests. This is Firefox-only — Chrome dropped MV2 support.

## System-level DNS blocking (complementary layer)

The extension alone is bypassable. A stronger setup adds Cloudflare's 1.1.1.3 "for Families" DNS at the OS level, which blocks adult content before the browser even sees the request.

`setup_dns.sh` automates this for Fedora/systemd systems.

There are two ways to configure systemd-resolved:

**Option 1 — Drop-in file (preferred):** create `/etc/systemd/resolved.conf.d/<any-name>.conf`. systemd-resolved merges all `*.conf` files in that directory on top of the base config. This is preferred because it works on any machine regardless of what is already in the base config file, and it does not modify files owned by the OS.

**Option 2 — Edit `/etc/systemd/resolved.conf` directly:** works but fragile across machines since lines may be absent, commented, or already set to something else.

`setup_dns.sh` uses Option 1. It writes:

```
[Resolve]
DNS=1.1.1.3 1.0.0.3
FallbackDNS=8.8.8.8
```

`/etc/resolv.conf` does not need to be touched. On Fedora it is a symlink to `/run/systemd/resolve/stub-resolv.conf` which points to `127.0.0.53` (systemd-resolved's stub listener). The stub forwards queries upstream to whatever is configured in `resolved.conf.d`. The chain is:

```
app → 127.0.0.53 (stub) → systemd-resolved → 1.1.1.3
```

Run with:
```bash
sudo ./setup_dns.sh
```

## Adding new blocks

- To block a specific domain: add it to `blockedDomainsObj`
- To block a category of sites by keyword: add the keyword to `patterns`
- To block only the root of a social media site: add it to `known_social_media_sites`
