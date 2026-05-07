import React, { useState, useEffect } from 'react';
import api from '../api';
import { BarChart3, TrendingUp, Laptop, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// Skeleton stat card (#6)
const SkeletonCard = () => (
  <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px' }}>
    <div style={{ width: '54px', height: '54px', borderRadius: '10px', background: '#e2e8f0' }} />
    <div style={{ flex: 1 }}>
      <div style={{ height: '12px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '8px', width: '60%' }} />
      <div style={{ height: '24px', background: '#e2e8f0', borderRadius: '4px', width: '80%' }} />
    </div>
  </div>
);

// Year/month filter bar (#9)
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [String(CURRENT_YEAR - 1), String(CURRENT_YEAR)];

export default function BossDashboard() {
  const [allData, setAllData] = useState([]);
  const [stats, setStats] = useState({ totalSales: 0, totalUnits: 0, totalRevenue: 0, averagePrice: 0 });
  const [chartData, setChartData] = useState([]);
  const [brandData, setBrandData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter state (#9)
  const [filterYear, setFilterYear] = useState(String(CURRENT_YEAR));

  useEffect(() => {
    const fetchPenjualan = async () => {
      try {
        const response = await api.get('/api/penjualan');
        setAllData(response.data.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPenjualan();
  }, []);

  // Recompute stats when filter changes (#9)
  useEffect(() => {
    let data = allData;
    if (filterYear) {
      data = data.filter(o => String(new Date(o.tanggal_jual).getFullYear()) === filterYear);
    }

    let totalUnits = 0;
    let totalRevenue = 0;
    const monthlyDataMap = {};
    const brandDataMap = {};

    data.forEach(order => {
      totalRevenue += order.harga_total;
      const date = new Date(order.tanggal_jual);
      const monthKey = date.toLocaleString('id-ID', { month: 'short' });
      const monthNum = date.getMonth();
      if (!monthlyDataMap[monthNum]) {
        monthlyDataMap[monthNum] = { name: monthKey, revenue: 0, monthNum };
      }
      monthlyDataMap[monthNum].revenue += order.harga_total;

      order.items?.forEach(item => {
        totalUnits += item.qty;
        if (!brandDataMap[item.merek]) {
          brandDataMap[item.merek] = { name: item.merek, value: 0 };
        }
        brandDataMap[item.merek].value += item.qty;
      });
    });

    const sortedChartData = Object.values(monthlyDataMap).sort((a, b) => a.monthNum - b.monthNum);
    const sortedBrandData = Object.values(brandDataMap).sort((a, b) => b.value - a.value);

    setChartData(sortedChartData);
    setBrandData(sortedBrandData);
    setStats({
      totalSales: data.length,
      totalUnits,
      totalRevenue,
      averagePrice: totalUnits > 0 ? Math.round(totalRevenue / totalUnits) : 0
    });
  }, [allData, filterYear]);

  const cardStyle = { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px' };

  return (
    <div>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUp size={28} color="#2563eb" /> Dashboard Owner
          </h2>
          <p style={{ margin: 0, color: '#64748b' }}>Ringkasan performa penjualan bisnis laptop Anda</p>
        </div>

        {/* Year filter (#9) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>Tahun:</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setFilterYear('')}
              style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: filterYear === '' ? '#2563eb' : 'white', color: filterYear === '' ? 'white' : '#475569', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
              Semua
            </button>
            {YEARS.map(y => (
              <button key={y}
                onClick={() => setFilterYear(y)}
                style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: filterYear === y ? '#2563eb' : 'white', color: filterYear === y ? 'white' : '#475569', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {loading ? (
          [1, 2, 3].map(i => <SkeletonCard key={i} />)
        ) : (
          <>
            <div style={cardStyle}>
              <div style={{ backgroundColor: '#eff6ff', padding: '15px', borderRadius: '10px' }}>
                <BarChart3 size={24} color="#3b82f6" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>Total Transaksi</p>
                <h3 style={{ margin: '5px 0 0', fontSize: '1.5rem', color: '#0f172a' }}>{stats.totalSales} <span style={{fontSize:'0.9rem', fontWeight:'normal', color:'#94a3b8'}}>Nota</span></h3>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ backgroundColor: '#f0fdf4', padding: '15px', borderRadius: '10px' }}>
                <Laptop size={24} color="#16a34a" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>Unit Terjual</p>
                <h3 style={{ margin: '5px 0 0', fontSize: '1.5rem', color: '#0f172a' }}>{stats.totalUnits} <span style={{fontSize:'0.9rem', fontWeight:'normal', color:'#94a3b8'}}>Laptop</span></h3>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ backgroundColor: '#fffbeb', padding: '15px', borderRadius: '10px' }}>
                <DollarSign size={24} color="#d97706" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>Total Pendapatan</p>
                <h3 style={{ margin: '5px 0 0', fontSize: '1.3rem', color: '#0f172a' }}>Rp {stats.totalRevenue.toLocaleString('id-ID')}</h3>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a' }}>
            Grafik Pendapatan Bulanan {filterYear && `(${filterYear})`}
          </h3>
          {loading ? (
            <div style={{ height: '350px', background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)', backgroundSize: '200% 100%', borderRadius: '8px', animation: 'shimmer 1.5s infinite' }} />
          ) : (
            <div style={{ height: '350px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                  <YAxis tickFormatter={(v) => `Rp ${(v / 1000000).toFixed(0)}M`} axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <RechartsTooltip formatter={(v) => [`Rp ${v.toLocaleString('id-ID')}`, 'Pendapatan']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a' }}>Distribusi Penjualan Merek</h3>
          {loading ? (
            <div style={{ height: '350px', background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)', backgroundSize: '200% 100%', borderRadius: '8px', animation: 'shimmer 1.5s infinite' }} />
          ) : (
            <div style={{ height: '350px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={brandData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {brandData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip formatter={(v) => [`${v} Unit`, 'Terjual']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
        <p style={{ color: '#475569', margin: 0 }}>Gunakan tab <strong>Data Penjualan</strong> untuk melihat rincian riwayat semua transaksi.</p>
      </div>
    </div>
  );
}
