import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, TrendingUp, Laptop, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function BossDashboard() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalUnits: 0,
    totalRevenue: 0,
    averagePrice: 0
  });
  const [chartData, setChartData] = useState([]);
  const [brandData, setBrandData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPenjualan = async () => {
      try {
        const response = await axios.get('http://localhost:8080/api/penjualan');
        const data = response.data.data || [];
        
        let totalUnits = 0;
        let totalRevenue = 0;
        const monthlyDataMap = {};
        const brandDataMap = {};
        
        data.forEach(order => {
          totalRevenue += order.harga_total;
          
          const date = new Date(order.tanggal_jual);
          const monthYear = date.toLocaleString('id-ID', { month: 'short', year: 'numeric' });
          if (!monthlyDataMap[monthYear]) {
            monthlyDataMap[monthYear] = { name: monthYear, revenue: 0, dateObj: date };
          }
          monthlyDataMap[monthYear].revenue += order.harga_total;

          order.items?.forEach(item => {
            totalUnits += item.qty;
            
            if (!brandDataMap[item.merek]) {
              brandDataMap[item.merek] = { name: item.merek, value: 0 };
            }
            brandDataMap[item.merek].value += item.qty;
          });
        });

        // Convert map to sorted array
        const sortedChartData = Object.values(monthlyDataMap).sort((a, b) => a.dateObj - b.dateObj);
        const sortedBrandData = Object.values(brandDataMap).sort((a, b) => b.value - a.value);

        setChartData(sortedChartData);
        setBrandData(sortedBrandData);
        setStats({
          totalSales: data.length,
          totalUnits: totalUnits,
          totalRevenue: totalRevenue,
          averagePrice: totalUnits > 0 ? Math.round(totalRevenue / totalUnits) : 0
        });

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPenjualan();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Memuat statistik...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TrendingUp size={28} color="#2563eb" /> Dashboard Owner
        </h2>
        <p style={{ margin: 0, color: '#64748b' }}>Ringkasan performa penjualan bisnis laptop Anda</p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '20px',
        marginBottom: '40px' 
      }}>
        {/* Card 1 */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: '#eff6ff', padding: '15px', borderRadius: '10px' }}>
            <BarChart3 size={24} color="#3b82f6" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>Total Transaksi</p>
            <h3 style={{ margin: '5px 0 0', fontSize: '1.5rem', color: '#0f172a' }}>{stats.totalSales} <span style={{fontSize:'0.9rem', fontWeight:'normal', color:'#94a3b8'}}>Nota</span></h3>
          </div>
        </div>

        {/* Card 2 */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: '#f0fdf4', padding: '15px', borderRadius: '10px' }}>
            <Laptop size={24} color="#16a34a" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>Unit Terjual</p>
            <h3 style={{ margin: '5px 0 0', fontSize: '1.5rem', color: '#0f172a' }}>{stats.totalUnits} <span style={{fontSize:'0.9rem', fontWeight:'normal', color:'#94a3b8'}}>Laptop</span></h3>
          </div>
        </div>

        {/* Card 3 */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: '#fffbeb', padding: '15px', borderRadius: '10px' }}>
            <DollarSign size={24} color="#d97706" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>Total Pendapatan</p>
            <h3 style={{ margin: '5px 0 0', fontSize: '1.3rem', color: '#0f172a' }}>Rp {stats.totalRevenue.toLocaleString('id-ID')}</h3>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a' }}>Grafik Pendapatan Bulanan</h3>
          <div style={{ height: '350px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                <YAxis 
                  tickFormatter={(value) => `Rp ${(value / 1000000).toFixed(0)}M`} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b'}}
                />
                <RechartsTooltip 
                  formatter={(value) => [`Rp ${value.toLocaleString('id-ID')}`, 'Pendapatan']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a' }}>Distribusi Penjualan Merek</h3>
          <div style={{ height: '350px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={brandData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {brandData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value) => [`${value} Unit`, 'Terjual']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
        <p style={{ color: '#475569', margin: 0 }}>Gunakan tab <strong>Data Penjualan</strong> untuk melihat rincian riwayat semua transaksi.</p>
      </div>

    </div>
  );
}
