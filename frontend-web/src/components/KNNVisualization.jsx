import React, { useState } from 'react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
const W = 560, H = 320, PAD = { t: 30, r: 40, b: 60, l: 85 };
const PW = W - PAD.l - PAD.r, PH = H - PAD.t - PAD.b;

function makeScale(values) {
  const lo = Math.min(...values), hi = Math.max(...values);
  const range = hi - lo || 1;
  const min = lo - range * 0.15, max = hi + range * 0.15;
  return {
    min, max,
    px: (v, isX) => isX
      ? PAD.l + ((v - min) / (max - min)) * PW
      : PAD.t + PH - ((v - min) / (max - min)) * PH,
    ticks: (n) => Array.from({ length: n }, (_, i) => min + (max - min) * i / (n - 1))
  };
}

function StarShape({ cx, cy, r = 12, color }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.42;
    return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
  }).join(' ');
  return (
    <polygon 
      points={pts} 
      fill={color} 
      stroke="#ffffff" 
      strokeWidth="2"
      style={{ filter: `drop-shadow(0 0 6px ${color}aa)` }} 
    />
  );
}

// --- Tab 1: Scatter Plot Interaktif ---
function ScatterPanel({ neighbors, queryData, hasilEstimasi, xKey, xLabel }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const qx = queryData[xKey];
  const allX = [qx, ...neighbors.map(n => n[xKey])];
  const allY = [hasilEstimasi, ...neighbors.map(n => n.harga)];
  const xs = makeScale(allX), ys = makeScale(allY);

  const QPX = xs.px(qx, true), QPY = ys.px(hasilEstimasi, false);
  const xTicks = xs.ticks(6), yTicks = ys.ticks(5);

  const formatY = (v) => `Rp ${(v / 1e6).toFixed(1)}Jt`;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', userSelect: 'none' }}>
        <style>{`
          @keyframes drawLine { from { stroke-dashoffset: 800 } to { stroke-dashoffset: 0 } }
          @keyframes popDot { from { opacity:0; transform:scale(0) } to { opacity:1; transform:scale(1) } }
          @keyframes pulseRing { 0%,100% { r:15; opacity:.3 } 50% { r:22; opacity:.6 } }
          .nb-dot { transition: all 0.2s ease; cursor: pointer; }
          .nb-dot:hover circle { stroke-width: 3px; filter: brightness(1.1); }
        `}</style>

        {/* Background */}
        <rect x={PAD.l} y={PAD.t} width={PW} height={PH} fill="#f8fafc" rx="8" stroke="#e2e8f0" />

        {/* Grid lines */}
        {xTicks.map((v, i) => <line key={`xg${i}`} x1={xs.px(v,true)} y1={PAD.t} x2={xs.px(v,true)} y2={PAD.t+PH} stroke="#f1f5f9" strokeWidth="1" />)}
        {yTicks.map((v, i) => <line key={`yg${i}`} x1={PAD.l} y1={ys.px(v,false)} x2={PAD.l+PW} y2={ys.px(v,false)} stroke="#f1f5f9" strokeWidth="1" />)}

        {/* Axes */}
        <line x1={PAD.l} y1={PAD.t+PH} x2={PAD.l+PW} y2={PAD.t+PH} stroke="#64748b" strokeWidth="1.5" />
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t+PH} stroke="#64748b" strokeWidth="1.5" />

        {/* X ticks */}
        {xTicks.map((v, i) => (
          <text key={`xt${i}`} x={xs.px(v,true)} y={PAD.t+PH+16} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="500">
            {Math.round(v)}
          </text>
        ))}
        <text x={PAD.l+PW/2} y={H-6} textAnchor="middle" fontSize="11" fontWeight="600" fill="#334155">{xLabel}</text>

        {/* Y ticks */}
        {yTicks.map((v, i) => (
          <text key={`yt${i}`} x={PAD.l-10} y={ys.px(v,false)+3} textAnchor="end" fontSize="10" fill="#64748b" fontWeight="500">
            {formatY(v)}
          </text>
        ))}
        <text x={16} y={PAD.t+PH/2} textAnchor="middle" fontSize="11" fontWeight="600" fill="#334155"
          transform={`rotate(-90, 16, ${PAD.t+PH/2})`}>Harga Jual</text>

        {/* Dashed lines connecting Query to Neighbors */}
        {neighbors.map((nb, i) => {
          const nx = xs.px(nb[xKey], true), ny = ys.px(nb.harga, false);
          const len = Math.hypot(nx - QPX, ny - QPY);
          const isHovered = hoveredIdx === i;
          return (
            <line key={`line${i}`} x1={QPX} y1={QPY} x2={nx} y2={ny}
              stroke={COLORS[i % COLORS.length]} 
              strokeWidth={isHovered ? "3" : "1.5"} 
              opacity={isHovered ? "0.9" : "0.4"}
              strokeDasharray={len} strokeDashoffset={0}
              style={{ animation: `drawLine 0.7s ease ${i * 0.15}s both` }} 
            />
          );
        })}

        {/* Neighbor dots */}
        {neighbors.map((nb, i) => {
          const nx = xs.px(nb[xKey], true), ny = ys.px(nb.harga, false);
          const isHovered = hoveredIdx === i;
          return (
            <g key={`nb${i}`} className="nb-dot"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ animation: `popDot 0.4s ease ${i * 0.15 + 0.5}s both`, transformOrigin: `${nx}px ${ny}px` }}>
              <circle cx={nx} cy={ny} r={isHovered ? 11 : 9} fill={COLORS[i % COLORS.length]} stroke="#ffffff" strokeWidth={isHovered ? "2.5" : "1.5"} />
              <text x={nx} y={ny+3} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#ffffff">K{i+1}</text>
              <text x={nx} y={ny-14} textAnchor="middle" fontSize="9" fill={COLORS[i%COLORS.length]} fontWeight={isHovered ? "700" : "600"}>
                {formatY(nb.harga)}
              </text>
            </g>
          );
        })}

        {/* Pulsing ring around query */}
        <circle cx={QPX} cy={QPY} fill="none" stroke="#dc2626" strokeWidth="1.5"
          style={{ animation: 'pulseRing 2s ease-in-out infinite' }} />

        {/* Query star */}
        <g style={{ animation: 'popDot 0.5s ease 0.1s both', transformOrigin: `${QPX}px ${QPY}px` }}>
          <StarShape cx={QPX} cy={QPY} r={12} color="#dc2626" />
          <text x={QPX} y={QPY - 18} textAnchor="middle" fontSize="10" fontWeight="700" fill="#dc2626">Input (ŷ)</text>
        </g>
      </svg>

      {/* Panel Info Dinamis di Bawah Peta */}
      <div style={{ minHeight: '44px', marginTop: '12px', padding: '8px 14px', background: hoveredIdx !== null ? `${COLORS[hoveredIdx % COLORS.length]}12` : '#f8fafc', border: '1px solid', borderColor: hoveredIdx !== null ? `${COLORS[hoveredIdx % COLORS.length]}44` : '#e2e8f0', borderRadius: '8px', transition: 'all 0.2s' }}>
        {hoveredIdx !== null ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
            <div>
              <strong style={{ color: COLORS[hoveredIdx % COLORS.length] }}>K{hoveredIdx+1}: {neighbors[hoveredIdx].merek} {neighbors[hoveredIdx].processor}</strong>
              <span style={{ color: '#64748b', marginLeft: '8px' }}>({xLabel}: {neighbors[hoveredIdx][xKey]})</span>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span>Harga: <strong>Rp {neighbors[hoveredIdx].harga.toLocaleString('id-ID')}</strong></span>
              <span style={{ color: '#ef4444' }}>Jarak: <strong>{neighbors[hoveredIdx].jarak.toFixed(4)}</strong></span>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>Kemiripan: {((1 / (1 + neighbors[hoveredIdx].jarak)) * 100).toFixed(1)}%</span>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', fontStyle: 'italic', lineHeight: '26px' }}>
            💡 Sorot (hover) titik K1–K{neighbors.length} di atas untuk melihat pemetaan spesifikasi dan nilai kemiripan persentasenya.
          </div>
        )}
      </div>
    </div>
  );
}

// --- Tab 2: Ranking Jarak & Kemiripan Akademis ---
function DistanceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 16px', fontSize: '0.82rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
      <p style={{ margin: '0 0 6px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>{d.name}</p>
      <p style={{ margin: '0 0 3px', color: '#475569' }}>Spesifikasi: <strong>{d.spec}</strong></p>
      <p style={{ margin: '0 0 3px', color: '#0f172a' }}>Harga Terjual: <strong style={{ color: '#2563eb' }}>Rp {d.harga.toLocaleString('id-ID')}</strong></p>
      <p style={{ margin: '0 0 3px', color: '#ef4444' }}>Jarak Euclidean (d): <strong>{d.jarak}</strong></p>
      <p style={{ margin: 0, color: '#10b981' }}>Skor Kemiripan (S): <strong style={{ fontSize: '0.9rem' }}>{d.similarity}%</strong></p>
    </div>
  );
}

function DistancePanel({ neighbors }) {
  const data = neighbors.map((nb, i) => {
    const sim = ((1 / (1 + nb.jarak)) * 100).toFixed(1);
    return {
      name: `K${i+1}: ${nb.merek}`,
      jarak: parseFloat(nb.jarak.toFixed(4)),
      similarity: parseFloat(sim),
      color: COLORS[i % COLORS.length],
      harga: nb.harga,
      spec: `${nb.ram}GB RAM · ${nb.ssd}GB SSD · ${nb.tahun}`
    };
  });

  return (
    <div>
      {/* Box Kajian Rumus Formal */}
      <div style={{ background: '#f8fafc', borderLeft: '4px solid #8b5cf6', padding: '12px 16px', borderRadius: '0 8px 8px 0', marginBottom: '20px' }}>
        <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '4px' }}>
          Formulasi Jarak Ruang Fitur (Euclidean Space)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', fontFamily: '"Cambria Math", "Times New Roman", serif', fontSize: '1.25rem', color: '#0f172a', background: 'white', padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <span style={{ fontStyle: 'italic', marginRight: '8px', fontWeight: 'bold' }}>d(x, y)</span>
            <span style={{ marginRight: '8px' }}>=</span>
            <span style={{ fontSize: '1.7rem', marginRight: '2px', fontWeight: 'normal', transform: 'translateY(1px)' }}>&radic;</span>
            <div style={{ borderTop: '1.5px solid #0f172a', paddingTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 4px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '600', marginBottom: '-4px' }}>n</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 'normal', lineHeight: '1' }}>&sum;</span>
                <span style={{ fontSize: '0.7rem', fontWeight: '600', marginTop: '0px' }}>i=1</span>
              </div>
              <span style={{ fontWeight: 'bold', fontStyle: 'italic' }}>(x<sub>i</sub> &minus; y<sub>i</sub>)<sup>2</sup></span>
            </div>
          </div>
          <div style={{ fontSize: '0.82rem', color: '#475569', maxWidth: '380px' }}>
            Konversi Kemiripan Persentase: 
            <code style={{ background: '#ede9fe', color: '#6d28d9', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px', fontWeight: 'bold' }}>
              S = 1 / (1 + d) &times; 100%
            </code>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {/* Bar Chart Euclidean Distance */}
        <div style={{ flex: 3 }}>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 8px 120px', fontWeight: '600' }}>
            Jarak Euclidean (Semakin pendek bar = semakin mirip)
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 100, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 600 }} tickLine={false} axisLine={false} width={95} />
              <Tooltip content={<DistanceTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="jarak" radius={[0, 4, 4, 0]} barSize={22} isAnimationActive animationDuration={800}>
                {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Side Panel: Kolom Kemiripan Persentase */}
        <div style={{ flex: 2, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', alignSelf: 'stretch', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: '700', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '8px', textAlign: 'center' }}>
            Skor Kemiripan ($S$)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', flex: 1 }}>
            {data.map((entry, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'white', background: entry.color, padding: '1px 5px', borderRadius: '3px', width: '18px', textAlign: 'center' }}>
                  K{i+1}
                </span>
                <div style={{ flex: 1, background: '#f1f5f9', height: '14px', borderRadius: '7px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: `${entry.similarity}%`, background: entry.color, height: '100%', borderRadius: '7px', opacity: 0.85 }} />
                  <span style={{ position: 'absolute', right: '6px', fontSize: '0.7rem', fontWeight: 'bold', color: entry.similarity > 50 ? '#ffffff' : '#334155', textShadow: entry.similarity > 50 ? '0 1px 2px rgba(0,0,0,0.6)' : 'none' }}>
                    {entry.similarity}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Tab 3: Distribusi Harga & Rumus Formal KNN Regressor ---
function PricePanel({ neighbors, hasilEstimasi, hargaBawah, hargaAtas }) {
  const prices = neighbors.map(n => n.harga);
  const allVals = [...prices, hasilEstimasi, hargaBawah, hargaAtas];
  const minVal = Math.min(...allVals) * 0.95;
  const maxVal = Math.max(...allVals) * 1.05;
  const pct = (v) => ((v - minVal) / (maxVal - minVal)) * 100;
  const fmt = (v) => `Rp ${(v / 1e6).toFixed(1)}Jt`;

  // Kalkulasi standar deviasi aktual dari K-neighbors untuk pamer nilai akademis
  const mean = neighbors.reduce((acc, curr) => acc + curr.harga, 0) / neighbors.length;
  const variance = neighbors.reduce((acc, curr) => acc + Math.pow(curr.harga - mean, 2), 0) / neighbors.length;
  const stdDev = Math.sqrt(variance);

  return (
    <div>
      {/* Header Rumus Akademis */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 18px', borderRadius: '8px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Fungsi Estimasi Regresi Seragam (Uniform KNN Aggregation)
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontFamily: '"Cambria Math", "Times New Roman", serif', fontSize: '1.4rem', color: '#15803d', fontWeight: 'bold', marginTop: '4px', background: 'white', padding: '6px 16px', borderRadius: '6px', border: '1px solid #dcfce7' }}>
            <span>y&#770; =</span>
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.95rem', lineHeight: '1.1' }}>
              <span>1</span>
              <span style={{ borderTop: '2px solid #15803d', width: '100%', textAlign: 'center' }}>K</span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', marginBottom: '-4px' }}>K</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 'normal', lineHeight: '1' }}>&sum;</span>
                <span style={{ fontSize: '0.7rem', marginTop: '0px' }}>i=1</span>
              </div>
              <span style={{ fontStyle: 'italic', fontSize: '1.2rem' }}>y<sub>i</sub></span>
            </div>
          </div>
        </div>
        <div style={{ fontSize: '0.82rem', color: '#166534', background: 'white', padding: '8px 12px', borderRadius: '6px', border: '1px solid #dcfce7', textAlign: 'right' }}>
          <div>Deviasi Standar (&sigma;): <strong>Rp {stdDev.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</strong></div>
          <div style={{ marginTop: '2px', fontSize: '0.75rem', color: '#15803d' }}>Batas Estimasi: y&#770; &plusmn; &sigma;</div>
        </div>
      </div>

      {/* Visualisasi Pita Distribusi Harga */}
      <div style={{ position: 'relative', height: '85px', margin: '0 15px 30px' }}>
        {/* Track Utama */}
        <div style={{ position: 'absolute', top: '35px', left: 0, right: 0, height: '6px', background: '#e2e8f0', borderRadius: '3px' }} />

        {/* Prediction range band */}
        <div style={{
          position: 'absolute', top: '27px', height: '22px', borderRadius: '11px',
          background: 'rgba(34,197,94,0.18)', border: '1px dashed #22c55e',
          left: `${pct(hargaBawah)}%`, width: `${pct(hargaAtas) - pct(hargaBawah)}%`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', boxSizing: 'border-box'
        }}>
          <span style={{ fontSize: '9px', color: '#166534', fontWeight: 'bold' }}>&minus;&sigma;</span>
          <span style={{ fontSize: '9px', color: '#166534', fontWeight: 'bold' }}>+&sigma;</span>
        </div>

        {/* Neighbor price dots */}
        {neighbors.map((nb, i) => (
          <div key={i} style={{ position: 'absolute', left: `${pct(nb.harga)}%`, top: '23px', transform: 'translateX(-50%)', zIndex: 10 }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%',
              background: COLORS[i % COLORS.length], border: '2px solid white',
              boxShadow: `0 2px 4px rgba(0,0,0,0.15)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '8px', fontWeight: 'bold'
            }}>K{i+1}</div>
            <div style={{ fontSize: '9px', color: COLORS[i % COLORS.length], fontWeight: '700', textAlign: 'center', marginTop: '3px', whiteSpace: 'nowrap' }}>
              {fmt(nb.harga)}
            </div>
          </div>
        ))}

        {/* Estimate Diamond Flag */}
        <div style={{ position: 'absolute', left: `${pct(hasilEstimasi)}%`, top: '12px', transform: 'translateX(-50%)', zIndex: 20 }}>
          <div style={{
            width: '26px', height: '26px', background: '#dc2626', border: '2px solid white',
            boxShadow: '0 2px 8px rgba(220,38,38,0.5)',
            transform: 'rotate(45deg)', margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ transform: 'rotate(-45deg)', color: 'white', fontSize: '9px', fontWeight: 'bold' }}>ŷ</span>
          </div>
          <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '800', textAlign: 'center', marginTop: '5px', whiteSpace: 'nowrap' }}>
            {fmt(hasilEstimasi)}
          </div>
        </div>

        {/* Batas Bawah / Atas Labels */}
        <div style={{ position: 'absolute', left: `${pct(hargaBawah)}%`, top: '55px', transform: 'translateX(-50%)', fontSize: '9px', color: '#15803d', fontWeight: '600', textAlign: 'center' }}>
          Bawah<br/>{fmt(hargaBawah)}
        </div>
        <div style={{ position: 'absolute', left: `${pct(hargaAtas)}%`, top: '55px', transform: 'translateX(-50%)', fontSize: '9px', color: '#15803d', fontWeight: '600', textAlign: 'center' }}>
          Atas<br/>{fmt(hargaAtas)}
        </div>

        {/* Skala Ujung */}
        <div style={{ position: 'absolute', left: 0, top: '45px', fontSize: '9px', color: '#94a3b8' }}>{fmt(minVal)}</div>
        <div style={{ position: 'absolute', right: 0, top: '45px', fontSize: '9px', color: '#94a3b8' }}>{fmt(maxVal)}</div>
      </div>

      {/* Rincian Tabel Kontribusi Akademis */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#334155' }}>
              <th style={{ padding: '8px 12px' }}>i</th>
              <th style={{ padding: '8px 12px' }}>Unit Tetangga Terdekat (x<sub>i</sub>)</th>
              <th style={{ padding: '8px 12px' }}>Harga Aktual (y<sub>i</sub>)</th>
              <th style={{ padding: '8px 12px' }}>Kemiripan (S<sub>i</sub>)</th>
              <th style={{ padding: '8px 12px' }}>Bobot Regresi (w<sub>i</sub> = 1/K)</th>
            </tr>
          </thead>
          <tbody>
            {neighbors.map((nb, i) => {
              const sim = ((1 / (1 + nb.jarak)) * 100).toFixed(1);
              const weightPct = (100 / neighbors.length).toFixed(1);
              return (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 'bold', color: COLORS[i%COLORS.length] }}>K{i+1}</td>
                  <td style={{ padding: '8px 12px', color: '#1e293b', fontWeight: '500' }}>{nb.merek} ({nb.ram}GB RAM / {nb.ssd}GB SSD / {nb.tahun})</td>
                  <td style={{ padding: '8px 12px', fontWeight: '600', color: '#0f172a' }}>Rp {nb.harga.toLocaleString('id-ID')}</td>
                  <td style={{ padding: '8px 12px', color: '#10b981', fontWeight: '600' }}>{sim}%</td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ background: '#e2e8f0', color: '#334155', padding: '1px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        1/{neighbors.length}
                      </span>
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>({weightPct}%)</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 'bold', color: '#0f172a' }}>
              <td colSpan="2" style={{ padding: '10px 12px', textAlign: 'right' }}>Agregasi Akhir (y&#770;):</td>
              <td style={{ padding: '10px 12px', color: '#dc2626', fontSize: '0.9rem' }}>Rp {hasilEstimasi.toLocaleString('id-ID')}</td>
              <td colSpan="2" style={{ padding: '10px 12px', color: '#166534', fontSize: '0.75rem', fontWeight: 'normal' }}>
                *Rata-rata seragam meminimalisir overfitting dari noise tetangga tunggal.
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// --- Tab 4: Radar Normalisasi Fitur Min-Max ---
function RadarPanel({ neighbors, queryData }) {
  const features = [
    { key: 'ram', label: 'Kapasitas RAM' },
    { key: 'ssd', label: 'Kapasitas SSD' },
    { key: 'tahun', label: 'Tahun Rilis' },
    { key: 'kondisi', label: 'Skor Kondisi' },
  ];

  // Rumus Min-Max Normalization 0-100%
  const normalize = (key, val) => {
    const allVals = [queryData[key], ...neighbors.map(n => n[key])];
    const lo = Math.min(...allVals), hi = Math.max(...allVals);
    return hi === lo ? 50 : ((val - lo) / (hi - lo)) * 100;
  };

  const radarData = features.map(f => {
    const row = { subject: f.label, Input: normalize(f.key, queryData[f.key]) };
    neighbors.forEach((nb, i) => { row[`K${i+1}`] = normalize(f.key, nb[f.key]); });
    return row;
  });

  return (
    <div>
      {/* Box Kajian Normalisasi */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', display: 'block' }}>METODE NORMALISASI RADAR</span>
          <code style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '0.85rem' }}>
            X<sub>norm</sub> = (X - X<sub>min</sub>) / (X<sub>max</sub> - X<sub>min</sub>) &times; 100
          </code>
        </div>
        <div style={{ fontSize: '0.78rem', color: '#475569', maxWidth: '300px' }}>
          Memetakan variabel dengan satuan berbeda (GB vs Tahun) ke dalam poligon seragam skala 0–100 untuk inspeksi visual bentuk fitur.
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#cbd5e1" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fontWeight: 600, fill: '#1e293b' }} />
          <PolarRadiusAxis angle={45} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} tickCount={5} />
          {neighbors.map((_, i) => (
            <Radar key={i} name={`K${i+1}`} dataKey={`K${i+1}`}
              stroke={COLORS[i%COLORS.length]} fill={COLORS[i%COLORS.length]} fillOpacity={0.06} strokeWidth={1.5} strokeDasharray="3 3" />
          ))}
          <Radar name="Input Uji (ŷ)" dataKey="Input"
            stroke="#dc2626" fill="#dc2626" fillOpacity={0.2} strokeWidth={2.5} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT EXPORT
// ==========================================
const TABS = [
  { id: 'scatter', label: '📍 Pemetaan Ruang Fitur' },
  { id: 'distance', label: '📏 Jarak & Kemiripan' },
  { id: 'price', label: '💰 Kalkulasi Estimasi' }
];

const X_OPTIONS = [
  { key: 'ram', label: 'RAM (GB)' },
  { key: 'ssd', label: 'SSD (GB)' },
  { key: 'tahun', label: 'Tahun Rilis' },
];

export default function KNNVisualization({ neighbors, queryData, hasilEstimasi, hargaBawah, hargaAtas }) {
  const [activeTab, setActiveTab] = useState('scatter');
  const [xKey, setXKey] = useState('ram');

  if (!neighbors || neighbors.length === 0) return null;

  const xLabel = X_OPTIONS.find(o => o.key === xKey)?.label || 'RAM (GB)';

  return (
    <div style={{ marginTop: '32px', background: 'white', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.08)', overflow: 'hidden', fontFamily: 'inherit' }}>
      {/* Header Premium Akademis */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '20px 24px', position: 'relative' }}>
        <div style={{ position: 'absolute', right: '24px', top: '20px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>
          MODEL: KNN REGRESSION
        </div>
        <h3 style={{ margin: 0, color: 'white', fontSize: '1.15rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🔬 Kajian Visual K-Nearest Neighbors (XAI)
        </h3>
        <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '0.85rem', maxWidth: '85%' }}>
          Menyajikan rasionalisasi prediksi harga dengan memetakan input uji ke dalam ruang fitur berdimensi tinggi terhadap <strong>{neighbors.length} tetangga terdekat</strong>.
        </p>
      </div>

      {/* Navigasi Tab Premium */}
      <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1', background: '#f8fafc', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '14px 20px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: activeTab === tab.id ? '700' : '600',
              color: activeTab === tab.id ? '#2563eb' : '#64748b',
              background: activeTab === tab.id ? 'white' : 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === tab.id ? '0 -2px 0 0 white inset' : 'none'
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Konten Panel */}
      <div style={{ padding: '24px' }}>
        {activeTab === 'scatter' && (
          <>
            {/* Kontrol Sumbu Proyeksi */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: '700' }}>Proyeksi Sumbu X:</span>
              {X_OPTIONS.map(opt => (
                <button key={opt.key} onClick={() => setXKey(opt.key)}
                  style={{
                    padding: '6px 14px', borderRadius: '6px', border: '1px solid', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: xKey === opt.key ? '700' : '500',
                    background: xKey === opt.key ? '#eff6ff' : 'white',
                    color: xKey === opt.key ? '#2563eb' : '#475569',
                    borderColor: xKey === opt.key ? '#bfdbfe' : '#cbd5e1',
                    transition: 'all 0.15s'
                  }}>
                  {opt.label}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                *Sumbu Y merepresentasikan target harga jual
              </span>
            </div>

            {/* Legenda Titik */}
            <div style={{ display: 'flex', gap: '14px', marginBottom: '14px', flexWrap: 'wrap', padding: '8px 12px', background: '#f1f5f9', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 'bold', color: '#dc2626' }}>
                <div style={{ width: '12px', height: '12px', background: '#dc2626', transform: 'rotate(45deg)' }} />
                Input Uji (ŷ)
              </div>
              {neighbors.map((nb, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#334155' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[i%COLORS.length] }} />
                  <strong>K{i+1}:</strong> {nb.merek}
                </div>
              ))}
            </div>

            <ScatterPanel neighbors={neighbors} queryData={queryData}
              hasilEstimasi={hasilEstimasi} xKey={xKey} xLabel={xLabel} />
          </>
        )}

        {activeTab === 'distance' && <DistancePanel neighbors={neighbors} />}

        {activeTab === 'price' && (
          <PricePanel neighbors={neighbors} hasilEstimasi={hasilEstimasi}
            hargaBawah={hargaBawah} hargaAtas={hargaAtas} />
        )}
      </div>
    </div>
  );
}
