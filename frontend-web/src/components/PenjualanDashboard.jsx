import React, { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import api from '../api'
import AddTransaksiModal from './AddTransaksiModal';
import EditTransaksiModal from './EditTransaksiModal';

// Skeleton row component (#6)
const SkeletonRow = () => (
  <tr>
    {[...Array(5)].map((_, i) => (
      <td key={i} style={{ padding: '16px' }}>
        <div style={{ height: '14px', background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)', backgroundSize: '200% 100%', borderRadius: '4px', animation: 'shimmer 1.5s infinite' }} />
      </td>
    ))}
  </tr>
);

const PAGE_SIZE = 15;

export default function PenjualanDashboard() {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [daftarPenjualan, setDaftarPenjualan] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  // Search & filter (#5)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState('')

  // Pagination (#4)
  const [currentPage, setCurrentPage] = useState(1)

  const role = localStorage.getItem('role');

  const fetchPenjualan = async () => {
    try {
      const response = await api.get('/api/penjualan')
      setDaftarPenjualan(response.data.data || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error('Gagal memuat data penjualan.')
    } finally {
      setLoading(false)
    }
  }

  const formatTanggal = (tanggalISO) => {
    const date = new Date(tanggalISO);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleEditClick = (e, order) => {
    e.stopPropagation();
    setSelectedOrder(order);
    setIsEditModalOpen(true);
  }

  // Custom confirm using toast — replaces window.confirm (#7)
  const handleDelete = (e, id, order_id) => {
    e.stopPropagation();
    toast((t) => (
      <div>
        <p style={{ margin: '0 0 12px', fontWeight: '600' }}>Hapus Nota {order_id}?</p>
        <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#475569' }}>Data laptop di dalamnya juga akan terhapus.</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              const toastId = toast.loading('Menghapus...');
              try {
                await api.delete(`/api/penjualan/${id}`);
                toast.success(`Nota ${order_id} berhasil dihapus!`, { id: toastId });
                fetchPenjualan();
              } catch (err) {
                console.error('Gagal menghapus transaksi:', err);
                toast.error('Gagal menghapus transaksi.', { id: toastId });
              }
            }}
            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
          >Ya, Hapus</button>
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
          >Batal</button>
        </div>
      </div>
    ), { duration: Infinity, style: { maxWidth: '340px' } });
  }

  const getKondisiText = (angka) => {
    switch(angka) {
      case 4: return "Mulus";
      case 3: return "Lecet";
      case 2: return "Minus Minor";
      case 1: return "Minus Mayor";
      default: return "-";
    }
  }

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const toastId = toast.loading('Mengimport data Excel...');
    try {
      await api.post('/api/penjualan/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Import Excel berhasil!', { id: toastId });
      fetchPenjualan();
    } catch (error) {
      toast.error('Gagal Import: ' + error.message, { id: toastId });
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  useEffect(() => {
    fetchPenjualan()
  }, [])

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  // Filtering + search logic (#4, #5)
  const filteredData = useMemo(() => {
    let data = daftarPenjualan;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(o =>
        o.nama_pembeli?.toLowerCase().includes(q) ||
        String(o.order_id).toLowerCase().includes(q)
      );
    }
    if (filterMonth) {
      data = data.filter(o => {
        const m = String(new Date(o.tanggal_jual).getMonth() + 1).padStart(2, '0');
        return m === filterMonth;
      });
    }
    if (filterYear) {
      data = data.filter(o => String(new Date(o.tanggal_jual).getFullYear()) === filterYear);
    }
    return data;
  }, [daftarPenjualan, searchQuery, filterMonth, filterYear]);

  // Pagination (#4)
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
  const pagedData = filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset to page 1 when filter changes
  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterMonth, filterYear]);

  return (
    <div style={{ width: '100%' }}>
      {/* Shimmer keyframe */}
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>

      <div className="dashboard-header">
        <div>
          <h2 style={{ margin: 0, color: '#0f172a' }}>📦 Data Penjualan</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Riwayat transaksi laptop seken</p>
        </div>

        {role === 'admin' && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <label className="btn-primary" style={{ backgroundColor: '#10b981', cursor: 'pointer' }}>
              📊 Import Excel
              <input type="file" accept=".xlsx" onChange={handleImportExcel} style={{ display: 'none' }} />
            </label>
            <button className="btn-primary" style={{ padding: '10px 15px', width: 'auto' }}
                  onClick={() => setIsModalOpen(true)}>
                  ➕ Tambah Transaksi
            </button>
          </div>
        )}
      </div>

      {/* Search & Filter bar (#5) */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="🔍 Cari nama pembeli atau Order ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: '1', minWidth: '200px', padding: '9px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
        />
        <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={{ padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}>
          <option value="">Semua Bulan</option>
          {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((m, i) => (
            <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
          ))}
        </select>
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={{ padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}>
          <option value="">Semua Tahun</option>
          {['2024', '2025', '2026'].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {(searchQuery || filterMonth || filterYear) && (
          <button onClick={() => { setSearchQuery(''); setFilterMonth(''); setFilterYear(''); }}
            style={{ padding: '9px 14px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
            ✕ Reset
          </button>
        )}
        <span style={{ color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{filteredData.length} transaksi</span>
      </div>

      <AddTransaksiModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRefresh={fetchPenjualan}
      />

      {isEditModalOpen && (
        <EditTransaksiModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onRefresh={fetchPenjualan}
          initialData={selectedOrder}
        />
      )}

      <div className="table-card">
        {loading ? (
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
              {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        ) : filteredData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#64748b', fontWeight: 'bold' }}>Tidak ada data ditemukan.</p>
            {(searchQuery || filterMonth || filterYear) && (
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Coba ubah filter pencarian.</p>
            )}
          </div>
        ) : (
          <>
            <table className="custom-table">
              <thead>
                <tr>
                  <th width="5%"></th>
                  <th>Order ID</th>
                  <th>Tanggal</th>
                  <th>Nama Pembeli</th>
                  <th>Total Harga</th>
                  {role === 'admin' && <th style={{ textAlign: 'center' }}>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {pagedData.map((order) => (
                  <React.Fragment key={order.order_id}>
                    <tr className="main-row" onClick={() => toggleExpand(order.order_id)} style={{ cursor: 'pointer' }}>
                      <td style={{ textAlign: 'center', color: '#3b82f6', fontSize: '0.8rem' }}>
                        {expandedId === order.order_id ? '▼' : '▶'}
                      </td>
                      <td style={{ fontWeight: '600' }}>ORD-{order.order_id}</td>
                      <td>{formatTanggal(order.tanggal_jual)}</td>
                      <td>{order.nama_pembeli}</td>
                      <td style={{ fontWeight: 'bold', color: '#16a34a' }}>
                        Rp {order.harga_total.toLocaleString('id-ID')}
                      </td>
                      {role === 'admin' && (
                        <td style={{ textAlign: 'center' }}>
                          <>
                            <button
                              onClick={(e) => handleEditClick(e, order)}
                              style={{ background: '#fef08a', color: '#854d0e', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px', fontWeight: '600' }}>
                              Edit
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, order.id, order.order_id)}
                              style={{ background: '#fecaca', color: '#b91c1c', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>
                              Hapus
                            </button>
                          </>
                        </td>
                      )}
                    </tr>

                    {expandedId === order.order_id && (
                      <tr className="detail-row">
                        <td colSpan={role === 'admin' ? 6 : 5}>
                          <div className="detail-container">
                            <h4 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>Rincian Laptop:</h4>
                            <table className="detail-table">
                              <thead>
                                <tr>
                                  <th>Barcode</th>
                                  <th>Merek &amp; Unit</th>
                                  <th>Processor</th>
                                  <th>Spek (RAM/SSD)</th>
                                  <th>Kondisi</th>
                                  <th>Qty</th>
                                  <th>Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items?.map((item) => (
                                  <tr key={item.id}>
                                    <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#1e293b' }}>{item.barcode}</code></td>
                                    <td style={{ fontWeight: '500' }}>{item.merek} {item.nama_unit}</td>
                                    <td>{item.processor}</td>
                                    <td>{item.ram}GB / {item.ssd}GB</td>
                                    <td><span className="kondisi-badge">{getKondisiText(item.kondisi)}</span></td>
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

            {/* Pagination controls (#4) */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', background: currentPage === 1 ? '#f8fafc' : 'white', color: currentPage === 1 ? '#94a3b8' : '#1e293b', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
                  ‹ Prev
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: currentPage === i + 1 ? '#2563eb' : 'white', color: currentPage === i + 1 ? 'white' : '#1e293b', cursor: 'pointer', fontWeight: '600' }}>
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', background: currentPage === totalPages ? '#f8fafc' : 'white', color: currentPage === totalPages ? '#94a3b8' : '#1e293b', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
                  Next ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}