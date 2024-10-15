const blockedDomains = {
};

const blockedDomainsObj = {
	"xem.vn": true,
	"mangapark.io": true,
	"mangaforfree.net": true,
	"mangaforfree.com": true,
	"toonily.com": true,
	"toonily.me": true,
	"mangapark.io": true,
	"mangapark.net": true,
	"mangapark.org": true,
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
