"use client";

import { useEffect, useRef, useState } from "react";
import { loadScript } from "@paypal/paypal-js";
import { useSearchParams } from "next/navigation";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

export default function PayLaterPage() {
  const query = useSearchParams();
  const amount = query?.get("amount") || "50.00";      // optional: /paypal-pay-later?amount=120&currency=USD
  const currency = (query?.get("currency") || "USD").toUpperCase();

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);

  const buttonsRef = useRef(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (loadedRef.current) return;   // guard dev double-run (StrictMode)
        loadedRef.current = true;

        // ENV sanity
        if (!apiBase) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");
        if (!paypalClientId) throw new Error("Missing NEXT_PUBLIC_PAYPAL_CLIENT_ID");

        setError("");
        setStatus("Loading PayPal (Pay Later)…");

        // Load SDK — enable Pay Later funding
        const paypalNS = await loadScript({
          "client-id": paypalClientId,
          components: "buttons",
          intent: "capture",
          "enable-funding": "paylater"
        });

        if (cancelled) return;

        const sdkScript = document.querySelector('script[src*="paypal.com/sdk/js"]');
        if (sdkScript) console.log("[PayPal SDK]", sdkScript.getAttribute("src"));

        if (!paypalNS || typeof paypalNS.Buttons !== "function") {
          throw new Error("PayPal SDK failed to load Buttons. Check adblock/CSP and client-id.");
        }

        // Buttons (Pay Later only)
        const btns = paypalNS.Buttons({
          fundingSource: paypalNS.FUNDING.PAYLATER, // show only Pay Later button
          // ⚠️ Do NOT set label: "paylater" (invalid). If you want, you may use label: "installment".
          style: { /* label: "installment", */ color: "gold", shape: "rect", height: 45 },

          // 1) Create order on server
          createOrder: async () => {
            const r = await fetch(`${apiBase}/api/paypallater/create-order`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ value: amount, currency_code: currency })
            });
            const j = await r.json();
            if (!r.ok || !j?.id) throw new Error(j?.error || "Failed to create order");
            return j.id; // orderID
          },

          // 2) Capture after approval
          onApprove: async (data) => {
            try {
              setStatus("Capturing payment…");
              const r = await fetch(`${apiBase}/api/paypallater/capture-order`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderID: data.orderID })
              });
              const j = await r.json();
              if (!r.ok) throw new Error(j?.error || "Capture failed");

              setPaid(true);
              setStatus("✅ Payment completed via PayPal Pay Later.");
            } catch (e) {
              console.error(e);
              setError(String(e?.message || e));
              setStatus("");
            }
          },

          onCancel: () => setStatus("Payment canceled by customer."),
          onError: (err) => {
            console.error(err);
            setError(err?.message || String(err));
          }
        });

        buttonsRef.current = btns;
        await btns.render("#paypal-paylater");

        if (!cancelled) setStatus("Pay Later button ready.");
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError(String(e?.message || e));
          setStatus("");
        }
      }
    })();

    // cleanup
    return () => {
      cancelled = true;
      try { buttonsRef.current?.close?.(); } catch {}
      try {
        document
          .querySelectorAll('script[src*="paypal.com/sdk/js"]')
          .forEach((n) => n.parentElement?.removeChild(n));
      } catch {}
    };
  }, [amount, currency]);

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto", fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Pay with PayPal — Pay Later</h1>

      <p style={{ marginBottom: 8, opacity: 0.8 }}>
        Amount: <b>{currency} {amount}</b>
      </p>

      <div style={{ marginBottom: 12, fontSize: 14 }}>
        {status && <p>🟡 {status}</p>}
        {error && <p style={{ color: "crimson" }}>⚠️ {error}</p>}
        {paid && <p style={{ color: "green" }}>🎉 Payment successful.</p>}
      </div>

      <div id="paypal-paylater" style={{ minHeight: 45 }} />

      <p style={{ marginTop: 16, fontSize: 12, opacity: 0.8 }}>
        This uses PayPal’s Pay Later funding (e.g., Pay in 4 / Monthly). You receive funds now; the customer pays PayPal over time.
      </p>
    </main>
  );
}
