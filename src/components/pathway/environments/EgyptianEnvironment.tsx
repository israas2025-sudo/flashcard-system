"use client";

import React, { useMemo } from "react";

// ===========================================================================
// Ancient Nile at Golden Hour — 2D Parallax Environment
// ===========================================================================

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function GoldenDust({ count = 30 }: { count?: number }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i, x: rand(5, 95), y: rand(15, 85), size: rand(1, 3),
      delay: rand(0, 10), duration: rand(8, 15),
    })), [count]);

  return (
    <>
      {particles.map((p) => (
        <div key={p.id} className="pathway-particle" style={{
          position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: "50%", background: "#FFD54F",
          animation: `goldenDrift ${p.duration}s ease-in-out infinite`,
          animationDelay: `${p.delay}s`, willChange: "transform, opacity",
        }} />
      ))}
    </>
  );
}

function WaterSparkles({ count = 10 }: { count?: number }) {
  const sparkles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i, x: rand(10, 90), y: rand(82, 94), size: rand(1, 2.5),
      delay: rand(0, 5), duration: rand(2, 4),
    })), [count]);

  return (
    <>
      {sparkles.map((s) => (
        <div key={s.id} className="pathway-star" style={{
          position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: "50%", background: "#FFFFFF",
          animation: `twinkle ${s.duration}s ease-in-out infinite`,
          animationDelay: `${s.delay}s`, willChange: "transform, opacity",
        }} />
      ))}
    </>
  );
}

export default function EgyptianEnvironment() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {/* Layer 1: Golden hour sky */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, #0F0A04 0%, #1A1008 15%, #3A2510 35%, #D4764E 60%, #FFB74D 75%, #FFD54F 82%, #1A0F0A 100%)",
      }} />

      {/* Layer 2: Sun disc + rays */}
      <div style={{
        position: "absolute", top: "10%", right: "18%", width: 200, height: 200, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,213,79,0.35) 0%, rgba(255,183,77,0.15) 35%, transparent 65%)",
      }} />
      {/* Sun core */}
      <div style={{
        position: "absolute", top: "16%", right: "22%", width: 50, height: 50, borderRadius: "50%",
        background: "radial-gradient(circle, #FFD54F 0%, #FFB74D 60%, transparent 100%)",
        boxShadow: "0 0 30px 10px rgba(255,213,79,0.3)",
      }} />
      {/* Sun rays (subtle conic gradient) */}
      <div style={{
        position: "absolute", top: "5%", right: "14%", width: 300, height: 300,
        background: "conic-gradient(from 0deg, transparent, rgba(255,213,79,0.06) 5%, transparent 10%, transparent 15%, rgba(255,213,79,0.04) 20%, transparent 25%)",
        borderRadius: "50%",
        animation: "sunRaysRotate 60s linear infinite",
        transformOrigin: "center center",
      }} />

      {/* Layer 3: Desert terrain with dunes */}
      <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "45%" }}
        viewBox="0 0 1200 300" preserveAspectRatio="none">
        <path d="M0,180 Q200,120 400,160 Q500,100 650,140 Q800,90 1000,130 Q1100,100 1200,140 L1200,300 L0,300Z" fill="#2A1E10" opacity={0.4} />
        <path d="M0,220 Q150,170 350,200 Q500,160 700,190 Q900,150 1200,180 L1200,300 L0,300Z" fill="#1A1208" opacity={0.5} />
      </svg>

      {/* Layer 4: Pyramid silhouettes */}
      <svg style={{ position: "absolute", bottom: "18%", left: 0, width: "100%", height: "50%" }}
        viewBox="0 0 1200 400" preserveAspectRatio="none">
        {/* Great Pyramid */}
        <polygon points="500,350 600,120 700,350" fill="#0A0805" opacity={0.85} />
        {/* Stone layer hints */}
        <line x1={530} y1={300} x2={670} y2={300} stroke="#1A1208" strokeWidth={1} opacity={0.3} />
        <line x1={550} y1={260} x2={650} y2={260} stroke="#1A1208" strokeWidth={1} opacity={0.3} />
        <line x1={565} y1={220} x2={635} y2={220} stroke="#1A1208" strokeWidth={1} opacity={0.3} />

        {/* Medium pyramid */}
        <polygon points="700,350 770,180 840,350" fill="#0A0805" opacity={0.7} />

        {/* Small distant pyramid */}
        <polygon points="350,350 390,230 430,350" fill="#0A0805" opacity={0.5} />

        {/* Obelisks */}
        <polygon points="250,350 255,200 260,200 265,350" fill="#0A0805" opacity={0.65} />
        <polygon points="252,200 257.5,185 263,200" fill="#0A0805" opacity={0.65} />

        <polygon points="880,350 884,230 888,230 892,350" fill="#0A0805" opacity={0.55} />
        <polygon points="882,230 886,218 890,230" fill="#0A0805" opacity={0.55} />

        {/* Sphinx silhouette */}
        <path d="M150,350 L155,320 L160,310 L175,305 L185,290 L195,280 L200,285 L205,280 L210,295 L220,305 L230,310 L260,315 L280,320 L300,325 L310,330 L315,350Z"
          fill="#0A0805" opacity={0.6} />
      </svg>

      {/* Layer 5: Nile water band */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "18%",
        background: "linear-gradient(180deg, rgba(15,94,122,0.5) 0%, rgba(10,61,92,0.7) 60%, #0A0805 100%)",
      }}>
        {/* Water shimmer overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 25%, transparent 50%, rgba(255,255,255,0.04) 75%, transparent 100%)",
          backgroundSize: "400% 100%",
          animation: "waterShimmer 6s linear infinite",
        }} />
      </div>

      {/* Papyrus reeds along waterline */}
      <svg style={{ position: "absolute", bottom: "14%", left: 0, width: "100%", height: "20%" }}
        viewBox="0 0 1200 150" preserveAspectRatio="none">
        {Array.from({ length: 18 }, (_, i) => {
          const x = 50 + i * 65 + (i % 3) * 15;
          const h = 40 + (i % 4) * 20;
          return (
            <g key={i} opacity={0.5 + (i % 3) * 0.15}>
              <line x1={x} y1={150} x2={x} y2={150 - h} stroke="#1A3A2A" strokeWidth={2}
                style={{ animation: `reedSway ${3 + (i % 3)}s ease-in-out infinite`, transformOrigin: `${x}px 150px`, animationDelay: `${i * 0.3}s` }} />
              {/* Reed fan top */}
              <line x1={x} y1={150 - h} x2={x - 6} y2={150 - h - 8} stroke="#1A3A2A" strokeWidth={1.5} opacity={0.7} />
              <line x1={x} y1={150 - h} x2={x + 6} y2={150 - h - 8} stroke="#1A3A2A" strokeWidth={1.5} opacity={0.7} />
              <line x1={x} y1={150 - h} x2={x - 4} y2={150 - h - 10} stroke="#1A3A2A" strokeWidth={1} opacity={0.5} />
              <line x1={x} y1={150 - h} x2={x + 4} y2={150 - h - 10} stroke="#1A3A2A" strokeWidth={1} opacity={0.5} />
            </g>
          );
        })}
        {/* Lotus hints on water */}
        {[200, 500, 850].map((x, i) => (
          <circle key={`lotus-${i}`} cx={x} cy={145} r={3} fill="#F9A8D4" opacity={0.4} />
        ))}
      </svg>

      {/* Layer 6: Particles */}
      <GoldenDust count={30} />
      <WaterSparkles count={10} />

      {/* Ibis bird silhouettes */}
      {[{ x: "25%", y: "18%", delay: "0s" }, { x: "60%", y: "12%", delay: "15s" }].map((bird, i) => (
        <div key={`ibis-${i}`} style={{
          position: "absolute", left: bird.x, top: bird.y,
          fontSize: 10, color: "#0A0805", opacity: 0.4,
          animation: `sandDrift 35s linear infinite`,
          animationDelay: bird.delay,
        }}>
          <svg width="16" height="8" viewBox="0 0 16 8">
            <path d="M0,4 Q4,0 8,4 Q12,0 16,4" stroke="#0A0805" strokeWidth={1.5} fill="none" />
          </svg>
        </div>
      ))}

      {/* Heat haze hint */}
      <div style={{
        position: "absolute", bottom: "20%", left: 0, right: 0, height: "3%",
        background: "linear-gradient(90deg, transparent, rgba(255,183,77,0.08), transparent)",
        filter: "blur(2px)",
      }} />
    </div>
  );
}
