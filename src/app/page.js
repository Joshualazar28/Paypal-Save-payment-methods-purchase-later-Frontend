"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    async function getHealth() {
      try {
        const res = await fetch(`${apiBase}/health`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message || "Failed to connect");
      } finally {
        setLoading(false);
      }
    }
    getHealth();
  }, [apiBase]);

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold" }}>Limo Payments — Health</h1>
      <p style={{ opacity: 0.8 }}>Backend: {apiBase}</p>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {data && (
        <div
          style={{
            border: "1px solid #ccc",
            borderRadius: 12,
            padding: 16,
            maxWidth: 480,
          }}
        >
          <p><strong>Status:</strong> {data.status}</p>
          <p><strong>Env:</strong> {data.env}</p>
          <p><strong>Time:</strong> {new Date(data.time).toLocaleString()}</p>
        </div>
      )}
    </main>
  );
}
