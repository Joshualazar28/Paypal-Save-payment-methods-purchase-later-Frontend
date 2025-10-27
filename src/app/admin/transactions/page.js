"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

function Badge({ children }) {
  const ok = /COMPLETED|VOIDED|APPROVED/i.test(children || "");
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 999, fontSize: 12,
      background: ok ? "#e8fff3" : "#fff5e5", color: ok ? "#05603a" : "#8a4b00",
      border: `1px solid ${ok ? "#12b88633" : "#f59f0b33"}`
    }}>{children}</span>
  );
}

export default function TransactionsPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [type, setType] = useState(""); // "", "CAPTURE", "AUTHORIZATION", "REFUND", "VOID"

  async function load() {
    setStatus("Loading...");
    setError("");
    try {
      const url = new URL(`${API}/api/transactions`);
      if (type) url.searchParams.set("q", type);
      url.searchParams.set("limit", "100");
      const r = await fetch(url.toString());
      const j = await r.json();
      setRows(Array.isArray(j) ? j : []);
      setStatus(`Loaded ${Array.isArray(j) ? j.length : 0}`);
    } catch (e) {
      setError(String(e?.message || e));
      setStatus("");
    }
  }

  useEffect(() => { load()}, [type]);

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto", fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>Transactions — Limo</h1>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <select value={type} onChange={e => setType(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd" }}>
          <option value="">All types</option>
          <option value="CAPTURE">CAPTURE</option>
          <option value="AUTHORIZATION">AUTHORIZATION</option>
          <option value="VOID">VOID</option>
          <option value="REFUND">REFUND</option>
          <option value="ORDER">ORDER</option>
        </select>
        <button onClick={load} style={btn}>Refresh</button>
        {status && <span style={{ marginLeft: 8, opacity: .7 }}>{status}</span>}
        {error && <span style={{ marginLeft: 8, color: "crimson" }}>⚠ {error}</span>}
      </div>

      <div style={{ overflow: "auto", border: "1px solid #eee", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              <th style={th}>Date</th>
              <th style={th}>Type</th>
              <th style={th}>Status</th>
              <th style={th}>Amount</th>
              <th style={th}>IDs</th>
              <th style={th}>Customer</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} style={{ borderTop: "1px solid #f0f0f0" }}>
                <td style={td}>{new Date(r.createdAt).toLocaleString()}</td>
                <td style={td}><code>{r.type}</code>{r.intent ? <span style={{opacity:.6}}> · {r.intent}</span> : null}</td>
                <td style={td}><Badge>{r.status}</Badge></td>
                <td style={td}>{r.amount ? `${r.amount} ${r.currency || ""}` : "-"}</td>
                <td style={tdSmall}>
                  {r.orderId && <div>order: <code>{r.orderId}</code></div>}
                  {r.authorizationId && <div>auth: <code>{r.authorizationId}</code></div>}
                  {r.captureId && <div>capture: <code>{r.captureId}</code></div>}
                  {r.refundId && <div>refund: <code>{r.refundId}</code></div>}
                  {r.vaultId && <div>token: <code>{r.vaultId}</code></div>}
                </td>
                <td style={td}>{r.customerId || "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", opacity: .7 }}>No transactions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 12, fontSize: 12, opacity: .7 }}>
        Tip: Use the filters to find refunds/voids quickly. Data is fetched from <code>/api/transactions</code>.
      </p>
    </main>
  );
}

const th = { textAlign: "left", padding: "10px 12px", fontWeight: 700, fontSize: 13, borderBottom: "1px solid #eee" };
const td = { padding: "10px 12px", fontSize: 13 };
const tdSmall = { ...td, fontSize: 12 };

const btn = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #111",
  background: "#111",
  color: "white",
  cursor: "pointer",
  fontWeight: 700
};
