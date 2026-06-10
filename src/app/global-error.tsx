"use client";
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pl">
      <body style={{ background: "#0B0F19", color: "#F5F7FA", fontFamily: "system-ui, sans-serif", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 400, textAlign: "center", padding: 20 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>⚽💥</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Krytyczny błąd</h1>
          <p style={{ opacity: 0.7, marginBottom: 20 }}>
            Apka się rozsypała. Spróbuj odświeżyć stronę.
          </p>
          <button
            onClick={reset}
            style={{ background: "#E4002B", color: "white", padding: "10px 20px", borderRadius: 12, border: 0, fontWeight: 700, cursor: "pointer" }}
          >
            🔄 Spróbuj ponownie
          </button>
        </div>
      </body>
    </html>
  );
}
