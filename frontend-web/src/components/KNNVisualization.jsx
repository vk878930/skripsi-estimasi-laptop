import React, { useState } from 'react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
const W = 520, H = 300, PAD = { t: 25, r: 40, b: 55, l: 80 };
const PW = W - PAD.l - PAD.r, PH = H - PAD.t - PAD.b;

function makeScale(values) {
  const lo = Math.min(...values), hi = Math.max(...values);
  const range = hi - lo || 1;
  const min = lo - range * 0.18, max = hi + range * 0.18;
  return {
    min, max,
    px: (v, isX) => isX
      ? PAD.l + ((v - min) / (max - min)) * PW
      : PAD.t + PH - ((v - min) / (max - min)) * PH,
    ticks: (n) => Array.from({ length: n }, (_, i) => min + (max - min) * i / (n - 1))
  };
}

function StarShape({ cx, cy, r = 11, color }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.42;
    return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
  }).join(' ');
  return <polygon points={pts} fill={color} stroke="white" strokeWidth="2"
    style={{ filter: `drop-shadow(0 0 5px ${color}99)` }} />;
}

// --- Tab 1: Scatter Plot ---
function ScatterPanel({ neighbors, queryData, hasilEstimasi, xKey, xLabel }) {
  const qx = queryData[xKey];
  const allX = [qx, ...neighbors.map(n => n[xKey])];
  const allY = [hasilEstimasi, ...neighbors.map(n => n.harga)];
  const xs = makeScale(allX), ys = makeScale(allY);

  const QPX = xs.px(qx, true), QPY = ys.px(hasilEstimasi, false);
  const xTicks = xs.ticks(5), yTicks = ys.ticks(5);

  const formatY = (v) => `Rp ${(v / 1e6).toFixed(1)}M`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <style>{`
        @keyframes drawLine { from { stroke-dashoffset: 800 } to { stroke-dashoffset: 0 } }
        @keyframes popDot { from { opacity:0; transform:scale(0) } to { opacity:1; transform:scale(1) } }
        @keyframes pulseRing { 0%,100% { r:14; opacity:.3 } 50% { r:20; opacity:.6 } }
      `}</style>

      {/* Background */}
      <rect x={PAD.l} y={PAD.t} width={PW} height={PH} fill="#f8fafc" rx="6" />

      {/* Grid */}
      {xTicks.map((v, i) => <line key={`xg${i}`} x1={xs.px(v,true)} y1={PAD.t} x2={xs.px(v,true)} y2={PAD.t+PH} stroke="#e2e8f0" strokeWidth="1" />)}
      {yTicks.map((v, i) => <line key={`yg${i}`} x1={PAD.l} y1={ys.px(v,false)} x2={PAD.l+PW} y2={ys.px(v,false)} stroke="#e2e8f0" strokeWidth="1" />)}

      {/* Axes */}
      <line x1={PAD.l} y1={PAD.t+PH} x2={PAD.l+PW} y2={PAD.t+PH} stroke="#94a3b8" strokeWidth="1.5" />
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t+PH} stroke="#94a3b8" strokeWidth="1.5" />

      {/* X ticks */}
      {xTicks.map((v, i) => (
        <text key={`xt${i}`} x={xs.px(v,true)} y={PAD.t+PH+16} textAnchor="middle" fontSize="11" fill="#64748b">
          {xKey === 'tahun' ? Math.round(v) : Math.round(v)}
        </text>
      ))}
      <text x={PAD.l+PW/2} y={H-4} textAnchor="middle" fontSize="12" fontWeight="600" fill="#475569">{xLabel}</text>

      {/* Y ticks */}
      {yTicks.map((v, i) => (
        <text key={`yt${i}`} x={PAD.l-8} y={ys.px(v,false)+4} textAnchor="end" fontSize="10" fill="#64748b">
          {formatY(v)}
        </text>
      ))}
      <text x={16} y={PAD.t+PH/2} textAnchor="middle" fontSize="12" fontWeight="600" fill="#475569"
        transform={`rotate(-90, 16, ${PAD.t+PH/2})`}>Harga</text>

      {/* Animated lines from query to each neighbor */}
      {neighbors.map((nb, i) => {
        const nx = xs.px(nb[xKey], true), ny = ys.px(nb.harga, false);
        const len = Math.hypot(nx - QPX, ny - QPY);
        return (
          <line key={`line${i}`} x1={QPX} y1={QPY} x2={nx} y2={ny}
            stroke={COLORS[i % COLORS.length]} strokeWidth="2" opacity="0.5"
            strokeDasharray={len} strokeDashoffset={0}
            style={{ animation: `drawLine 0.7s ease ${i * 0.2}s both` }} />
        );
      })}

      {/* Neighbor circles */}
      {neighbors.map((nb, i) => {
        const nx = xs.px(nb[xKey], true), ny = ys.px(nb.harga, false);
        return (
          <g key={`nb${i}`} style={{ animation: `popDot 0.4s ease ${i * 0.2 + 0.6}s both`, transformOrigin: `${nx}px ${ny}px` }}>
            <circle cx={nx} cy={ny} r={9} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth="2" />
            <text x={nx} y={ny+4} textAnchor="middle" fontSize="9" fontWeight="bold" fill="white">K{i+1}</text>
            {/* Price label */}
            <text x={nx} y={ny-14} textAnchor="middle" fontSize="9" fill={COLORS[i%COLORS.length]} fontWeight="600">
              {formatY(nb.harga)}
            </text>
          </g>
        );
      })}

      {/* Pulsing ring around query */}
      <circle cx={QPX} cy={QPY} fill="none" stroke="#dc2626" strokeWidth="1.5"
        style={{ animation: 'pulseRing 1.8s ease-in-out infinite' }} />

      {/* Query star */}
      <g style={{ animation: 'popDot 0.5s ease 0.1s both', transformOrigin: `${QPX}px ${QPY}px` }}>
        <StarShape cx={QPX} cy={QPY} r={12} color="#dc2626" />
        <text x={QPX} y={QPY - 18} textAnchor="middle" fontSize="10" fontWeight="700" fill="#dc2626">Input Anda</text>
      </g>
    </svg>
  );
}

// --- Tab 2: Distance Ranking ---
function DistancePanel({ neighbors }) {
  const data = neighbors.map((nb, i) => ({
    name: `K${i+1}: ${nb.merek}`,
    jarak: parseFloat(nb.jarak.toFixed(4)),
    color: COLORS[i % COLORS.length],
    harga: nb.harga,
    spec: `${nb.ram}GB RAM · ${nb.ssd}GB SSD · ${nb.tahun}`
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}>
        <p style={{ margin: '0 0 4px', fontWeight: '700', color: '#0f172a' }}>{d.name}</p>
        <p style={{ margin: '0 0 2px', color: '#64748b' }}>{d.spec}</p>
        <p style={{ margin: '0 0 2px', color: '#0f172a' }}>Harga: <b>Rp {d.harga.toLocaleString('id-ID')}</b></p>
        <p style={{ margin: 0, color: '#ef4444' }}>Jarak: <b>{d.jarak}</b></p>
      </div>
    );
  };

  return (
    <div>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
        Jarak Euclidean menunjukkan seberapa &quot;mirip&quot; setiap laptop dengan input Anda. <strong>Semakin pendek bar = semakin mirip.</strong>
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 60, left: 120, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#1e293b', fontWeight: 600 }} tickLine={false} axisLine={false} width={115} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
          <Bar dataKey="jarak" radius={[0, 6, 6, 0]} barSize={28} isAnimationActive animationDuration={800}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- Tab 3: Price Distribution ---
function PricePanel({ neighbors, hasilEstimasi, hargaBawah, hargaAtas }) {
  const prices = neighbors.map(n => n.harga);
  const allVals = [...prices, hasilEstimasi, hargaBawah, hargaAtas];
  const minVal = Math.min(...allVals) * 0.95;
  const maxVal = Math.max(...allVals) * 1.05;
  const pct = (v) => ((v - minVal) / (maxVal - minVal)) * 100;
  const fmt = (v) => `Rp ${(v / 1e6).toFixed(1)}M`;

  return (
    <div>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '24px' }}>
        Visualisasi distribusi harga K-tetangga terdekat dan hasil prediksi akhir (rata-rata tertimbang berdasarkan jarak).
      </p>

      {/* Price strip */}
      <div style={{ position: 'relative', height: '80px', margin: '0 20px 40px' }}>
        {/* Track */}
        <div style={{ position: 'absolute', top: '32px', left: 0, right: 0, height: '8px', background: '#e2e8f0', borderRadius: '4px' }} />

        {/* Prediction range band */}
        <div style={{
          position: 'absolute', top: '28px', height: '16px', borderRadius: '8px',
          background: 'rgba(34,197,94,0.25)', border: '2px solid #22c55e',
          left: `${pct(hargaBawah)}%`, width: `${pct(hargaAtas) - pct(hargaBawah)}%`
        }} />

        {/* Neighbor price dots */}
        {neighbors.map((nb, i) => (
          <div key={i} style={{ position: 'absolute', left: `${pct(nb.harga)}%`, top: '20px', transform: 'translateX(-50%)' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: COLORS[i % COLORS.length], border: '2px solid white',
              boxShadow: `0 0 0 2px ${COLORS[i % COLORS.length]}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '9px', fontWeight: 'bold'
            }}>K{i+1}</div>
            <div style={{ fontSize: '10px', color: COLORS[i % COLORS.length], fontWeight: '600', textAlign: 'center', marginTop: '4px', whiteSpace: 'nowrap' }}>
              {fmt(nb.harga)}
            </div>
          </div>
        ))}

        {/* Estimate diamond */}
        <div style={{ position: 'absolute', left: `${pct(hasilEstimasi)}%`, top: '14px', transform: 'translateX(-50%)' }}>
          <div style={{
            width: '30px', height: '30px', background: '#dc2626', border: '3px solid white',
            boxShadow: '0 0 0 2px #dc2626, 0 4px 12px rgba(220,38,38,0.4)',
            transform: 'rotate(45deg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }} />
          <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '700', textAlign: 'center', marginTop: '10px', whiteSpace: 'nowrap' }}>
            {fmt(hasilEstimasi)}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', whiteSpace: 'nowrap' }}>Estimasi</div>
        </div>

        {/* Min/max labels */}
        <div style={{ position: 'absolute', left: 0, top: '50px', fontSize: '10px', color: '#94a3b8' }}>{fmt(minVal)}</div>
        <div style={{ position: 'absolute', right: 0, top: '50px', fontSize: '10px', color: '#94a3b8', transform: 'translateX(100%)' }}>{fmt(maxVal)}</div>
      </div>

      {/* Range label */}
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 16px', textAlign: 'center', fontSize: '0.9rem', color: '#166534' }}>
        Rentang Prediksi: <strong>{fmt(hargaBawah)}</strong> — <strong>{fmt(hargaAtas)}</strong>
        &nbsp;·&nbsp; Nilai Tengah: <strong>{fmt(hasilEstimasi)}</strong>
      </div>

      {/* Neighbor table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', fontSize: '0.83rem' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            {['Tetangga', 'Spesifikasi', 'Jarak', 'Harga', 'Kontribusi'].map(h => (
              <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {neighbors.map((nb, i) => {
            const weight = (1 / (nb.jarak + 1e-9));
            const totalWeight = neighbors.reduce((s, n) => s + 1 / (n.jarak + 1e-9), 0);
            const contrib = (weight / totalWeight * 100).toFixed(1);
            return (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{ background: COLORS[i%COLORS.length], color:'white', borderRadius:'4px', padding:'2px 7px', fontWeight:'700', fontSize:'11px' }}>K{i+1}</span>
                </td>
                <td style={{ padding: '8px 10px', color: '#334155' }}>{nb.merek} · {nb.ram}GB · {nb.ssd}GB · {nb.tahun}</td>
                <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#ef4444', fontWeight: '600' }}>{nb.jarak.toFixed(4)}</td>
                <td style={{ padding: '8px 10px', fontWeight: '600', color: '#0f172a' }}>Rp {nb.harga.toLocaleString('id-ID')}</td>
                <td style={{ padding: '8px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${contrib}%`, height: '100%', background: COLORS[i%COLORS.length], borderRadius: '3px', transition: 'width 0.8s ease' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b', width: '36px' }}>{contrib}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// --- Tab 4: Radar Feature Comparison ---
function RadarPanel({ neighbors, queryData }) {
  const features = [
    { key: 'ram', label: 'RAM' },
    { key: 'ssd', label: 'SSD' },
    { key: 'tahun', label: 'Tahun' },
    { key: 'kondisi', label: 'Kondisi' },
  ];

  // Normalize each feature 0-100
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
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px' }}>
        Perbandingan fitur (RAM, SSD, Tahun, Kondisi) antara input Anda dan K-tetangga terdekat. Nilai dinormalisasi 0–100.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 13, fontWeight: 600, fill: '#334155' }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickCount={4} />
          {neighbors.map((_, i) => (
            <Radar key={i} name={`K${i+1}`} dataKey={`K${i+1}`}
              stroke={COLORS[i%COLORS.length]} fill={COLORS[i%COLORS.length]} fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 2" />
          ))}
          <Radar name="Input Anda" dataKey="Input"
            stroke="#dc2626" fill="#dc2626" fillOpacity={0.18} strokeWidth={2.5} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================
const TABS = [
  { id: 'scatter', label: '📍 Peta Scatter' },
  { id: 'distance', label: '📏 Jarak Euclidean' },
  { id: 'price', label: '💰 Distribusi Harga' },
  { id: 'radar', label: '🕸️ Radar Fitur' },
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
    <div style={{ marginTop: '28px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', padding: '18px 24px' }}>
        <h3 style={{ margin: 0, color: 'white', fontSize: '1.05rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🔬 Visualisasi K-Nearest Neighbors
        </h3>
        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.82rem' }}>
          {neighbors.length} tetangga terdekat ditemukan dari {neighbors.length * 2}+ data historis penjualan
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 18px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: activeTab === tab.id ? '700' : '500',
              color: activeTab === tab.id ? '#2563eb' : '#64748b',
              background: 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
              transition: 'all 0.15s',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div style={{ padding: '20px 24px' }}>
        {activeTab === 'scatter' && (
          <>
            {/* Axis selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600' }}>Sumbu X:</span>
              {X_OPTIONS.map(opt => (
                <button key={opt.key} onClick={() => setXKey(opt.key)}
                  style={{
                    padding: '5px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: xKey === opt.key ? '700' : '400',
                    background: xKey === opt.key ? '#eff6ff' : 'white',
                    color: xKey === opt.key ? '#2563eb' : '#475569',
                    borderColor: xKey === opt.key ? '#bfdbfe' : '#e2e8f0',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#475569' }}>
                <div style={{ width: '14px', height: '14px', background: '#dc2626', transform: 'rotate(45deg)', borderRadius: '2px' }} />
                Input Anda (estimasi)
              </div>
              {neighbors.map((nb, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#475569' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: COLORS[i%COLORS.length] }} />
                  K{i+1}: {nb.merek}
                </div>
              ))}
            </div>

            <ScatterPanel neighbors={neighbors} queryData={queryData}
              hasilEstimasi={hasilEstimasi} xKey={xKey} xLabel={xLabel} />

            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '8px', textAlign: 'center' }}>
              Garis putus-putus menunjukkan jarak Euclidean dari input ke setiap tetangga terdekat. Posisi Y = Harga jual.
            </p>
          </>
        )}

        {activeTab === 'distance' && <DistancePanel neighbors={neighbors} />}

        {activeTab === 'price' && (
          <PricePanel neighbors={neighbors} hasilEstimasi={hasilEstimasi}
            hargaBawah={hargaBawah} hargaAtas={hargaAtas} />
        )}

        {activeTab === 'radar' && <RadarPanel neighbors={neighbors} queryData={queryData} />}
      </div>
    </div>
  );
}
