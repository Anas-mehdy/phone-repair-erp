export function MasarWaveBackground() {
  return (
    <div
      className="masar-luxury-bg pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
      aria-hidden="true"
    >
      {/* 1. Ambient luxury glow orbs (Soft, breathing background light) */}
      <div className="masar-ambient-glow masar-glow-teal" />
      <div className="masar-ambient-glow masar-glow-indigo" />
      <div className="masar-ambient-glow masar-glow-cyan" />

      {/* 2. Precision Dot Matrix Grid (Technical luxury texture) */}
      <div className="masar-dot-matrix" />

      {/* 3. Luminous Shimmer Light Sweep (Periodic elegant diagonal gleam) */}
      <div className="masar-shimmer-sweep" />

      {/* 4. Glass luster overlay to protect contrast & typography */}
      <div className="masar-luster-overlay" />
    </div>
  );
}
