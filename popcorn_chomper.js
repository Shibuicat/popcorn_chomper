const blockedDomains = {};

const blockedDomainsObj = {
  "xem.vn": true,
  "mangapark.io": true,
  "mangaforfree.net": true,
  "mangaforfree.com": true,
  "toonily.com": true,
  "toonily.me": true,
  "toongod.org": true,
  "mangapark.io": true,
  "mangapark.net": true,
  "mangapark.org": true,
  "toonily.me": true,
  "manhwa-raw.com": true,
  "manga18.club": true,
  "mangabuddy.com": true,
  "www.toongod.org": true,
  "manhwaden.com": true
};

function blockThumbnailImage(requestDetails) {
  const url = URL.parse(requestDetails.url);
  const hostname = url.hostname;
  if (blockedDomainsObj[hostname]) {
    return {
      cancel: true,
    };
  }
}

browser.webRequest.onBeforeRequest.addListener(
  blockThumbnailImage,
  { urls: ["<all_urls>"] },
  ["blocking"],
);
