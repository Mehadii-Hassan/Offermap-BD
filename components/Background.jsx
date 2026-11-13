export default function Background() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10"
      style={{ backgroundColor: "var(--site-bg)", color: "#fff" }}
      data-background
    >
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
      <div className="noise absolute inset-0" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top, var(--bg-tint, #1a1230) 0%, transparent 60%)",
        }}
      />
    </div>
  );
}