"use client";

import { useEffect, useRef } from "react";

export function MasarWaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;
    let isVisible = true;

    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Resize handler with crisp Retina / High-DPI support
    const handleResize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Pause animation when the card is scrolled out of viewport (0% CPU/GPU usage)
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    observer.observe(canvas);

    const render = () => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      ctx.clearRect(0, 0, width, height);

      // Grid spacing configuration (responsive & light)
      const spacingX = Math.max(22, Math.floor(width / 38));
      const spacingY = Math.max(18, Math.floor(height / 14));
      const cols = Math.floor(width / spacingX) + 2;
      const rows = Math.floor(height / spacingY) + 2;
      const offsetX = (width - (cols - 1) * spacingX) / 2;
      const offsetY = (height - (rows - 1) * spacingY) / 2;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = offsetX + i * spacingX;
          const y = offsetY + j * spacingY;

          // Harmonic mathematical wave calculation
          const dist = i * 0.16 + j * 0.2;
          const wave1 = prefersReducedMotion
            ? Math.sin(dist)
            : Math.sin(dist - time * 1.5);
          const wave2 = prefersReducedMotion
            ? Math.cos(dist * 0.7)
            : Math.cos(i * 0.1 - j * 0.14 + time * 1.1);

          const combinedWave = (wave1 + wave2) * 0.5; // -1 to 1
          const norm = (combinedWave + 1) / 2; // 0 to 1

          // Radius and opacity modulated by wave crests
          const radius = 0.9 + norm * 1.5;
          const opacity = 0.06 + norm * 0.45;

          // Radial vignette fade toward edges
          const dx = (x - width / 2) / (width / 2);
          const dy = (y - height / 2) / (height / 2);
          const centerDist = Math.sqrt(dx * dx + dy * dy);
          const vignette = Math.max(0, 1 - centerDist * 0.62);

          const finalOpacity = opacity * vignette;
          if (finalOpacity <= 0.02) continue;

          ctx.beginPath();
          ctx.arc(x, y + combinedWave * 3.2, radius, 0, Math.PI * 2);

          // Masar brand palette (Teal, Cyan, Soft Indigo)
          if (norm > 0.6) {
            ctx.fillStyle = `rgba(13, 148, 136, ${finalOpacity})`;
          } else if (norm > 0.3) {
            ctx.fillStyle = `rgba(6, 182, 212, ${finalOpacity * 0.85})`;
          } else {
            ctx.fillStyle = `rgba(99, 102, 241, ${finalOpacity * 0.65})`;
          }

          ctx.fill();
        }
      }

      if (!prefersReducedMotion) {
        time += 0.018;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      className="masar-dot-grid-container pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
      aria-hidden="true"
    >
      {/* Subtle ambient corner light */}
      <div className="masar-ambient-glow masar-glow-teal" />
      <div className="masar-ambient-glow masar-glow-indigo" />

      {/* Local Native High-Performance Dot Grid Wave Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full pointer-events-none"
      />

      {/* Contrast protective overlay for text clarity */}
      <div className="masar-luster-overlay" />
    </div>
  );
}
