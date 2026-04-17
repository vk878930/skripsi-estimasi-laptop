import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Printer, FileText, Filter } from 'lucide-react';

export default function LaporanDashboard() {
  const [activeTab, setActiveTab] = useState('penjualan'); // 'penjualan' | 'estimasi'
  const [penjualanData, setPenjualanData] = useState([]);
  const [estimasiData, setEstimasiData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Set default month and year
  useEffect(() => {
    const date = new Date();
    setSelectedMonth((date.getMonth() + 1).toString().padStart(2, '0'));
    setSelectedYear(date.getFullYear().toString());
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resPenjualan, resEstimasi] = await Promise.all([
        axios.get('http://localhost:8080/api/penjualan'),
        axios.get('http://localhost:8080/api/estimasi/riwayat')
      ]);
      setPenjualanData(resPenjualan.data.data || []);
      setEstimasiData(resEstimasi.data.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  // Filter Penjualan Data based on Month/Year
  const filteredPenjualan = penjualanData.filter(item => {
    if (!selectedMonth || !selectedYear) return true;
    const date = new Date(item.tanggal_jual);
    return (date.getMonth() + 1).toString().padStart(2, '0') === selectedMonth && 
           date.getFullYear().toString() === selectedYear;
  });

  const getMonthName = (monthStr) => {
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return months[parseInt(monthStr) - 1] || "";
  };

  const today = new Date();
  const dateString = `${today.getDate()} ${getMonthName(today.getMonth() + 1)} ${today.getFullYear()}`;

  const getKondisiText = (angka) => {
    switch(angka) {
      case 4: return "Mulus";
      case 3: return "Lecet Pemakaian Only";
      case 2: return "Minus Minor";
      case 1: return "Minus Mayor";
      default: return "-";
    }
  }

  return (
    <div className="laporan-container">
      {/* --- NON-PRINTABLE CONTROLS --- */}
      <div className="no-print" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={28} color="#2563eb" /> Modul Laporan
          </h2>
          <button 
            onClick={handlePrint}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 'bold'
            }}
          >
            <Printer size={20} /> Cetak Laporan
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            onClick={() => setActiveTab('penjualan')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'penjualan' ? '#e2e8f0' : 'white',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: activeTab === 'penjualan' ? 'bold' : 'normal'
            }}
          >
            Laporan Penjualan
          </button>
          <button 
            onClick={() => setActiveTab('estimasi')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'estimasi' ? '#e2e8f0' : 'white',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: activeTab === 'estimasi' ? 'bold' : 'normal'
            }}
          >
            Laporan Estimasi Harga
          </button>
        </div>

        {/* Filters for Penjualan */}
        {activeTab === 'penjualan' && (
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', backgroundColor: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <Filter size={20} color="#64748b" />
            <span style={{ fontWeight: '500', color: '#475569' }}>Filter Bulan:</span>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            >
              <option value="">Semua Bulan</option>
              <option value="01">Januari</option>
              <option value="02">Februari</option>
              <option value="03">Maret</option>
              <option value="04">April</option>
              <option value="05">Mei</option>
              <option value="06">Juni</option>
              <option value="07">Juli</option>
              <option value="08">Agustus</option>
              <option value="09">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
            </select>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            >
              <option value="">Semua Tahun</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>Memuat data laporan...</div>
      ) : (
        /* --- PRINTABLE REPORT AREA --- */
        <div className="printable-report" style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '30px', marginBottom: '20px', position: 'relative' }}>
            {/* Logo placeholder - User should put logo.png in public folder */}
            <div style={{ position: 'absolute', left: 0, top: '-20px' }}>
              <img src="/logo.png" alt="Logo Gudang Laptop" style={{ height: '140px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ margin: 0, fontSize: '24px', color: '#000' }}>GUDANG LAPTOP</h1>
              <p style={{ margin: '5px 0', fontSize: '14px', color: '#000' }}>
                Jalan Raya Harco Mangga 2 Plaza Blok AD-23<br/>
                Telp: +62 852-6576-8058<br/>
                Email: gudangbatam188@gmail.com
              </p>
            </div>
          </div>
          
          <hr style={{ border: 'none', borderTop: '2px solid #000', marginBottom: '20px' }} />

          {/* Report Title */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#000' }}>
              {activeTab === 'penjualan' 
                ? `Laporan Penjualan ${selectedMonth ? `Bulan ${getMonthName(selectedMonth)} ${selectedYear}` : ''}`
                : 'Laporan Riwayat Estimasi Harga'}
            </h2>
          </div>

          {/* Table */}
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px', fontSize: '12px', color: '#000' }}>
              <thead>
                {activeTab === 'penjualan' ? (
                  <tr>
                    <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f8fafc' }}>No</th>
                    <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f8fafc' }}>Order ID</th>
                    <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f8fafc' }}>Tanggal</th>
                    <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f8fafc' }}>Pembeli</th>
                    <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f8fafc' }}>Total Item</th>
                    <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f8fafc' }}>Total Harga</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f8fafc' }}>No</th>
                    <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f8fafc' }}>Tanggal</th>
                    <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f8fafc' }}>Spesifikasi</th>
                    <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f8fafc' }}>Kondisi</th>
                    <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f8fafc' }}>Harga Estimasi</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {activeTab === 'penjualan' ? (
                  filteredPenjualan.length > 0 ? (
                    filteredPenjualan.map((item, index) => (
                      <tr key={item.id}>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{item.order_id}</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{new Date(item.tanggal_jual).toLocaleDateString('id-ID')}</td>
                        <td style={{ border: '1px solid #000', padding: '8px' }}>{item.nama_pembeli}</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                          {item.items?.reduce((sum, i) => sum + i.qty, 0) || 0} Unit
                        </td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                          Rp {item.harga_total?.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="6" style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>Tidak ada data penjualan</td></tr>
                  )
                ) : (
                  estimasiData.length > 0 ? (
                    estimasiData.map((item, index) => (
                      <tr key={item.id}>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{new Date(item.created_at).toLocaleDateString('id-ID')}</td>
                        <td style={{ border: '1px solid #000', padding: '8px' }}>
                          {item.merek} - {item.processor}, RAM: {item.ram}GB, SSD: {item.ssd}GB, Tahun: {item.tahun}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                          {getKondisiText(item.kondisi)}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                          Rp {item.harga?.toLocaleString('id-ID') || 0}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5" style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>Tidak ada riwayat estimasi</td></tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Signature */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '40px' }}>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <p style={{ margin: '0 0 70px 0', color: '#000' }}>Jakarta, {dateString}</p>
              <p style={{ margin: 0, fontWeight: 'bold', color: '#000' }}>Wisman Zhang</p>
              <p style={{ margin: 0, color: '#000' }}>Pemilik / Owner</p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
