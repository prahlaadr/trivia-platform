"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ padding: 40, fontFamily: "monospace", background: "#1a1a1a", color: "#fff" }}>
        <h1 style={{ color: "#ff6b6b" }}>Something went wrong</h1>
        <pre style={{ whiteSpace: "pre-wrap", color: "#ffa07a" }}>
          {error.message}
        </pre>
        <pre style={{ whiteSpace: "pre-wrap", color: "#888", fontSize: 12 }}>
          {error.stack}
        </pre>
        <button
          onClick={reset}
          style={{ marginTop: 20, padding: "8px 16px", cursor: "pointer" }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
