"use client";

import { useEffect, useState } from "react";
import { loadScript } from "@paypal/paypal-js";
import { useSearchParams } from "next/navigation";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

export default function SavePaypalPage() {
  const params = useSearchParams();
  const customerIdFromURL = params?.get("customerId") || "";

  const [customerId, setCustomerId] = useState(customerIdFromURL);
  const [lockCustomer, setLockCustomer] = useState(!!customerIdFromURL);

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setStatus("Getting payer id_token...");
        setError("");

        // 1) Get id_token for this payer session
        const idTokRes = await fetch(`${apiBase}/api/paypal/user-id-token`, { method: "POST" });
        const idTokJson = await idTokRes.json();
        if (!idTokRes.ok) throw new Error(idTokJson.error || "Failed to get id_token");
        const idToken = idTokJson.id_token;

        setStatus("Loading PayPal Buttons (vault)...");
const paypalNS = await loadScript({
  "client-id": paypalClientId,
  components: "buttons",
  vault: true,
  intent: "tokenize",
  dataUserIdToken: idToken,
  dataNamespace: "ppbtn",
 "disable-funding": "credit,card,venmo,paylater" // <-- hide non-wallet funding
});

        // 2) Render PayPal Buttons for wallet vaulting
        window.ppButtons = paypalNS.Buttons({
            fundingSource: paypalNS.FUNDING.PAYPAL, // <-- only PayPal wallet button
          // Create setup token on server for PayPal wallet
          createVaultSetupToken: async () => {
            const r = await fetch(`${apiBase}/api/paypal/setup-token-paypal`, { method: "POST" });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || "Failed to create PayPal setup token");
            return j.id; // setup_token_id
          },

          // After payer approves in popup
          onApprove: async (data) => {
            try {
              setStatus("Exchanging setup token for payment token...");
              setError("");

              const vaultSetupToken =
                data?.vaultSetupToken || data?.vault_setup_token || data?.setupToken || null;
              if (!vaultSetupToken) throw new Error("Missing vaultSetupToken from PayPal");

              if (!customerId) throw new Error("Please enter a Customer ID (Mongo _id)");

              const ex = await fetch(`${apiBase}/api/paypal/payment-token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vaultSetupToken, customerId })
              });
              const exJson = await ex.json();
              if (!ex.ok) throw new Error(exJson.error || "Failed to create payment token");

              setStatus(`✅ Saved PayPal! vaultId=${exJson.vaultId}`);
            } catch (e) {
              console.error(e);
              setError(String(e.message || e));
              setStatus("");
            }
          },

          onError: (err) => {
            console.error("[PayPal Buttons onError]", err);
            setError(err?.message || String(err));
          }
        });

        await window.ppButtons.render("#paypal-buttons");
        setReady(true);
        setStatus("PayPal wallet button ready.");
      } catch (e) {
        console.error(e);
        setError(String(e.message || e));
        setStatus("");
      }
    })();

    return () => {
      document.querySelectorAll('script[src*="paypal.com/sdk/js"]').forEach(n => n.remove());
      try { delete window.ppbtn; } catch {}
    };
  }, []);

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto", fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Save PayPal Wallet — Limo</h1>

      <div style={{ marginBottom: 12, fontSize: 14 }}>
        {status && <p>🟡 {status}</p>}
        {error && <p style={{ color: "crimson" }}>⚠️ {error}</p>}
      </div>

      <label>
        Customer ID (Mongo):
        <input
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          readOnly={lockCustomer}
          placeholder="paste _id from /api/customers"
          style={{
            display: "block", width: "100%", padding: 10,
            border: "1px solid #ccc", borderRadius: 10,
            background: lockCustomer ? "#f7f7f7" : "white", color: lockCustomer ? "#555" : "#111"
          }}
        />
      </label>

      <div style={{ marginTop: 16 }}>
        <div id="paypal-buttons" style={{ minHeight: 45 }} />
      </div>

      <p style={{ marginTop: 16, fontSize: 12, opacity: 0.8 }}>
        Flow: Approve in PayPal popup → we’ll save a vault token you can charge later.
      </p>
    </main>
  );
}
