// src/utils/loadAdsense.js
//
// Dynamically injects the Google AdSense script into the page.
// This should ONLY be called after a visitor has explicitly accepted
// cookies via the CookieConsent banner — never on page load by default.

const ADSENSE_CLIENT_ID = "ca-pub-2554258946163808";
const ADSENSE_SCRIPT_ID = "adsbygoogle-script";

export function loadAdsenseScript() {
  // Avoid injecting it twice if consent logic re-runs
  if (document.getElementById(ADSENSE_SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = ADSENSE_SCRIPT_ID;
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
}

export function removeAdsenseScript() {
  const existing = document.getElementById(ADSENSE_SCRIPT_ID);
  if (existing) existing.remove();
}