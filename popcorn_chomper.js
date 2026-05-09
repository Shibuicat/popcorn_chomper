const blockedDomainsObj = {
  "xem.vn": true,
  "mangapark.io": true,
  "mangapark.net": true,
  "mangapark.org": true,
  "mangaforfree.net": true,
  "mangaforfree.com": true,
  "toonily.com": true,
  "toonily.me": true,
  "toongod.org": true,
  "www.toongod.org": true,
  "manhwa-raw.com": true,
  "manga18.club": true,
  "mangabuddy.com": true,
  "manhwaden.com": true,
  "missav.com": true,
  "missav.ws": true,
  "missav.ai": true,
  "missav123.com": true,
  "123av.com": true,
  "njavtv.com": true,
  "x.com": true,
  "twitter.com": true,
  "mangadna.com": true,
  "v.redd.it": true,
};

const social_media_blocklist = {
  "reddit.com":      { exact: ["/"] },
  "www.reddit.com":  { exact: ["/"] },
  "youtube.com":     { exact: ["/"], prefix: ["/shorts/"] },
  "www.youtube.com": { exact: ["/"], prefix: ["/shorts/"] },
  "m.youtube.com":   { exact: ["/"], prefix: ["/shorts/"] },
  "facebook.com":    { exact: ["/"], prefix: ["/reel/"] },
  "www.facebook.com": { exact: ["/"], prefix: ["/reel/"] },
  "m.facebook.com":  { exact: ["/"], prefix: ["/reel/"] },
  "fb.com":          { exact: ["/"], prefix: ["/reel/"] },
};

const private_browsing_block = [
  "youtube.com",
];

const domain_suffix_rules = [
  { suffix: "fbcdn.net", pathContains: ".mp4" },
  { suffix: "pixiv.net" },
];

const search_query_rules = [
  { suffix: "google.com",  param: "q" },
  { suffix: "youtube.com", param: "search_query" },
  { suffix: "reddit.com",   param: "q" },
  { suffix: "facebook.com", param: "q" },
];

const path_slug_filter_rules = [
  { suffix: "reddit.com", pathRegex: /^\/r\/[^\/]+\/comments\/[^\/]+\/([^\/]+)/, captureGroup: 1 },
];

const social_media_allowlist = {
  "www.instagram.com": ["/direct", "/api/graphql", "/rupload_igphoto", "/api/v1/discover/web/explore_grid"],
  "instagram.com":     ["/direct", "/api/graphql", "/rupload_igphoto", "/api/v1/discover/web/explore_grid"],
};

const domain_patterns = {
  missav: true,
  123: true,
  porn: true,
  manga: true,
  manhwa: true,
  hentai: true,
  jav: true,
  sex: true,
  vlxx: true,
  hamster: true,
  spank: true,
  thiendia: true,
  nangcuc: true,
  jable: true,
  top1: true,
  quaylen: true,
  tiktok: true,
  toongod: true,
  mangafx18: true,
};

const search_patterns = {
  porn: true,
  manga: true,
  manhwa: true,
  hentai: true,
  jav: true,
  sex: true,
  missav: true,
  vlxx: true,
  ssis: true,
  juq: true,
  midv: true,
  ssns: true,
  pantyhose: true,
  stocking: true,
  ecchi: true,
  xxx: true,
  nude: true,
  naked: true,
  doujin: true,
  uncensored: true,
  xnxx: true,
  xvideos: true,
  nsfw: true,
  erotic: true,
  fetish: true,
  hanime: true,
  rule34: true,
  fancam: true,
};

function blockThumbnailImage(requestDetails) {
  const url = URL.parse(requestDetails.url);
  const hostname = url.hostname;
  if (blockedDomainsObj[hostname]) {
    return {
      cancel: true,
    };
  }

  if (requestDetails.cookieStoreId === "firefox-private") {
    for (const suffix of private_browsing_block) {
      if (hostname === suffix || hostname.endsWith(`.${suffix}`)) {
        return { cancel: true };
      }
    }
  }

  const patternFoundIndex = Object.keys(domain_patterns).findIndex(x => hostname.includes(x));
  if (patternFoundIndex >= 0) {
    return {
      cancel: true
    };
  }

  for (const rule of domain_suffix_rules) {
    if (hostname === rule.suffix || hostname.endsWith(`.${rule.suffix}`)) {
      if (!rule.pathContains || url.pathname.includes(rule.pathContains)) {
        return { cancel: true };
      }
    }
  }

  const blockedPaths = social_media_blocklist[hostname];
  if (blockedPaths) {
    const isBlocked =
      blockedPaths.exact?.some(p => url.pathname === p) ||
      blockedPaths.prefix?.some(p => url.pathname.startsWith(p));
    if (isBlocked) return { cancel: true };
  }

  for (const rule of search_query_rules) {
    if (hostname === rule.suffix || hostname.endsWith(`.${rule.suffix}`)) {
      const q = url.searchParams.get(rule.param)?.toLowerCase();
      if (q && Object.keys(search_patterns).some(word => q.includes(word))) {
        return { cancel: true };
      }
    }
  }

  for (const rule of path_slug_filter_rules) {
    if (hostname === rule.suffix || hostname.endsWith(`.${rule.suffix}`)) {
      const match = url.pathname.match(rule.pathRegex);
      if (match) {
        const slug = match[rule.captureGroup].replace(/_/g, " ");
        if (Object.keys(search_patterns).some(word => slug.includes(word))) {
          return { cancel: true };
        }
      }
    }
  }

  const allowedPaths = social_media_allowlist[hostname];
  if (allowedPaths) {
    const isAllowed = allowedPaths.some(p => url.pathname.startsWith(p));
    if (!isAllowed) return { cancel: true };
  }
}

browser.webRequest.onBeforeRequest.addListener(
  blockThumbnailImage,
  { urls: ["<all_urls>"] },
  ["blocking"],
);
