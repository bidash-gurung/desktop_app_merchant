import React from "react";

export default function HomeTab({ session }) {
  const user = session?.payload?.user || session?.payload?.data?.user || {};
  return (
    <div style={{ padding: 18 }}>
      <h2 style={{ marginTop: 0 }}>Welcome</h2>
      <p style={{ opacity: 0.75, marginTop: 6 }}>
        Logged in as <b>{user?.user_name || user?.user_name || "Merchant"}</b>
      </p>
      <div
        style={{
          marginTop: 14,
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        }}
      >
        <Card title="Today Orders" value="—" />
        <Card title="Revenue" value="—" />
        <Card title="Pending" value="—" />
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div
      style={{
        border: "1px solid rgba(15,16,32,0.10)",
        borderRadius: 14,
        padding: 14,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.65 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 900, marginTop: 6 }}>{value}</div>
    </div>
  );
}
