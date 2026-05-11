# Implementation

## Architecture Overview

The extension is built on Firefox's `webRequest` API (Manifest V2). It registers a single synchronous listener on `browser.webRequest.onBeforeRequest` that intercepts every outgoing network request and returns `{ cancel: true }` to block it, or nothing to allow it through.

A second layer exists at the OS level: Cloudflare's 1.1.1.3 DNS resolver blocks adult content before the browser even resolves the hostname.

```
Request initiated
      │
      ▼
browser.webRequest.onBeforeRequest
      │
      ▼
blockThumbnailImage()           ← runs synchronously, must return fast
      │
      ├─ blockedDomainsObj       ← O(1) hash lookup
      ├─ private_browsing_block  ← suffix loop
      ├─ domain_patterns         ← substring loop on hostname
      ├─ domain_suffix_rules     ← suffix + optional path check
      ├─ social_media_blocklist  ← exact/prefix path checks
      ├─ search_query_rules      ← query param keyword check
      ├─ path_slug_filter_rules  ← regex on path slug
      └─ social_media_allowlist  ← inverse: block unless path matches
```

Checks are ordered cheapest-first: exact hash lookups run before string operations, domain checks run before URL parsing.

---

## Entry Point

**File:** `popcorn_chomper.js`

```js
browser.webRequest.onBeforeRequest.addListener(
  blockThumbnailImage,
  { urls: ["<all_urls>"] },
  ["blocking"],
);
```

The `"blocking"` flag is required to allow synchronous cancellation. This is a Manifest V2 feature — Chrome dropped it in MV3.

---

## Blocking Mechanisms

### 1. Exact Domain Match — `blockedDomainsObj`

```js
const blockedDomainsObj = {
  "x.com": true,
  "twitter.com": true,
  "v.redd.it": true,
  // ...
};
```

**Check:** `blockedDomainsObj[hostname]`

O(1) hash lookup. Matches the full hostname exactly — `www.example.com` must be listed separately from `example.com`. Used for domains that should be blocked entirely with no variant logic needed: adult/AV sites, manga sites, Twitter, and Reddit's video CDN.

---

### 2. Private Browsing Full Block — `private_browsing_block`

```js
const private_browsing_block = ["youtube.com"];
```

**Check:** `requestDetails.cookieStoreId === "firefox-private"` + hostname suffix match.

Runs immediately after the exact domain check. If the request originates from a private browsing window, every domain in this list (and all its subdomains) is blocked. Used to close the gap where private mode is used to bypass cookie-based state in content blockers.

Requires "Run in Private Windows" to be enabled in `about:addons` for the extension.

---

### 3. Domain Pattern Match — `domain_patterns`

```js
const domain_patterns = {
  porn: true,
  manga: true,
  tiktok: true,
  // ...
};
```

**Check:** `hostname.includes(keyword)` for each key.

Catches domain variants and subdomains without enumerating every one. For example, the keyword `porn` matches `pornhub.com`, `xporn.net`, `teenporn.org`, etc. More efficient than maintaining a list of every known domain for a category.

**Caveat:** substring matching can over-match. Keywords should be chosen carefully to avoid catching legitimate domains (e.g. `sex` would catch `essex.gov.uk`). If a keyword is too broad for domain matching but valid for search filtering, it belongs in `search_patterns` only.

---

### 4. Domain Suffix Match — `domain_suffix_rules`

```js
const domain_suffix_rules = [
  { suffix: "fbcdn.net", pathContains: ".mp4" },
  { suffix: "pixiv.net" },
];
```

**Check:** `hostname === suffix || hostname.endsWith('.' + suffix)`, then optional `pathname.includes(pathContains)`.

Two modes:
- `{ suffix }` — blocks all requests to any subdomain of that suffix (used for `*.pixiv.net`)
- `{ suffix, pathContains }` — blocks only when the path also contains the given string (used to block `.mp4` video files from Facebook's CDN `*.fbcdn.net` without blocking all CDN assets)

---

### 5. Social Media Blocklist — `social_media_blocklist`

```js
const social_media_blocklist = {
  "youtube.com":     { exact: ["/"], prefix: ["/shorts/"] },
  "www.youtube.com": { exact: ["/"], prefix: ["/shorts/"] },
  "reddit.com":      { exact: ["/"] },
  // ...
};
```

**Check:** `pathname === p` (exact) or `pathname.startsWith(p)` (prefix).

Per-domain rules that block specific paths while allowing everything else. Both match types can coexist on the same domain entry. The hostname must be listed explicitly — `youtube.com` and `www.youtube.com` are separate keys.

- `exact` — blocks if the pathname is exactly `p`. Used for homepages (`/`).
- `prefix` — blocks if the pathname starts with `p`. Used for path prefixes like `/shorts/` and `/reel/`.

---

### 6. Search Query Filter — `search_query_rules`

```js
const search_query_rules = [
  { suffix: "google.com",  param: "q" },
  { suffix: "youtube.com", param: "search_query" },
  { suffix: "reddit.com",  param: "q" },
  { suffix: "facebook.com", param: "q" },
];
```

**Check:** suffix match on hostname, then `URLSearchParams.get(param)` lowercased and checked against every key in `search_patterns`.

Matches any subdomain of the suffix (`www.`, `m.`, etc.) so a single entry covers all variants. `URLSearchParams.get()` automatically decodes `+` and `%20` to spaces, so multi-word phrase matching works correctly regardless of URL encoding.

The keyword list used here is `search_patterns`, not `domain_patterns` — they are intentionally separate. `search_patterns` includes terms that appear in search queries but not necessarily in domain names.

---

### 7. Post Slug Filter — `path_slug_filter_rules`

```js
const path_slug_filter_rules = [
  {
    suffix: "reddit.com",
    pathRegex: /^\/r\/[^\/]+\/comments\/[^\/]+\/([^\/]+)/,
    captureGroup: 1,
  },
];
```

**Check:** suffix match, then `pathname.match(pathRegex)`. The captured group is extracted, underscores replaced with spaces, then checked against `search_patterns`.

Reddit post URLs include the post title as a slug (e.g. `/r/anime/comments/abc123/some_post_title/`). The slug is human-readable text with words separated by underscores. Replacing `_` with spaces before matching allows multi-word phrase keywords to work correctly.

This catches posts with blocked content in the title even when navigated to directly, not just via the feed.

---

### 8. Social Media Allowlist — `social_media_allowlist`

```js
const social_media_allowlist = {
  "www.instagram.com": ["/direct", "/api/graphql", "/rupload_igphoto", "/api/v1/discover/web/explore_grid"],
  "instagram.com":     ["/direct", "/api/graphql", "/rupload_igphoto", "/api/v1/discover/web/explore_grid"],
};
```

**Check:** if hostname is in the allowlist, block the request UNLESS `pathname.startsWith(p)` for at least one allowed prefix.

The inverse of `social_media_blocklist`. Used when the default should be block-all and only specific paths are allowed through. Instagram is the only current use case — the feed, Reels, Stories, and Explore are all blocked; only DM-related paths are allowed.

---

## Keyword Lists

### `domain_patterns`

Matched against hostnames via `includes()`. Terms here should appear in domain names of the content category being blocked. Avoid terms broad enough to catch legitimate domains.

### `search_patterns`

Matched against search query values and post slugs. Broader than `domain_patterns` — includes terms that appear in searches or content titles but not in domain names. Supports multi-word phrases (matched as substrings after space-normalisation).

**Adding a keyword:** prefer specific terms (JAV codes, niche labels, site names) over broad terms that could appear in legitimate searches.

---

## OS-Level DNS Layer

`setup_dns.sh` configures `systemd-resolved` to use Cloudflare 1.1.1.3 ("for Families"), which blocks adult content at the DNS level before the browser resolves the hostname.

```
app → 127.0.0.53 (systemd-resolved stub) → 1.1.1.3 (Cloudflare for Families)
```

The script writes a drop-in config file to `/etc/systemd/resolved.conf.d/cloudflare-dns.conf` rather than editing `/etc/systemd/resolved.conf` directly. This is preferred because it does not modify OS-owned files and works regardless of what is already in the base config.

`/etc/resolv.conf` does not need to be touched — on Fedora it is a symlink to `/run/systemd/resolve/stub-resolv.conf`, which points to the stub listener at `127.0.0.53`.

This layer is complementary to the extension. It covers domains the extension might miss (e.g. sites not yet in any list) and cannot be bypassed from within the browser.

**Limitation:** DNS blocking is hostname-only. Path, query, and slug filtering — mechanisms 5, 6, 7, and 8 above — cannot be replicated at the DNS level without an intercepting proxy.

---

## Adding New Rules

| Goal | Where to add |
|---|---|
| Fully block a domain | `blockedDomainsObj` |
| Block all variants of a site category by hostname keyword | `domain_patterns` |
| Block all requests to `*.somedomain.com` | `domain_suffix_rules` with `{ suffix }` |
| Block a CDN by domain suffix and path content | `domain_suffix_rules` with `{ suffix, pathContains }` |
| Block specific paths on a site, allow the rest | `social_media_blocklist` with `exact`/`prefix` arrays |
| Allow only specific paths on a site, block the rest | `social_media_allowlist` with an array of allowed prefixes |
| Block a domain in private browsing only | `private_browsing_block` |
| Filter search queries on a search engine | `search_query_rules` entry + keyword in `search_patterns` |
| Filter post/page slugs by keyword | `path_slug_filter_rules` entry + keyword in `search_patterns` |
