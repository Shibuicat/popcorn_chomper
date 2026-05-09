# Popcorn Chomper

A Firefox browser extension for mindfulness and self-control. It blocks adult content, manga/manhwa sites, and addictive social media feeds to reduce compulsive browsing. Built on the `webRequest` API.

## Purpose & guiding principle

This extension exists to support focused, intentional use of the internet by removing easy access to addictive or harmful content. The goal is not to make sites completely inaccessible, but to block the specific entry points and content types that trigger compulsive behaviour — infinite feeds, short-form video, adult content, and passive browsing.

**When making implementation decisions, follow this principle:** block the addictive surface, preserve functional use. For example:
- Instagram DMs (`/direct`) are allowed — messaging a friend is intentional. The feed is not.
- Reddit discussions are allowed — reading a specific thread is intentional. The homepage feed is not.
- YouTube videos are allowed — watching something specific is intentional. The homepage and Shorts feed are not.
- Facebook is accessible for communication, but Reels and the homepage feed are blocked.

Adult content and manga/manhwa sites have no functional use case here and are blocked entirely.

## How it works

The extension intercepts all outgoing network requests via `browser.webRequest.onBeforeRequest` and cancels requests that match a rule. Checks are evaluated in order — domain-only checks first, path/query checks second — so expensive URL parsing only happens after a domain match.

There are eight blocking mechanisms in `popcorn_chomper.js`:

1. **Private browsing full block** (`private_browsing_block`) — array of domain suffixes fully blocked when the request comes from a private browsing window (`cookieStoreId === "firefox-private"`). Checked before all other rules. Requires "Run in Private Windows" to be enabled in `about:addons`. Currently blocks `youtube.com` and all its subdomains in private mode.

2. **Exact domain match** (`blockedDomainsObj`) — hardcoded domains mapped to `true`. Fully blocks all requests to that hostname. Used for adult/AV sites, manga sites, Twitter, and Reddit's video CDN (`v.redd.it`).

3. **Domain pattern match** (`domain_patterns`) — keyword strings checked against the hostname via `includes()`. Catches domain variants and subdomains without enumerating every one (e.g. `porn` catches `pornhub.com`, `xporn.net`, etc). Also covers TikTok via the `tiktok` keyword.

4. **Domain suffix match** (`domain_suffix_rules`) — matches requests where the hostname ends with a given suffix. If `pathContains` is specified, also checks that the path contains that string. If omitted, all requests to that domain suffix are blocked. Used to block `.mp4` video files from `*.fbcdn.net` and to fully block all of `*.pixiv.net`.

5. **Social media blocklist** (`social_media_blocklist`) — per-domain rules that block specific paths while allowing everything else. Supports two match types:
   - `exact` — blocks if `pathname === p` (used for homepages `/`)
   - `prefix` — blocks if `pathname.startsWith(p)` (used for `/shorts/`, `/reel/`)

   Currently active:
   - Reddit — blocks homepage only; `v.redd.it` is fully blocked via `blockedDomainsObj`
   - YouTube — blocks homepage and `/shorts/`
   - Facebook — blocks homepage and `/reel/`

6. **Search query filter** (`search_query_rules`) — array of rules with a `suffix` (top domain) and `param` (query parameter name). Matches any subdomain of the suffix, so a single entry covers `www.`, `m.`, and any other subdomain. If the lowercased query value contains any keyword from `search_patterns`, the request is cancelled. `URLSearchParams.get()` automatically decodes `+` and `%20` to spaces, so phrase matching works correctly regardless of encoding. Currently active for `google.com` (`q`), `youtube.com` (`search_query`), `reddit.com` (`q`), and `facebook.com` (`q`).

7. **Post slug filter** (`path_slug_filter_rules`) — array of rules with a `suffix` and a `pathRegex` with a capture group that extracts the slug from the URL path. Underscores in the slug are replaced with spaces before matching, so multi-word phrase keywords work correctly. Currently active for Reddit post URLs (`/r/{sub}/comments/{id}/{slug}/`).

8. **Social media allowlist** (`social_media_allowlist`) — inverse of the blocklist. Blocks everything on a domain EXCEPT the listed path prefixes. Used for Instagram: only `/direct`, `/api/graphql`, `/rupload_igphoto`, and `/api/v1/discover/web/explore_grid` are allowed through.

## Keyword lists

- `domain_patterns` — keywords matched against hostnames for domain blocking. Covers adult content terms, manga/manhwa, JAV, and Vietnamese adult site patterns.
- `search_patterns` — keywords matched against search query strings. Broader than `domain_patterns` — includes terms that appear in searches but not in domain names (e.g. `pantyhose`, `uncensored`, `rule34`). These two lists are intentionally separate. Supports single words and multi-word phrases (e.g. `"croming fancam"`).

**Guiding rule for `search_patterns`:** block distraction and adult content, not offensive content. A term like `sex` or `naked` can appear in legitimate educational, medical, or news searches — don't add broad terms just because they can appear in adult contexts. Prefer specific terms (JAV codes, site names, niche content labels) that rarely appear outside the content you're targeting.

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

- **Fully block a domain**: add to `blockedDomainsObj`
- **Block all variants of a site category**: add a keyword to `domain_patterns`
- **Block specific paths on a social media site**: add to `social_media_blocklist` with `exact` and/or `prefix` arrays
- **Allow only specific paths on a domain**: add to `social_media_allowlist` with an array of allowed path prefixes
- **Block a domain in private browsing only**: add its suffix to `private_browsing_block`
- **Block all requests to a top domain**: add `{ suffix }` to `domain_suffix_rules`
- **Block a CDN by domain suffix + path content**: add `{ suffix, pathContains }` to `domain_suffix_rules`
- **Filter post/page slugs by keyword**: add a `{ suffix, pathRegex, captureGroup }` entry to `path_slug_filter_rules`
- **Block search queries on a search engine**: add a `{ suffix, param }` entry to `search_query_rules` and the keyword to `search_patterns`
