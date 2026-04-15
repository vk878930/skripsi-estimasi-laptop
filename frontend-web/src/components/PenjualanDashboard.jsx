import React, { useState, useEffect } from 'react'
import axios from 'axios'
import AddTransaksiModal from './AddTransaksiModal';

export default function PenjualanDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [daftarPenjualan, setDaftarPenjualan] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  const fetchPenjualan = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/penjualan')
      setDaftarPenjualan(response.data.data || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Fungsi untuk mengubah format tanggal jadi DD-MM-YYYY
  const formatTanggal = (tanggalISO) => {
    const date = new Date(tanggalISO);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Bulan dimulai dari 0
    const year = date.getFullYear();
    return `${day}-${month}-${year}`; // Menggabungkan dengan strip
  };

  const handleImportExcel = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    await axios.post('http://localhost:8080/api/penjualan/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    alert("Import Berhasil!");
    fetchPenjualan(); // Refresh data tabel
  } catch (error) {
    alert("Gagal Import: " + error.message);
  }
};

  useEffect(() => {
    fetchPenjualan()
  }, [])

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div style={{ width: '100%' }}>
      <div className="dashboard-header">
        <div>
          <h2 style={{ margin: 0, color: '#0f172a' }}>📦 Data Penjualan</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Riwayat transaksi laptop seken</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
      <label className="btn-primary" style={{ backgroundColor: '#10b981', cursor: 'pointer' }}>
      📊 Import Excel
         <input type="file" accept=".xlsx" onChange={handleImportExcel} style={{ display: 'none' }} />
      </label>          
      <button style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            onClick={() => setIsModalOpen(true)}>
            ➕ Tambah Transaksi
          </button>
        </div>
      </div>

      <AddTransaksiModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRefresh={fetchPenjualan} 
      />

      <div className="table-card">
        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>Memuat data dari database...</p>
        ) : daftarPenjualan.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#64748b', fontWeight: 'bold' }}>Belum ada data penjualan.</p>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Klik "Tambah Transaksi" untuk memasukkan nota pertama.</p>
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th width="5%"></th>
                <th>Order ID</th>
                <th>Tanggal</th>
                <th>Nama Pembeli</th>
                <th>Total Harga</th>
              </tr>
            </thead>
            <tbody>
              {daftarPenjualan.map((order) => (
                <React.Fragment key={order.order_id}>
                  <tr className="main-row" onClick={() => toggleExpand(order.order_id)} style={{ cursor: 'pointer' }}>
                    <td style={{ textAlign: 'center', color: '#3b82f6', fontSize: '0.8rem' }}>
                      {expandedId === order.order_id ? '▼' : '▶'}
                    </td>
                    <td style={{ fontWeight: '600' }}>ORD-{order.order_id}</td>
                    <td>{formatTanggal(order.tanggal_jual)}</td>                    <td>{order.nama_pembeli}</td>
                    <td style={{ fontWeight: 'bold', color: '#16a34a' }}>
                      Rp {order.harga_total.toLocaleString('id-ID')}
                    </td>
                  </tr>

                  {expandedId === order.order_id && (
                    <tr className="detail-row">
                      <td colSpan="5">
                        <div className="detail-container">
                          <h4 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>Rincian Laptop:</h4>
                          <table className="detail-table">
                            <thead>
                              <tr>
                                <th>Barcode</th>
                                <th>Merek & Unit</th>
                                <th>Processor</th>
                                <th>Spek (RAM/SSD)</th>
                                <th>Qty</th>
                                <th>Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.items?.map((item) => (
                                <tr key={item.id}>
                                  <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#1e293b'  }}>{item.barcode}</code></td>
                                  <td style={{ fontWeight: '500' }}>{item.merek} {item.nama_unit}</td>
                                  <td>{item.processor}</td>
                                  <td>{item.ram}GB / {item.ssd}GB</td>
                                  <td>{item.qty}</td>
                                  <td>Rp {item.sub_total.toLocaleString('id-ID')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}