"use client";

import { useEffect, useState } from "react";
import { loadScript } from "@paypal/paypal-js";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

export default function ApplePayPage() {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("20.00");
  const [currency, setCurrency] = useState("USD");
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setStatus("Loading Apple Pay…");
        setError("");

        const paypalNS = await loadScript({
          "client-id": PAYPAL_CLIENT_ID,
          components: "applepay",   // IMPORTANT: include applepay component
          "enable-funding": "applepay", // ensure applepay funding is enabled
          "disable-funding": "credit,card,venmo,paylater" // keep page clean
        });

        const ap = paypalNS.Applepay();
        const isEligible = ap.isEligible();
        setEligible(!!isEligible);

        if (!isEligible) {
          setStatus("");
          setError("Apple Pay not eligible (use Safari with Apple Pay configured, HTTPS + verified domain).");
          return;
        }

        // Render native Apple Pay button
        await ap.render({
          // Button mount point
          // Add container <div id="applepay-container" /> in JSX below
          container: "#applepay-container",

          // Configure request (PayPal fills merchant details)
          paymentRequest: {
            countryCode: "US",              // your merchant country
            currencyCode: currency,
            total: { label: "Limo Ride", amount } // shown on Apple Pay sheet
          },

          // Create PayPal order on server when Apple Pay starts
          createOrder: async () => {
            const r = await fetch(`${API}/api/orders/create`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ amount, currency })
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || "Failed to create order");
            return j.orderId; // return PayPal order ID
          },

          // After Apple Pay approval
          onApprove: async (data) => {
            try {
              setStatus("Capturing…");
              const r = await fetch(`${API}/api/orders/capture`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: data.orderID })
              });
              const j = await r.json();
              if (!r.ok) throw new Error(j.error || "Failed to capture");
              setStatus(`✅ Captured: ${j.captureId}`);
            } catch (e) {
              setError(String(e.message || e)); setStatus("");
            }
          },

          onCancel: () => setStatus("Cancelled"),
          onError: (err) => { console.error(err); setError(err?.message || String(err)); setStatus(""); }
        });

        setStatus("Apple Pay ready");
      } catch (e) {
        console.error(e);
        setError(String(e.message || e));
        setStatus("");
      }
    })();
  }, [amount, currency]);

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto", fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Apple Pay — Limo</h1>

      {status && <p>🟡 {status}</p>}
      {error && <p style={{ color: "crimson" }}>⚠️ {error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "12px 0" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>amount</span>
          <input value={amount} onChange={(e)=>setAmount(e.target.value)} style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }} />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>currency</span>
          <input value={currency} onChange={(e)=>setCurrency(e.target.value)} style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }} />
        </label>
      </div>

      <div id="applepay-container" style={{ minHeight: 48 }} />
      {!eligible && (
        <p style={{ marginTop: 8, fontSize: 12, opacity: .7 }}>
          Tip: Open this page in Safari (iOS/macOS), ensure Apple Pay is set up, and your domain is verified in PayPal → Apple Pay.
        </p>
      )}
    </main>
  );
}
