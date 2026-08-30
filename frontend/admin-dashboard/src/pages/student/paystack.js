// src/pages/student/paystack.js

export const loadPaystack = () =>
  new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve(window.PaystackPop);
    const existing = document.querySelector('script[src*="paystack"]');
    if (existing) {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        if (window.PaystackPop) { clearInterval(poll); resolve(window.PaystackPop); }
        else if (attempts > 50) { clearInterval(poll); reject(new Error("Paystack SDK timed out.")); }
      }, 100);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => window.PaystackPop ? resolve(window.PaystackPop) : reject(new Error("Paystack loaded but PaystackPop unavailable."));
    script.onerror = () => reject(new Error("Failed to load Paystack script."));
    document.head.appendChild(script);
  });