import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, TrendingUp, Laptop, DollarSign } from 'lucide-react';

export default function BossDashboard() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalUnits: 0,
    totalRevenue: 0,
    averagePrice: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPenjualan = async () => {
      try {
        const response = await axios.get('http://localhost:8080/api/penjualan');
        const data = response.data.data || [];
        
        let totalUnits = 0;
        let totalRevenue = 0;
        
        data.forEach(order => {
          totalRevenue += order.harga_total;
          order.items?.forEach(item => {
            totalUnits += item.qty;
          });
        });

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
      
      <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
        <p style={{ color: '#475569', margin: 0 }}>Gunakan tab <strong>Data Penjualan</strong> untuk melihat rincian riwayat semua transaksi.</p>
      </div>

    </div>
  );
}
