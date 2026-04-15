import React, { useState } from 'react';
import axios from 'axios';

export default function AddTransaksiModal({ isOpen, onClose, onRefresh }) {
  const [header, setHeader] = useState({
    order_id: '',
    nama_pembeli: '',
    tanggal_jual: new Date().toISOString().split('T')[0],
  });

  const [items, setItems] = useState([{
    barcode: '', merek: '', nama_unit: '', processor: '',
    ram: 8, ssd: 256, tahun: 2021, kondisi: 4, qty: 1, harga_terjual: 0
  }]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([...items, { barcode: '', merek: '', nama_unit: '', processor: '', ram: 8, ssd: 256, tahun: 2021, kondisi: 4, qty: 1, harga_terjual: 0 }]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, e) => {
    const newItems = [...items];
    const { name, value } = e.target;
    newItems[index][name] = (name === 'ram' || name === 'ssd' || name === 'tahun' || name === 'kondisi' || name === 'qty' || name === 'harga_terjual') 
      ? parseInt(value) || 0 : value;
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const processedItems = items.map(item => ({
      ...item,
      sub_total: item.qty * item.harga_terjual
    }));

    const totalHarga = processedItems.reduce((acc, curr) => acc + curr.sub_total, 0);

    const payload = {
      ...header,
      // Konversi tanggal ke format ISO lengkap agar diterima backend Golang
      tanggal_jual: new Date(header.tanggal_jual).toISOString(), 
      harga_total: totalHarga,
      items: processedItems
    };

    try {
      await axios.post('http://localhost:8080/api/penjualan', payload);
      alert("Transaksi Berhasil Disimpan!");
      onRefresh(); 
      onClose(); 
    } catch (error) {
      console.error(error);
      alert("Gagal simpan transaksi: " + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 style={{ margin: '0 0 20px 0', color: '#0f172a' }}>➕ Tambah Transaksi Baru</h3>
        <form onSubmit={handleSubmit}>
          
          <div className="form-row">
            <div className="input-group">
              <label>Nomor Nota (Order ID):</label>
              <input type="text" value={header.order_id} onChange={(e) => setHeader({...header, order_id: e.target.value})} required placeholder="INV-001" />
            </div>
            <div className="input-group">
              <label>Nama Pembeli:</label>
              <input type="text" value={header.nama_pembeli} onChange={(e) => setHeader({...header, nama_pembeli: e.target.value})} required />
            </div>
            <div className="input-group">
              <label>Tanggal Penjualan:</label>
              <input type="date" value={header.tanggal_jual} onChange={(e) => setHeader({...header, tanggal_jual: e.target.value})} required />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '15px 0' }} />
          
          <h4 style={{ margin: '0 0 15px 0', color: '#475569' }}>Daftar Laptop Terjual:</h4>
          
          {items.map((item, index) => (
            <div key={index} className="item-input-group">
              
              {/* Baris 1: Identitas Laptop */}
              <div className="form-row" style={{ marginBottom: '10px' }}>
                <input type="text" name="barcode" placeholder="Barcode" value={item.barcode} onChange={(e) => handleItemChange(index, e)} required style={{ width: '120px' }}/>
                <input type="text" name="merek" placeholder="Merek (Ex: Lenovo)" value={item.merek} onChange={(e) => handleItemChange(index, e)} required style={{ flex: 1 }}/>
                <input type="text" name="nama_unit" placeholder="Unit (Ex: Thinkpad T480)" value={item.nama_unit} onChange={(e) => handleItemChange(index, e)} required style={{ flex: 1.5 }}/>
                <input type="text" name="processor" placeholder="Processor (Ex: i5 Gen 8)" value={item.processor} onChange={(e) => handleItemChange(index, e)} required style={{ flex: 1 }}/>
                
                {/* Tombol Hapus Baris */}
                {items.length > 1 && (
                  <button type="button" onClick={() => handleRemoveItem(index)} className="btn-delete-item" title="Hapus Laptop Ini">×</button>
                )}
              </div>

              {/* Baris 2: Spesifikasi KNN & Harga */}
              <div className="form-row" style={{ marginBottom: 0 }}>
                <input type="number" name="ram" placeholder="RAM (GB)" value={item.ram === 0 ? '' : item.ram} onChange={(e) => handleItemChange(index, e)} required style={{ width: '80px' }} title="RAM dalam GB"/>
                <input type="number" name="ssd" placeholder="SSD (GB)" value={item.ssd === 0 ? '' : item.ssd} onChange={(e) => handleItemChange(index, e)} required style={{ width: '80px' }} title="Kapasitas SSD"/>
                <input type="number" name="tahun" placeholder="Tahun" value={item.tahun === 0 ? '' : item.tahun} onChange={(e) => handleItemChange(index, e)} required style={{ width: '80px' }} title="Tahun Rilis"/>
                
                <select name="kondisi" value={item.kondisi} onChange={(e) => handleItemChange(index, e)} required style={{ flex: 1 }}>
                  <option value={4}>Mulus (Seperti Baru)</option>
                  <option value={3}>Lecet Pemakaian Wajar</option>
                  <option value={2}>Minus Minor (Dent/Whitespot)</option>
                  <option value={1}>Minus Mayor</option>
                </select>

                <input type="number" name="harga_terjual" placeholder="Harga Satuan" value={item.harga_terjual === 0 ? '' : item.harga_terjual} onChange={(e) => handleItemChange(index, e)} required style={{ flex: 1 }}/>
                <input type="number" name="qty" placeholder="Qty" value={item.qty} style={{ width: '60px' }} onChange={(e) => handleItemChange(index, e)} required />
              </div>
              
            </div>
          ))}

          <button type="button" onClick={handleAddItem} className="btn-add-item">+ Tambah Baris Laptop</button>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Simpan Transaksi</button>
          </div>
        </form>
      </div>
    </div>
  );
}