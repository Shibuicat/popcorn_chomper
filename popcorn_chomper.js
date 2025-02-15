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
  "manhwaden.com": true,
  "missav.com": true,
  "missav.ws": true,
  "123av.com": true,
  "missav123.com": true,
  "x.com": true,
  "twitter.com": true,
  "mangadna.com": true,
};

function blockThumbnailImage(requestDetails) {
  const url = URL.parse(requestDetails.url);
  const hostname = url.hostname;
  if (blockedDomainsObj[hostname]) {
    return {
      cancel: true,
    };
  }
  if(hostname.indexOf("manhwa") > -1 || hostname.indexOf("manga") > -1){
    return {
      cancel: true
    };
  }
}

browser.webRequest.onBeforeRequest.addListener(
  blockThumbnailImage,
  { urls: ["<all_urls>"] },
  ["blocking"],
);
