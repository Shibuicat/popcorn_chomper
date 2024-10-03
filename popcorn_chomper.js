const blockedDomains = ["crab.com"];

function blockThumbnailImage(requestDetails) {
	console.log(requestDetails);
	  return {
		cancel: true,
	  };
}

browser.webRequest.onBeforeRequest.addListener(
  blockThumbnailImage,
  { urls: ["<all_urls>"],},
  ["blocking"],
);
