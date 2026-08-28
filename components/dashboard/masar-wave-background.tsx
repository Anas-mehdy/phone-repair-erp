export function MasarWaveBackground() {
  return (
    <div
      className="masar-wave-container pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
      aria-hidden="true"
    >
      {/* Ambient gradient mesh lights (Antigravity-inspired aurora glow) */}
      <div className="masar-ambient-orb masar-orb-teal" />
      <div className="masar-ambient-orb masar-orb-indigo" />
      <div className="masar-ambient-orb masar-orb-sky" />

      {/* Grid mask for subtle modern digital texture */}
      <div className="masar-subtle-grid" />

      {/* Layer 3: Deep slow flowing wave (Right to Left) */}
      <div className="masar-wave-track masar-wave-track-3">
        <svg
          className="masar-wave-svg"
          viewBox="0 0 1440 220"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="masar-grad-3" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <path
            d="M0,70 C320,140 460,20 720,85 C980,150 1140,40 1440,70 L1440,220 L0,220 Z"
            fill="url(#masar-grad-3)"
          />
        </svg>
        <svg
          className="masar-wave-svg"
          viewBox="0 0 1440 220"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,70 C320,140 460,20 720,85 C980,150 1140,40 1440,70 L1440,220 L0,220 Z"
            fill="url(#masar-grad-3)"
          />
        </svg>
      </div>

      {/* Layer 2: Medium harmonious undulating wave (Right to Left) */}
      <div className="masar-wave-track masar-wave-track-2">
        <svg
          className="masar-wave-svg"
          viewBox="0 0 1440 200"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="masar-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0.22" />
              <stop offset="45%" stopColor="#38bdf8" stopOpacity="0.16" />
              <stop offset="85%" stopColor="#818cf8" stopOpacity="0.08" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,95 C260,35 500,160 720,95 C940,30 1180,150 1440,95 L1440,200 L0,200 Z"
            fill="url(#masar-grad-2)"
          />
        </svg>
        <svg
          className="masar-wave-svg"
          viewBox="0 0 1440 200"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,95 C260,35 500,160 720,95 C940,30 1180,150 1440,95 L1440,200 L0,200 Z"
            fill="url(#masar-grad-2)"
          />
        </svg>
      </div>

      {/* Layer 1: Front luminous wave with dynamic crest (Right to Left) */}
      <div className="masar-wave-track masar-wave-track-1">
        <svg
          className="masar-wave-svg"
          viewBox="0 0 1440 180"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="masar-grad-1" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="masar-crest-line" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path
            d="M0,110 C360,175 580,45 720,110 C860,175 1080,45 1440,110 L1440,180 L0,180 Z"
            fill="url(#masar-grad-1)"
          />
          {/* Subtle glowing crest highlight */}
          <path
            d="M0,110 C360,175 580,45 720,110 C860,175 1080,45 1440,110"
            fill="none"
            stroke="url(#masar-crest-line)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <svg
          className="masar-wave-svg"
          viewBox="0 0 1440 180"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,110 C360,175 580,45 720,110 C860,175 1080,45 1440,110 L1440,180 L0,180 Z"
            fill="url(#masar-grad-1)"
          />
          <path
            d="M0,110 C360,175 580,45 720,110 C860,175 1080,45 1440,110"
            fill="none"
            stroke="url(#masar-crest-line)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Top glass / soft vignette overlay to keep text super crisp */}
      <div className="masar-glass-overlay" />
    </div>
  );
}
