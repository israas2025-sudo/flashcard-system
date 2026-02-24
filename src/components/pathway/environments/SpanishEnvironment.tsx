"use client";

import React, { useMemo } from "react";

// ===========================================================================
// Enchanted Mediterranean Garden at Dusk — 2D Parallax Environment
// ===========================================================================

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function GardenFireflies({ count = 25 }: { count?: number }) {
  const flies = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i, x: rand(8, 92), y: rand(25, 80), size: rand(2, 4),
      delay: rand(0, 7), duration: rand(4, 8),
    })), [count]);

  return (
    <>
      {flies.map((f) => (
        <div key={f.id} className="pathway-firefly" style={{
          position: "absolute", left: `${f.x}%`, top: `${f.y}%`,
          width: f.size, height: f.size, borderRadius: "50%", background: "#FFEB3B",
          boxShadow: "0 0 8px 3px rgba(255,235,59,0.35)",
          animation: `fireflyGlow ${f.duration}s ease-in-out infinite`,
          animationDelay: `${f.delay}s`, willChange: "transform, opacity",
        }} />
      ))}
    </>
  );
}

function FlowerPetals({ count = 15 }: { count?: number }) {
  const colors = ["#F9A8D4", "#FDBA74", "#C4B5FD", "#FCA5A5", "#FDE68A"];
  const petals = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i, x: rand(10, 90), y: rand(10, 50), size: rand(3, 5),
      delay: rand(0, 10), duration: rand(8, 15),
      color: colors[i % colors.length],
    })), [count]);

  return (
    <>
      {petals.map((p) => (
        <div key={p.id} className="pathway-petal" style={{
          position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: "50%", background: p.color,
          animation: `petalFall ${p.duration}s ease-in-out infinite`,
          animationDelay: `${p.delay}s`, willChange: "transform, opacity",
        }} />
      ))}
    </>
  );
}

export default function SpanishEnvironment() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {/* Layer 1: Dusk sky */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, #1A1830 0%, #2D2050 25%, #6B3A5C 45%, #C46040 65%, #FFD4A8 80%, #1A2510 100%)",
      }} />

      {/* Layer 2: Distant hills + bell tower */}
      <svg style={{ position: "absolute", bottom: "30%", left: 0, width: "100%", height: "35%" }}
        viewBox="0 0 1200 250" preserveAspectRatio="none">
        {/* Rolling hills */}
        <path d="M0,200 Q200,140 400,170 Q600,120 800,160 Q1000,130 1200,170 L1200,250 L0,250Z"
          fill="#2D2050" opacity={0.25} />
        {/* Church/bell tower in distance */}
        <rect x={900} y={130} width={12} height={70} fill="#2D2050" opacity={0.2} />
        <polygon points="895,130 906,110 917,130" fill="#2D2050" opacity={0.2} />
      </svg>

      {/* Layer 3: Arched architecture */}
      <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "60%" }}
        viewBox="0 0 1200 450" preserveAspectRatio="none">
        {/* Archway 1 (left) */}
        <g opacity={0.7}>
          <rect x={100} y={220} width={25} height={180} fill="#1A1208" />
          <rect x={190} y={220} width={25} height={180} fill="#1A1208" />
          <path d="M100,220 Q157.5,160 215,220" fill="#1A1208" />
          {/* Blue tile accent inside arch */}
          <rect x={130} y={250} width={55} height={80} rx={4} fill="#1B4B8B" opacity={0.2} />
          {/* Warm glow from inside */}
          <rect x={135} y={255} width={45} height={70} rx={3} fill="#FF9800" opacity={0.08} />
        </g>

        {/* Archway 2 (center) */}
        <g opacity={0.65}>
          <rect x={550} y={240} width={22} height={160} fill="#1A1208" />
          <rect x={630} y={240} width={22} height={160} fill="#1A1208" />
          <path d="M550,240 Q601,180 652,240" fill="#1A1208" />
          <rect x={575} y={265} width={50} height={70} rx={4} fill="#1B4B8B" opacity={0.15} />
          <rect x={580} y={270} width={40} height={60} rx={3} fill="#FF9800" opacity={0.06} />
        </g>

        {/* Connecting wall */}
        <rect x={215} y={360} width={335} height={40} fill="#1A1208" opacity={0.5} />
        <rect x={652} y={365} width={200} height={35} fill="#1A1208" opacity={0.45} />

        {/* Fountain (center area) */}
        <g opacity={0.6}>
          {/* Basin */}
          <ellipse cx={420} cy={385} rx={35} ry={12} fill="#1A1208" />
          {/* Column */}
          <rect x={417} y={340} width={6} height={45} fill="#1A1208" />
          {/* Top bowl */}
          <ellipse cx={420} cy={340} rx={15} ry={6} fill="#1A1208" />
          {/* Decorative ring */}
          <ellipse cx={420} cy={355} rx={10} ry={4} fill="#1A1208" />
          {/* Water hint */}
          <ellipse cx={420} cy={385} rx={28} ry={8} fill="#3A8EB5" opacity={0.15} />
        </g>
      </svg>

      {/* Layer 4: Citrus trees + vegetation */}
      <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "55%" }}
        viewBox="0 0 1200 400" preserveAspectRatio="none">
        {/* Citrus tree 1 */}
        <g opacity={0.65}>
          <rect x={295} y={280} width={8} height={70} fill="#1A1208" />
          <circle cx={299} cy={265} r={30} fill="#1A3A1A" opacity={0.8} />
          <circle cx={299} cy={255} r={22} fill="#1A3A1A" opacity={0.6} />
          {/* Fruits */}
          <circle cx={285} cy={270} r={3} fill="#F97316" opacity={0.5} />
          <circle cx={310} cy={260} r={2.5} fill="#FFD54F" opacity={0.4} />
          <circle cx={300} cy={280} r={2.5} fill="#F97316" opacity={0.45} />
        </g>

        {/* Citrus tree 2 */}
        <g opacity={0.55}>
          <rect x={760} y={290} width={7} height={60} fill="#1A1208" />
          <circle cx={763} cy={275} r={25} fill="#1A3A1A" opacity={0.7} />
          <circle cx={763} cy={268} r={18} fill="#1A3A1A" opacity={0.5} />
          <circle cx={752} cy={278} r={2.5} fill="#F97316" opacity={0.4} />
          <circle cx={770} cy={270} r={2} fill="#FFD54F" opacity={0.35} />
        </g>

        {/* Citrus tree 3 */}
        <g opacity={0.5}>
          <rect x={1020} y={295} width={6} height={55} fill="#1A1208" />
          <circle cx={1023} cy={282} r={22} fill="#1A3A1A" opacity={0.65} />
          <circle cx={1023} cy={276} r={16} fill="#1A3A1A" opacity={0.45} />
          <circle cx={1012} cy={286} r={2} fill="#F97316" opacity={0.35} />
        </g>

        {/* Flower beds */}
        {[170, 450, 680, 900, 1100].map((x, i) => (
          <g key={`fb-${i}`}>
            <ellipse cx={x} cy={390} rx={20} ry={8} fill="#1A3A1A" opacity={0.3} />
            {/* Flower dots */}
            <circle cx={x - 8} cy={385} r={2} fill="#F9A8D4" opacity={0.4} />
            <circle cx={x + 5} cy={383} r={2} fill="#FDBA74" opacity={0.35} />
            <circle cx={x + 12} cy={386} r={1.5} fill="#C4B5FD" opacity={0.3} />
          </g>
        ))}

        {/* Climbing vines on architecture */}
        <path d="M215,400 Q218,350 222,320 Q226,300 230,285" stroke="#1A4A1A" strokeWidth={2} fill="none" opacity={0.3} />
        <path d="M550,400 Q546,360 548,330" stroke="#1A4A1A" strokeWidth={1.5} fill="none" opacity={0.25} />
      </svg>

      {/* Layer 5: Foreground hedges + path */}
      <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "15%" }}
        viewBox="0 0 1200 100" preserveAspectRatio="none">
        {/* Hedge row */}
        <path d="M0,60 Q50,40 100,55 Q150,35 200,50 Q250,30 300,48 Q400,35 500,50 Q600,32 700,48 Q800,36 900,52 Q1000,38 1100,50 Q1150,40 1200,55 L1200,100 L0,100Z"
          fill="#1A3A1A" opacity={0.5} />
        {/* Stone path tiles */}
        {[200, 350, 500, 650, 800, 950].map((x, i) => (
          <rect key={`tile-${i}`} x={x} y={75} width={30} height={10} rx={3}
            fill="#A09080" opacity={0.15} />
        ))}
      </svg>

      {/* Fountain warm glow */}
      <div style={{
        position: "absolute", bottom: "20%", left: "35%", width: 80, height: 80,
        borderRadius: "50%", transform: "translate(-50%, 50%)",
        background: "radial-gradient(circle, rgba(255,152,0,0.12) 0%, transparent 70%)",
        animation: "breathe 4s ease-in-out infinite",
      }} />

      {/* Archway interior glows */}
      {[{ x: "13%", y: "55%" }, { x: "50%", y: "58%" }].map((pos, i) => (
        <div key={`arch-glow-${i}`} style={{
          position: "absolute", left: pos.x, top: pos.y, width: 50, height: 50,
          borderRadius: "50%", transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(255,152,0,0.1) 0%, transparent 70%)",
          animation: "breathe 6s ease-in-out infinite",
          animationDelay: `${i * 2}s`,
        }} />
      ))}

      {/* Layer 6: Particles */}
      <GardenFireflies count={25} />
      <FlowerPetals count={15} />

      {/* Ground fog */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "8%",
        background: "linear-gradient(to top, rgba(26,37,16,0.5), transparent)",
      }} />
    </div>
  );
}
