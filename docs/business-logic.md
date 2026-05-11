# Business Logic

## Purpose

Popcorn Chomper is a Firefox extension for mindfulness and self-control. It removes easy access to content that triggers compulsive browsing — infinite feeds, short-form video, adult content, and passive content discovery — while preserving intentional, functional use of the internet.

## Guiding Principle

> Block the addictive surface, preserve functional use.

The distinction is between _intentional_ and _compulsive_ use:

| Site | Blocked | Allowed | Reason |
|---|---|---|---|
| YouTube | Homepage, Shorts | `/watch/` videos | Watching something specific is intentional; the feed and Shorts are compulsion traps |
| Reddit | Homepage (`/`) | Specific threads | Reading a thread you navigated to is intentional; the feed is not |
| Instagram | Everything | `/direct` (DMs) | Messaging a friend is intentional; the feed, Reels, and Explore are not |
| Facebook | Homepage, Reels | Everything else | Reels and the homepage feed are the addictive surface |
| Twitter/X | Entire site | — | No functional use case that cannot be served elsewhere |
| Adult content | Entire domain | — | No functional use case |
| Manga/manhwa | Entire domain | — | No functional use case |

## What Gets Blocked and Why

### Adult Content

Blocked entirely. Domains are blocked via exact match, keyword pattern matching on the hostname (e.g. `porn`, `sex`, `hentai`, `jav`), and Cloudflare's 1.1.1.3 DNS at the OS level. There is no functional use case for these sites.

### Manga and Manhwa

Blocked entirely. This includes general manga sites and 18+ manga/manhwa sites. Keyword patterns (`manga`, `manhwa`, `toongod`) catch domain variants without enumerating every one. There is no functional use case that outweighs the compulsive browsing risk.

### TikTok

Blocked entirely via the `tiktok` keyword pattern on the hostname. Short-form video is the highest-risk format for compulsive consumption.

### Twitter / X

Blocked entirely via exact domain match (`x.com`, `twitter.com`). The feed design is optimised for compulsive scrolling and there is no path-level functional distinction worth preserving.

### YouTube

Feed and Shorts are blocked; direct video URLs are allowed.

- `youtube.com/` (homepage) — blocked
- `youtube.com/shorts/` — blocked
- `youtube.com/watch?v=...` — allowed

YouTube searches are also filtered: if the search query contains a keyword from `search_patterns`, the request is cancelled. This prevents using YouTube search as a discovery mechanism for blocked content.

### Reddit

Homepage is blocked; specific threads are allowed.

- `reddit.com/` (homepage) — blocked
- `reddit.com/r/sub/comments/...` — allowed, but post slugs are keyword-filtered

Reddit video (`v.redd.it`) is blocked entirely since it serves inline video that can trigger compulsive browsing.

Reddit searches are also filtered by query keyword.

### Facebook

Homepage and Reels are blocked; everything else (Messenger, groups, events) is allowed.

- `facebook.com/` — blocked
- `facebook.com/reel/` — blocked

Facebook video files from `fbcdn.net` (the CDN) are blocked when the path ends in `.mp4`.

### Instagram

Everything is blocked except a small allowlist of paths required for messaging:

- `/direct` — DM threads
- `/api/graphql` — required for DM functionality
- `/rupload_igphoto` — photo upload in DMs
- `/api/v1/discover/web/explore_grid` — required for the app to function

All other paths — the feed, Reels, Stories, Explore — are blocked.

### Search Engines

Search queries on Google, YouTube, Reddit, and Facebook are filtered by keyword. If the lowercased query value contains any term from `search_patterns`, the request is cancelled. This prevents using search as a back-door to blocked content.

`search_patterns` is intentionally narrower than `domain_patterns`. Broad terms like `sex` or `naked` can appear in legitimate medical, news, or educational searches and are excluded unless they are strongly specific to adult or distraction content.

### Private Browsing

YouTube is fully blocked in private browsing windows. Private browsing is commonly used to circumvent content blockers by avoiding cookie-based state; blocking YouTube there closes that gap.

## Keyword Philosophy

Two separate keyword lists exist for different contexts:

**`domain_patterns`** — matched against hostnames. Terms here appear in domain names (e.g. `porn` in `pornhub.com`, `manga` in `mangapark.io`). Should be specific enough that they don't catch legitimate domains.

**`search_patterns`** — matched against search query strings. Broader than domain patterns — includes terms that appear in searches but not in domain names (e.g. `pantyhose`, `rule34`, `uncensored`). Supports multi-word phrases.

**Rule for adding to `search_patterns`:** block distraction and adult content, not offensive content. Don't add broad terms that appear in legitimate educational, medical, or news searches. Prefer specific terms (JAV codes, niche content labels, site names) that rarely appear outside the content being targeted.
