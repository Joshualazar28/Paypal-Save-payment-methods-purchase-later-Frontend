"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

function Box({ title, children }) {
  return (
    <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 16 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 18 }}>{title}</h3>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, opacity: 0.8 }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
      />
    </label>
  );
}

export default function PaymentsAdmin() {
  const [vaultId, setVaultId] = useState("");
  const [amount, setAmount] = useState("20.00");
  const [currency, setCurrency] = useState("USD");
  const [authorizationId, setAuthorizationId] = useState("");
  const [captureId, setCaptureId] = useState("");

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [resp, setResp] = useState(null);

  async function call(path, body) {
    setError("");
    setStatus("Working...");
    setResp(null);
    try {
      const r = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Request failed");
      setResp(j);
      setStatus("✅ Done");
      return j;
    } catch (e) {
      setError(String(e.message || e));
      setStatus("");
      return null;
    }
  }

  const onCharge = async () => {
    if (!vaultId) return setError("vaultId required");
    await call("/api/orders/charge", {
      vaultId,
      amount,
      currency,
      idempotencyKey: `charge_${Date.now()}`,
    });
  };

  const onAuthorize = async () => {
    if (!vaultId) return setError("vaultId required");
    const j = await call("/api/orders/authorize", {
      vaultId,
      amount,
      currency,
      idempotencyKey: `auth_${Date.now()}`,
    });
    if (j?.authorizationId) setAuthorizationId(j.authorizationId);
  };

  const onCaptureAuth = async () => {
    if (!authorizationId) return setError("authorizationId required");
    const j = await call("/api/orders/capture-authorization", {
      authorizationId,
      amount,
      currency,
      idempotencyKey: `cap_${Date.now()}`,
    });
    if (j?.captureId) setCaptureId(j.captureId);
  };

  const onVoidAuth = async () => {
    if (!authorizationId) return setError("authorizationId required");
    await call("/api/orders/void-authorization", {
      authorizationId,
      idempotencyKey: `void_${Date.now()}`,
    });
  };

  const onRefund = async () => {
    if (!captureId) return setError("captureId required");
    await call("/api/orders/refund", {
      captureId,
      amount,
      currency,
      idempotencyKey: `refund_${Date.now()}`,
    });
  };

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto", fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 16 }}>Payments Admin — Limo</h1>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        <Box title="Charge (capture now)">
          <div style={{ display: "grid", gap: 10 }}>
            <Input label="vaultId" value={vaultId} onChange={setVaultId} placeholder="TOKEN-..." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input label="amount" value={amount} onChange={setAmount} placeholder="20.00" />
              <Input label="currency" value={currency} onChange={setCurrency} placeholder="USD" />
            </div>
            <button onClick={onCharge} style={btn}>Charge</button>
          </div>
        </Box>

        <Box title="Authorize → Capture / Void">
          <div style={{ display: "grid", gap: 10 }}>
            <Input label="vaultId" value={vaultId} onChange={setVaultId} placeholder="TOKEN-..." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input label="amount" value={amount} onChange={setAmount} placeholder="20.00" />
              <Input label="currency" value={currency} onChange={setCurrency} placeholder="USD" />
            </div>
            <button onClick={onAuthorize} style={btn}>Authorize (hold)</button>

            <Input label="authorizationId" value={authorizationId} onChange={setAuthorizationId} placeholder="AUTH-..." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={onCaptureAuth} style={btnSecondary}>Capture Authorization</button>
              <button onClick={onVoidAuth} style={btnGhost}>Void Authorization</button>
            </div>
          </div>
        </Box>

        <Box title="Refund a Capture">
          <div style={{ display: "grid", gap: 10 }}>
            <Input label="captureId" value={captureId} onChange={setCaptureId} placeholder="CAPTURE-..." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input label="amount" value={amount} onChange={setAmount} placeholder="20.00" />
              <Input label="currency" value={currency} onChange={setCurrency} placeholder="USD" />
            </div>
            <button onClick={onRefund} style={btn}>Refund</button>
          </div>
        </Box>

        <Box title="Status & Response">
          {status && <p>🟡 {status}</p>}
          {error && <p style={{ color: "crimson" }}>⚠️ {error}</p>}
          <pre style={{ marginTop: 8, maxHeight: 360, overflow: "auto", background: "#0b1020", color: "#d7e5ff", padding: 12, borderRadius: 8 }}>
{resp ? JSON.stringify(resp, null, 2) : "// Run an action to see JSON response here"}
          </pre>
        </Box>
      </div>

      <p style={{ marginTop: 18, fontSize: 12, opacity: 0.75 }}>
        Tip: keep <code>amount</code> strings like "20.00" and use a fresh idempotency key each action (buttons already do).
      </p>
    </main>
  );
}

const btn = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "#111",
  color: "white",
  cursor: "pointer",
  fontWeight: 700
};
const btnSecondary = { ...btn, background: "#0f6", borderColor: "#0c5", color: "#041" };
const btnGhost = { ...btn, background: "white", color: "#111" };
