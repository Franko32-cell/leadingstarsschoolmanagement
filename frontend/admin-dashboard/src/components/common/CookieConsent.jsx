// src/components/common/CookieConsent.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { loadAdsenseScript } from "../../utils/loadAdsense";

const CONSENT_KEY = "lsa_cookie_consent"; // stores "accepted" | "declined"

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);

    if (stored === "accepted") {
      // Returning visitor who already said yes — load ads immediately.
      loadAdsenseScript();
    } else if (stored !== "declined") {
      // No stored choice yet — show the banner.
      setVisible(true);
    }
    // If stored === "declined", do nothing: banner stays hidden, no ads load.
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    loadAdsenseScript();
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-slate-700 sm:pr-6">
          We use cookies to improve your experience and show relevant ads. You can
          accept all cookies or continue with only the essential ones needed for
          the site to function. Read our{" "}
          <Link
            to="/cookie-policy"
            className="font-medium text-slate-900 underline underline-offset-2 hover:text-slate-600"
          >
            Cookie Policy
          </Link>{" "}
          to learn more.
        </p>

        <div className="flex flex-shrink-0 gap-3">
          <button
            type="button"
            onClick={handleDecline}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;