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

const patterns = {
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
  quaylen: true 
};

function blockThumbnailImage(requestDetails) {
  const url = URL.parse(requestDetails.url);
  const hostname = url.hostname;
  if (blockedDomainsObj[hostname]) {
    return {
      cancel: true,
    };
  }

  const patternFoundIndex = Object.keys(patterns).findIndex(x => hostname.includes(x));
  if(patternFoundIndex >= 0){
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
