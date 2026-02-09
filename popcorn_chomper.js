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
  "njavtv.com": true,
  "missav.ai": true,
};

const known_social_media_sites = {
  "reddit.com",
  "www.reddit.com",
  "youtube.com": true,
  "www.youtube.com": true,
  "m.youtube.com": true,
  "fb.com": true,
  "facebook.com": true,
  "m.facebook.com": true,
  "instagram.com": true,
  "tiktok.com": true
}

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

  if(known_social_media_sites[hostname]){    
    const currentDate = new Date();
    if(is_restricted_time(currentDate)){
      return {
        cancel: true
      }
    }
  }
}

function is_restricted_time(date){  
  const hour = date.getHours();
   
  if(hour == 12 || (hour >= 6 && hour <= 8)){
    return false;
  }
  
  return true;
}

browser.webRequest.onBeforeRequest.addListener(
  blockThumbnailImage,
  { urls: ["<all_urls>"] },
  ["blocking"],
);
