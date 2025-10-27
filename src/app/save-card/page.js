"use client";

import { useEffect, useRef, useState } from "react";
import { loadScript } from "@paypal/paypal-js";
import { useSearchParams } from "next/navigation";
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

export default function SaveCardPage() {
  const searchParams = useSearchParams();
 const customerIdFromURL = searchParams?.get("customerId") || "";
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [clientToken, setClientToken] = useState(null);
  const [ready, setReady] = useState(false);
  const [customerId, setCustomerId] = useState(customerIdFromURL);
  const lockCustomer = !!customerIdFromURL;

  // Tokens / instances
  const setupTokenRef = useRef(null);         // setup token (from backend)
  const vaultSetupTokenRef = useRef(null);    // vault_setup_token (from onApprove)
  const cardFieldsRef = useRef(null);         // parent CardFields instance

  useEffect(() => {
    (async () => {
      try {
        setError("");
        setStatus("Fetching client token...");

        // 1) Get client_token from your backend
        const r = await fetch(`${apiBase}/api/paypal/client-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed to get client_token");
        setClientToken(j.client_token);

        if (!paypalClientId) throw new Error("Missing NEXT_PUBLIC_PAYPAL_CLIENT_ID");

        setStatus("Loading PayPal (card-fields)...");
        // 2) Load ONLY Card Fields in tokenize/vault mode
        const paypalNS = await loadScript({
          "client-id": paypalClientId,
          components: "card-fields",
          vault: true,
          intent: "tokenize",
          dataClientToken: j.client_token,
          dataNamespace: "ppcf" // window.ppcf
        });

        setStatus("Creating setup token...");
        // 3) Create a setup token on your backend
        const st = await fetch(`${apiBase}/api/paypal/setup-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brandName: "Limo Service", locale: "en-US" }),
        });
        const stJson = await st.json();
        if (!st.ok) throw new Error(stJson.error || "Failed to create setup token");
        setupTokenRef.current = stJson.id;

        setStatus("Rendering Card Fields...");
        // 4) Build parent CardFields (REQUIRED callbacks: createVaultSetupToken + onApprove)
        const cardFields = await paypalNS.CardFields({
          style: {
            input: { "font-size": "16px", "font-family": "ui-sans-serif, system-ui" }
          },
          createVaultSetupToken: async () => setupTokenRef.current,
     onApprove: (data) => {
  // PayPal returns vault_setup_token here in vault flow
  console.log("[onApprove data]", data);
  vaultSetupTokenRef.current = data?.vault_setup_token || null;
},
          onError: (err) => {
            console.error("[CardFields onError]", err);
            setError(err?.message || String(err));
          }
        });

        // 5) Create each field & render into DOM nodes
        const numberField = cardFields.NumberField({ placeholder: "4111 1111 1111 1111" });
        await numberField.render("#card-number");

        const expiryField = cardFields.ExpiryField({ placeholder: "MM/YY" });
        await expiryField.render("#expiration-date");

        const cvvField = cardFields.CVVField({ placeholder: "123" });
        await cvvField.render("#cvv");

        cardFieldsRef.current = cardFields;

        setReady(true);
        setStatus("Card fields ready.");
      } catch (e) {
        console.error(e);
        setError(String(e.message || e));
        setStatus("");
      }
    })();

    // Cleanup on unmount (avoid double-init during HMR)
    return () => {
      document.querySelectorAll('script[src*="paypal.com/sdk/js"]').forEach(n => n.remove());
      try { delete window.ppcf; } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSave(e) {
    e.preventDefault();
    setError("");
    setStatus("Submitting card...");

    try {
      if (!customerId) throw new Error("Please enter a Customer ID (Mongo _id)");
      const cf = cardFieldsRef.current;
      const setupTokenId = setupTokenRef.current;
      if (!cf || !setupTokenId) throw new Error("Card Fields not ready");

      // Sends card securely & binds to setup token (3DS if needed).
      // This triggers onApprove with vault_setup_token.
      await cf.submit();

      setStatus("Creating payment token...");

      const vaultSetupToken = vaultSetupTokenRef.current;
      const body = vaultSetupToken
        ? { vaultSetupToken, customerId }                 // preferred (Card Fields vault flow)
        : { setupTokenId: setupTokenRef.current, customerId }; // fallback

      const ex = await fetch(`${apiBase}/api/paypal/payment-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const exJson = await ex.json();
      if (!ex.ok) throw new Error(exJson.error || "Failed to create payment token");

      setStatus(`✅ Saved! vaultId=${exJson.vaultId}`);
    } catch (e) {
      console.error(e);
      setError(String(e.message || e));
      setStatus("");
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto", fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Save Card (Vault) — Limo</h1>

      <div style={{ marginBottom: 12, fontSize: 14 }}>
        <p><strong>Client Token:</strong> {clientToken ? "✓ ready" : "..."} </p>
        {status && <p>🟡 {status}</p>}
        {error && <p style={{ color: "crimson" }}>⚠️ {error}</p>}
      </div>

      <form onSubmit={onSave} style={{ display: "grid", gap: 14 }}>
        <label>
          Customer ID (Mongo):
          <input
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="paste _id from /api/customers"
             readOnly={lockCustomer}
           style={{
             display: "block",
             width: "100%",
             padding: 10,
             border: "1px solid #ccc",
             borderRadius: 10,
             background: lockCustomer ? "#f7f7f7" : "white",
             color: lockCustomer ? "#555" : "#111"
           }}
          />
        </label>

        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12, display: "grid", gap: 12 }}>
          <div>
            <label>Card Number</label>
            <div id="card-number" style={{ border: "1px solid #ccc", borderRadius: 10, padding: 12, minHeight: 80 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label>Expiration</label>
              <div id="expiration-date" style={{ border: "1px solid #ccc", borderRadius: 10, padding: 12, minHeight: 80 }} />
            </div>
            <div>
              <label>CVV</label>
              <div id="cvv" style={{ border: "1px solid #ccc", borderRadius: 10, padding: 12, minHeight: 80 }} />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!ready}
          style={{
            opacity: ready ? 1 : 0.6,
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid #111",
            background: "#111",
            color: "white",
            cursor: ready ? "pointer" : "not-allowed",
            fontWeight: 700
          }}
        >
          Save Card
        </button>
      </form>

      <p style={{ marginTop: 16, fontSize: 12, opacity: 0.8 }}>
        Test in PayPal Sandbox (e.g., 4111 1111 1111 1111 • any future MM/YY • CVV 123).
      </p>
    </main>
  );
}
