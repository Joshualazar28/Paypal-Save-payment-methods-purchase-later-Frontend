// "use client";

// import { useEffect, useState, useRef } from "react";
// import { loadScript } from "@paypal/paypal-js";
// import { useSearchParams } from "next/navigation";

// const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
// const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

// export default function SavePaypalPage() {
//   const params = useSearchParams();
//   const customerIdFromURL = params?.get("customerId") || "";

//   const [customerId, setCustomerId] = useState(customerIdFromURL);
//   const [lockCustomer] = useState(!!customerIdFromURL);

//   const [status, setStatus] = useState("");
//   const [error, setError] = useState("");
//   const [ready, setReady] = useState(false);

//   // keep references to cleanup safely
//   const paypalNsRef = useRef(null);
//   const buttonsRef = useRef(null);

//   useEffect(() => {
//     let cancelled = false;

//     (async () => {
//       try {
//         setStatus("Getting payer id_token...");
//         setError("");

//         // 1) Get id_token for this payer session
//         const idTokRes = await fetch(`${apiBase}/api/paypal/user-id-token`, { method: "POST" });
//         const idTokJson = await idTokRes.json();
//         if (!idTokRes.ok || !idTokJson?.id_token) {
//           throw new Error(idTokJson?.error || "Failed to get id_token");
//         }
//         const idToken = idTokJson.id_token;

//         if (cancelled) return;

//         setStatus("Loading PayPal Buttons (vault)...");
//         // 2) Load SDK (IMPORTANT: kebab-case data attrs)
//         const paypalNS = await loadScript({
//           "client-id": paypalClientId,
//           components: "buttons",
//           vault: true,
//           intent: "tokenize",
//           "data-user-id-token": idToken,
//           "data-namespace": "ppbtn",
//           "disable-funding": "credit,card,venmo,paylater"
//         });
//         if (!paypalNS) throw new Error("PayPal SDK failed to load");
//         paypalNsRef.current = paypalNS;

//         if (cancelled) return;

//         // helper to create setup token (server)
//         const createSetup = async () => {
//           const r = await fetch(`${apiBase}/api/paypal/setup-token-paypal`, { method: "POST" });
//           const j = await r.json();
//           if (!r.ok || !j?.id) throw new Error(j?.error || "Failed to create PayPal setup token");
//           return j.id; // setup_token_id
//         };

//         // 3) Render PayPal Buttons (compat with old/new SDKs)
//         const btns = paypalNS.Buttons({
//           fundingSource: paypalNS.FUNDING.PAYPAL,

//           // new SDK expects this:
//           createVaultSetupToken: () => createSetup(),
//           // some builds still look for this:
//           createBillingAgreement: () => createSetup(),

//           // approval callback
//           onApprove: async (data) => {
//             try {
//               setStatus("Exchanging setup token for payment token...");
//               setError("");

//               const vaultSetupToken =
//                 data?.vaultSetupToken ||
//                 data?.vault_setup_token ||
//                 data?.billingToken || // legacy name
//                 data?.setupToken ||
//                 null;

//               if (!vaultSetupToken) throw new Error("Missing vaultSetupToken from PayPal");
//               if (!customerId) throw new Error("Please enter a Customer ID (Mongo _id)");

//               const ex = await fetch(`${apiBase}/api/paypal/payment-token`, {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({ vaultSetupToken, customerId })
//               });
//               const exJson = await ex.json();
//               if (!ex.ok) throw new Error(exJson?.error || "Failed to create payment token");

//               setStatus(`✅ Saved PayPal! vaultId=${exJson.vaultId}`);
//             } catch (e) {
//               console.error(e);
//               setError(String(e?.message || e));
//               setStatus("");
//             }
//           },

//           onError: (err) => {
//             console.error("[PayPal Buttons onError]", err);
//             setError(err?.message || String(err));
//           }
//         });

//         buttonsRef.current = btns;

//         await btns.render("#paypal-buttons");
//         if (cancelled) return;

//         setReady(true);
//         setStatus("PayPal wallet button ready.");
//       } catch (e) {
//         console.error(e);
//         if (!cancelled) {
//           setError(String(e?.message || e));
//           setStatus("");
//         }
//       }
//     })();

//     // cleanup
//     return () => {
//       cancelled = true;
//       try {
//         if (buttonsRef.current?.close) buttonsRef.current.close();
//       } catch {}
//       try {
//         // remove SDK script tags
//         document.querySelectorAll('script[src*="paypal.com/sdk/js"]').forEach((n) => n.remove());
//       } catch {}
//       try {
//         // remove namespace if present
//         if (window.ppbtn) delete window.ppbtn;
//       } catch {}
//     };
//   }, [customerId]);

//   return (
//     <main style={{ padding: 24, maxWidth: 720, margin: "0 auto", fontFamily: "ui-sans-serif, system-ui" }}>
//       <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Save PayPal Wallet — Limo</h1>

//       <div style={{ marginBottom: 12, fontSize: 14 }}>
//         {status && <p>🟡 {status}</p>}
//         {error && <p style={{ color: "crimson" }}>⚠️ {error}</p>}
//       </div>

//       <label>
//         Customer ID (Mongo):
//         <input
//           value={customerId}
//           onChange={(e) => setCustomerId(e.target.value)}
//           readOnly={lockCustomer}
//           placeholder="paste _id from /api/customers"
//           style={{
//             display: "block",
//             width: "100%",
//             padding: 10,
//             border: "1px solid #ccc",
//             borderRadius: 10,
//             background: lockCustomer ? "#f7f7f7" : "white",
//             color: lockCustomer ? "#555" : "#111"
//           }}
//         />
//       </label>

//       <div style={{ marginTop: 16 }}>
//         <div id="paypal-buttons" style={{ minHeight: 45 }} />
//       </div>

//       <p style={{ marginTop: 16, fontSize: 12, opacity: 0.8 }}>
//         Flow: Approve in PayPal popup → we’ll save a vault token you can charge later.
//       </p>
//     </main>
//   );
// }


"use client";

import { useEffect, useRef, useState } from "react";
import { loadScript } from "@paypal/paypal-js";
import { useSearchParams } from "next/navigation";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

export default function SavePaypalPage() {
  const params = useSearchParams();
  const customerIdFromURL = params?.get("customerId") || "";

  const [customerId, setCustomerId] = useState(customerIdFromURL);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const buttonsRef = useRef(null);
  const loadedRef = useRef(false); // guard against double runs in dev

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (loadedRef.current) return; // prevent double init in React StrictMode (dev)
        loadedRef.current = true;

        // --- ENV sanity ---
        if (!apiBase) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");
        if (!paypalClientId) throw new Error("Missing NEXT_PUBLIC_PAYPAL_CLIENT_ID");

        setStatus("Getting payer id_token...");
        setError("");

        // 1) Get payer id_token from server
        const idTokRes = await fetch(`${apiBase}/api/paypal/user-id-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const idTokJson = await idTokRes.json();
        if (!idTokRes.ok || !idTokJson?.id_token) {
          throw new Error(idTokJson?.error || "Failed to get id_token");
        }
        const idToken = idTokJson.id_token;

        if (cancelled) return;

        setStatus("Loading PayPal Buttons (vault)...");
        // 2) Load JS SDK — use returned namespace directly (no window.* reliance)
        const paypalNS = await loadScript({
          "client-id": paypalClientId,
          components: "buttons",
          vault: true,
          intent: "tokenize",
          "data-user-id-token": idToken, // important: kebab-case
          // keeping default namespace (no data-namespace) to avoid confusion
          "disable-funding": "credit,card,venmo,paylater",
        });

        // Helpful diagnostics
        const sdkScript = document.querySelector('script[src*="paypal.com/sdk/js"]');
        if (sdkScript) console.log("[PayPal SDK script]", sdkScript.getAttribute("src"));

        if (cancelled) return;

        if (!paypalNS || typeof paypalNS.Buttons !== "function") {
          throw new Error(
            "PayPal SDK not ready after loadScript(). Possible causes: (1) components=buttons missing, (2) script blocked by CSP/adblock, (3) client-id invalid."
          );
        }

        // helper creates setup-token on server
        const createSetup = async () => {
          const r = await fetch(`${apiBase}/api/paypal/setup-token-paypal`, { method: "POST" });
          const j = await r.json();
          if (!r.ok || !j?.id) throw new Error(j?.error || "Failed to create PayPal setup token");
          return j.id; // setup_token_id
        };

        // 3) Render Buttons — support legacy + new callbacks
        const btns = paypalNS.Buttons({
          fundingSource: paypalNS.FUNDING.PAYPAL,

          createVaultSetupToken: () => createSetup(),
          createBillingAgreement: () => createSetup(), // legacy fallback for some SDK builds

          onApprove: async (data) => {
            try {
              setStatus("Exchanging setup token for payment token...");
              setError("");

              const vaultSetupToken =
                data?.vaultSetupToken ||
                data?.vault_setup_token ||
                data?.billingToken || // legacy
                data?.setupToken ||
                null;

              if (!vaultSetupToken) throw new Error("Missing vaultSetupToken from PayPal");
              if (!customerId) throw new Error("Please enter a Customer ID (Mongo _id)");

              const ex = await fetch(`${apiBase}/api/paypal/payment-token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vaultSetupToken, customerId }),
              });
              const exJson = await ex.json();
              if (!ex.ok) throw new Error(exJson?.error || "Failed to create payment token");

              setStatus(`✅ Saved PayPal! vaultId=${exJson.vaultId}`);
            } catch (e) {
              console.error(e);
              setError(String(e?.message || e));
              setStatus("");
            }
          },

          onError: (err) => {
            console.error("[PayPal Buttons onError]", err);
            setError(err?.message || String(err));
          },
        });

        buttonsRef.current = btns;
        await btns.render("#paypal-buttons");

        if (cancelled) return;
        setReady(true);
        setStatus("PayPal wallet button ready.");
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
      try { buttonsRef.current && buttonsRef.current.close && buttonsRef.current.close(); } catch {}
      try {
        document
          .querySelectorAll('script[src*="paypal.com/sdk/js"]')
          .forEach((n) => n.parentElement && n.parentElement.removeChild(n));
      } catch {}
    };
  }, [customerId]);

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
          readOnly={!!customerIdFromURL}
          placeholder="paste _id from /api/customers"
          style={{
            display: "block",
            width: "100%",
            padding: 10,
            border: "1px solid #ccc",
            borderRadius: 10,
            background: customerIdFromURL ? "#f7f7f7" : "white",
            color: customerIdFromURL ? "#555" : "#111",
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
