"use client";

import { useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

function Section({ title, children }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
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

const btn = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "#111",
  color: "white",
  cursor: "pointer",
  fontWeight: 700
};
const btnGhost = { ...btn, background: "white", color: "#111" };
const chip = { padding: "2px 8px", borderRadius: 999, fontSize: 12, background: "#f5f7ff", border: "1px solid #e5e8ff" };

export default function CustomersAdmin() {
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]); // all saved methods
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  // create form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // charge/authorize inputs
  const [amount, setAmount] = useState("20.00");
  const [currency, setCurrency] = useState("USD");

  async function load() {
    setStatus("Loading...");
    setError("");
    try {
      const [c, p] = await Promise.all([
        fetch(`${API}/api/customers`).then(r => r.json()),
        // if you have ?customerId filter on backend you can use it; otherwise we fetch all and filter client-side
        fetch(`${API}/api/payments`).then(r => r.json()),
      ]);
      setCustomers(Array.isArray(c) ? c : []);
      setPayments(Array.isArray(p) ? p : []);
      setStatus(`Loaded ${Array.isArray(c) ? c.length : 0} customers`);
      if (!selectedId && Array.isArray(c) && c.length) setSelectedId(c[0]?._id);
    } catch (e) {
      setError(String(e.message || e));
      setStatus("");
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const current = useMemo(() => customers.find(x => x._id === selectedId) || null, [customers, selectedId]);
  const currentCards = useMemo(
    () => payments.filter(p => String(p?.customerId?._id || p?.customerId) === String(selectedId) && p.type === "card"),
    [payments, selectedId]
  );

  async function createCustomer() {
    setError(""); setStatus("Creating...");
    try {
      const r = await fetch(`${API}/api/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to create");
      setName(""); setEmail("");
      await load();
      setSelectedId(j._id);
      setStatus("✅ Customer created");
    } catch (e) {
      setError(String(e.message || e)); setStatus("");
    }
  }

  async function call(path, body) {
    setError(""); setStatus("Working...");
    try {
      const r = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Request failed");
      setStatus("✅ Done");
      console.log("Response:", j);
      alert(`${path} OK\n` + JSON.stringify(j, null, 2));
    } catch (e) {
      setError(String(e.message || e)); setStatus("");
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto", fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>Customers — Limo</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: 16 }}>
        {/* Left column */}
        <div style={{ display: "grid", gap: 16 }}>
          <Section title="Create customer">
            <div style={{ display: "grid", gap: 10 }}>
              <Input label="name"  value={name}  onChange={setName}  placeholder="John Doe" />
              <Input label="email" value={email} onChange={setEmail} placeholder="john@example.com" />
              <button onClick={createCustomer} style={btn}>Create</button>
            </div>
          </Section>

          <Section title="Customers">
            <div style={{ display: "grid", gap: 8 }}>
              {customers.map(c => (
                <div key={c._id}
                  onClick={() => setSelectedId(c._id)}
                  style={{
                    border: "1px solid #eee", borderRadius: 10, padding: 10,
                    background: selectedId === c._id ? "#f7faff" : "white",
                    cursor: "pointer", display: "grid", gap: 4
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>{c.name || "—"}</strong>
                    <span style={chip}>{c._id.slice(-6)}</span>
                  </div>
                  <div style={{ fontSize: 12, opacity: .75 }}>{c.email || "no email"}</div>
                </div>
              ))}
              {customers.length === 0 && <div style={{ opacity: .7 }}>No customers yet</div>}
            </div>
          </Section>
        </div>

        {/* Right column */}
        <div style={{ display: "grid", gap: 16 }}>
 <Section title="Customer details">
    {current ? (
      <div style={{ display: "grid", gap: 8 }}>
        <div><strong>Name:</strong> {current.name || "—"}</div>
        <div><strong>Email:</strong> {current.email || "—"}</div>
        <div><strong>ID:</strong> <code>{current._id}</code></div>
 <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
   <button
     onClick={() => window.open(`/save-card?customerId=${current._id}`, "_blank")}
     style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #111", background: "#111", color: "#fff", fontWeight: 700, cursor: "pointer" }}
   >
      Save card
   </button>
   <button
     onClick={() => window.open(`/save-paypal?customerId=${current._id}`, "_blank")}
     style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #111", background: "#fff", color: "#111", fontWeight: 700, cursor: "pointer" }}
   >
      Save PayPal
   </button>
 </div>

      </div>
    ) : (
      <div style={{ opacity: .7 }}>Select a customer on the left.</div>
    )}
  </Section>

          <Section title="Saved cards">
            {currentCards.length === 0 ? (
              <div style={{ opacity: .7 }}>No cards saved for this customer.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {currentCards.map(pm => (
                  <div key={pm._id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong>{pm.brand || "CARD"}</strong> •••• {pm.last4 || "----"}
                        <div style={{ fontSize: 12, opacity: .7 }}>token: <code>{pm.vaultId}</code></div>
                      </div>
                      <span style={chip}>{pm.status || "active"}</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      <Input label="amount"   value={amount}   onChange={setAmount}   placeholder="20.00" />
                      <Input label="currency" value={currency} onChange={setCurrency} placeholder="USD" />
                      <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
                        <button
                          onClick={() => call("/api/orders/charge", {
                            vaultId: pm.vaultId, amount, currency,
                            idempotencyKey: `charge_${Date.now()}`, customerId: current?._id
                          })}
                          style={btn}
                        >
                          Charge
                        </button>
                        <button
                          onClick={() => call("/api/orders/authorize", {
                            vaultId: pm.vaultId, amount, currency,
                            idempotencyKey: `auth_${Date.now()}`, customerId: current?._id
                          })}
                          style={btnGhost}
                        >
                          Authorize
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {(status || error) && (
            <Section title="Status">
              {status && <div>🟡 {status}</div>}
              {error && <div style={{ color: "crimson" }}>⚠️ {error}</div>}
            </Section>
          )}
        </div>
      </div>
    </main>
  );
}
