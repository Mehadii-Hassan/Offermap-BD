"use client";

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            background: "#0a0a0f",
            color: "#fff",
            textAlign: "center",
            padding: "16px",
          }}
        >
          <div>
            <h1 style={{ fontSize: 40, fontWeight: 900 }}>Something went wrong</h1>
            <p style={{ opacity: 0.6, marginTop: 12 }}>
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={() => reset()}
              style={{
                marginTop: 24,
                padding: "12px 24px",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg,#ec4899,#8b5cf6)",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}