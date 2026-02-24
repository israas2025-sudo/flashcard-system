"use client";

import React, { useMemo } from "react";

// ===========================================================================
// Desert Oasis at Twilight — 2D Parallax Environment
// Used for Arabic (MSA) and Quranic Arabic
// ===========================================================================

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function Stars({ count = 55 }: { count?: number }) {
  const stars = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i, x: rand(2, 98), y: rand(3, 52), size: rand(1, 3),
      delay: rand(0, 6), duration: rand(2.5, 5),
    })), [count]);

  return (
    <>
      {stars.map((s) => (
        <div key={s.id} className="pathway-star" style={{
          position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: "50%", background: "#FFF8DC",
          animation: `twinkle ${s.duration}s ease-in-out infinite`,
          animationDelay: `${s.delay}s`, willChange: "transform, opacity",
        }} />
      ))}
    </>
  );
}

function SandParticles({ count = 18 }: { count?: number }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i, x: rand(5, 90), y: rand(50, 92), size: rand(2, 4),
      delay: rand(0, 12), duration: rand(10, 18),
    })), [count]);

  return (
    <>
      {particles.map((p) => (
        <div key={p.id} className="pathway-particle" style={{
          position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: "50%", background: "#E8D4A8",
          animation: `sandDrift ${p.duration}s linear infinite`,
          animationDelay: `${p.delay}s`, willChange: "transform, opacity",
        }} />
      ))}
    </>
  );
}

function OasisFireflies({ count = 12 }: { count?: number }) {
  const flies = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i, x: rand(20, 80), y: rand(40, 75), size: rand(2, 3.5),
      delay: rand(0, 6), duration: rand(4, 7),
    })), [count]);

  return (
    <>
      {flies.map((f) => (
        <div key={f.id} className="pathway-firefly" style={{
          position: "absolute", left: `${f.x}%`, top: `${f.y}%`,
          width: f.size, height: f.size, borderRadius: "50%", background: "#FFE082",
          boxShadow: "0 0 6px 2px rgba(255,224,130,0.4)",
          animation: `fireflyGlow ${f.duration}s ease-in-out infinite`,
          animationDelay: `${f.delay}s`, willChange: "transform, opacity",
        }} />
      ))}
    </>
  );
}

export default function QuranEnvironment() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {/* Layer 1: Twilight sky */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, #0D1B2A 0%, #1B2A4A 18%, #3A2A5C 38%, #D4764E 68%, #F4A460 80%, #1A0F0A 100%)",
      }} />

      {/* Layer 2: Moon + halo */}
      <div style={{
        position: "absolute", top: "8%", left: "12%", width: 120, height: 120, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,248,220,0.2) 0%, rgba(255,248,220,0.06) 40%, transparent 70%)",
      }} />
      <div style={{ position: "absolute", top: "12%", left: "15%" }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", background: "#FFF8DC",
          boxShadow: "0 0 12px 4px rgba(255,248,220,0.3)", position: "relative",
        }}>
          <div style={{
            position: "absolute", top: -3, left: 8, width: 24, height: 24,
            borderRadius: "50%", background: "#1B2A4A",
          }} />
        </div>
      </div>

      <Stars count={55} />

      {/* Layer 3: Distant dunes */}
      <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "45%" }}
        viewBox="0 0 1200 300" preserveAspectRatio="none">
        <path d="M0,200 Q150,140 300,180 Q450,130 600,160 Q750,110 900,150 Q1050,120 1200,160 L1200,300 L0,300Z" fill="#3A2A15" opacity={0.4} />
        <path d="M0,230 Q100,180 250,210 Q400,160 550,200 Q700,170 850,195 Q1000,155 1200,190 L1200,300 L0,300Z" fill="#2A1E10" opacity={0.5} />
        <path d="M0,260 Q200,220 400,245 Q550,215 700,240 Q850,210 1000,235 Q1100,220 1200,240 L1200,300 L0,300Z" fill="#1A1208" opacity={0.65} />
      </svg>

      {/* Layer 4: Architecture silhouettes */}
      <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "55%" }}
        viewBox="0 0 1200 400" preserveAspectRatio="none">
        {/* Mosque dome */}
        <ellipse cx={350} cy={220} rx={50} ry={42} fill="#0A0806" opacity={0.8} />
        <rect x={310} y={220} width={80} height={80} fill="#0A0806" opacity={0.8} />
        <circle cx={350} cy={180} r={5} fill="#0A0806" opacity={0.8} />
        <rect x={349} y={180} width={2} height={12} fill="#0A0806" opacity={0.8} />
        {/* Minarets */}
        <rect x={230} y={140} width={14} height={160} fill="#0A0806" opacity={0.75} />
        <polygon points="230,140 237,120 244,140" fill="#0A0806" opacity={0.75} />
        <rect x={226} y={180} width={22} height={4} fill="#0A0806" opacity={0.75} />
        <rect x={800} y={160} width={12} height={140} fill="#0A0806" opacity={0.7} />
        <polygon points="800,160 806,138 812,160" fill="#0A0806" opacity={0.7} />
        {/* Buildings */}
        <rect x={400} y={260} width={60} height={40} fill="#0A0806" opacity={0.7} />
        <rect x={470} y={250} width={50} height={50} fill="#0A0806" opacity={0.65} />
        <rect x={530} y={265} width={45} height={35} fill="#0A0806" opacity={0.6} />
        {/* Arched windows */}
        <rect x={415} y={275} width={12} height={20} rx={6} fill="#3A2A5C" opacity={0.3} />
        <rect x={485} y={270} width={14} height={22} rx={7} fill="#3A2A5C" opacity={0.3} />
      </svg>

      {/* Layer 5: Palm silhouettes */}
      <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "60%" }}
        viewBox="0 0 1200 450" preserveAspectRatio="none">
        <g opacity={0.75}>
          <path d="M130,450 Q125,350 140,250" stroke="#0A0806" strokeWidth={6} fill="none" />
          <path d="M140,250 Q155,230 180,235" stroke="#0A0806" strokeWidth={3} fill="none" />
          <path d="M140,250 Q130,220 115,225" stroke="#0A0806" strokeWidth={3} fill="none" />
          <path d="M140,250 Q150,218 170,210" stroke="#0A0806" strokeWidth={3} fill="none" />
          <path d="M140,250 Q135,215 120,208" stroke="#0A0806" strokeWidth={3} fill="none" />
        </g>
        <g opacity={0.6}>
          <path d="M280,450 Q275,370 282,280" stroke="#0A0806" strokeWidth={5} fill="none" />
          <path d="M282,280 Q300,260 320,265" stroke="#0A0806" strokeWidth={2.5} fill="none" />
          <path d="M282,280 Q270,250 255,255" stroke="#0A0806" strokeWidth={2.5} fill="none" />
          <path d="M282,280 Q290,255 310,250" stroke="#0A0806" strokeWidth={2.5} fill="none" />
        </g>
        <g opacity={0.7}>
          <path d="M950,450 Q955,360 945,265" stroke="#0A0806" strokeWidth={5.5} fill="none" />
          <path d="M945,265 Q960,245 985,250" stroke="#0A0806" strokeWidth={3} fill="none" />
          <path d="M945,265 Q930,240 910,245" stroke="#0A0806" strokeWidth={3} fill="none" />
          <path d="M945,265 Q952,238 975,232" stroke="#0A0806" strokeWidth={2.5} fill="none" />
        </g>
        <g opacity={0.5}>
          <path d="M1080,450 Q1082,390 1078,320" stroke="#0A0806" strokeWidth={4} fill="none" />
          <path d="M1078,320 Q1090,305 1105,310" stroke="#0A0806" strokeWidth={2} fill="none" />
          <path d="M1078,320 Q1068,300 1055,305" stroke="#0A0806" strokeWidth={2} fill="none" />
        </g>
        {/* Bushes */}
        <ellipse cx={180} cy={435} rx={25} ry={12} fill="#0A0806" opacity={0.4} />
        <ellipse cx={680} cy={440} rx={30} ry={10} fill="#0A0806" opacity={0.35} />
        <ellipse cx={1000} cy={438} rx={20} ry={10} fill="#0A0806" opacity={0.3} />
      </svg>

      {/* Layer 6: Lantern glows */}
      {[{ x: "22%", y: "42%" }, { x: "55%", y: "38%" }, { x: "75%", y: "44%" }, { x: "40%", y: "48%" }].map((pos, i) => (
        <div key={`lantern-${i}`} style={{
          position: "absolute", left: pos.x, top: pos.y, width: 60, height: 60, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,149,0,0.2) 0%, transparent 70%)",
          animation: "breathe 5s ease-in-out infinite", animationDelay: `${i * 1.2}s`,
          transform: "translate(-50%, -50%)",
        }} />
      ))}

      <SandParticles count={18} />
      <OasisFireflies count={12} />

      {/* Ground fog */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "10%",
        background: "linear-gradient(to top, rgba(26,15,10,0.6), transparent)",
      }} />
    </div>
  );
}
