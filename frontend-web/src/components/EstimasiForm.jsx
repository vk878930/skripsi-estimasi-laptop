import { useState, useEffect } from 'react'
import axios from 'axios'

export default function EstimasiForm() {
  const [formData, setFormData] = useState({ 
    merek: 'Lenovo', processor: '', ram: 8, ssd: 256, tahun: 2021, kondisi: 4 
  })
  const [procFamily, setProcFamily] = useState('Core i5')
  const [procGen, setProcGen] = useState('8')
  
  const [hasilEstimasi, setHasilEstimasi] = useState(null)
  const [nearestNeighbors, setNearestNeighbors] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // State untuk menyimpan data riwayat
  const [riwayat, setRiwayat] = useState([])

  // Fungsi untuk menarik data riwayat dari backend Golang
  const fetchRiwayat = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/estimasi/riwayat')
      setRiwayat(response.data.data || [])
    } catch (error) {
      console.error("Gagal mengambil data riwayat", error)
    }
  }

  // Panggil data riwayat secara otomatis saat halaman dibuka
  useEffect(() => {
    fetchRiwayat()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Parse int for numbers
    if (['ram', 'ssd', 'tahun', 'kondisi'].includes(name)) {
      setFormData({ ...formData, [name]: parseInt(value) || 0 })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    // If user inputs "8350U", it becomes "Core i5-8350U". If they input "8", it becomes "Core i5-8"
    // For Apple M1/M2/M3, we just send the family.
    const finalProcessor = procFamily.includes('Apple') ? procFamily : `${procFamily}-${procGen}`
    const payload = { ...formData, processor: finalProcessor }

    try {
      const response = await axios.post('http://localhost:8080/api/estimasi', payload)
      setHasilEstimasi(response.data.data.estimasi_harga_rupiah)
      setNearestNeighbors(response.data.data.nearest_neighbors)
      
      // Setelah AI berhasil menebak, refresh otomatis tabel riwayat di bawah!
      fetchRiwayat() 
    } catch (error) {
      alert("Gagal mengambil estimasi harga. Pastikan Golang & Python menyala!")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Menerjemahkan angka kondisi fisik ke teks agar mudah dibaca di tabel
  const getKondisiText = (angka) => {
    switch(angka) {
      case 4: return "Mulus (Seperti Baru)";
      case 3: return "Lecet Pemakaian Wajar";
      case 2: return "Minus Minor";
      case 1: return "Minus Mayor";
      default: return "-";
    }
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: '#0f172a' }}>🤖 Estimasi Harga AI (KNN)</h2>
        <p style={{ color: '#64748b' }}>Masukkan spesifikasi unit untuk melihat taksiran harga jual yang ideal</p>
      </div>

      {/* --- FORM INPUT ESTIMASI --- */}
      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-row">
          <div className="input-group">
            <label>Merek:</label>
            <input type="text" name="merek" value={formData.merek} onChange={handleChange} placeholder="Ex: Lenovo" required />
          </div>
        </div>

        <div className="form-row">
          <div className="input-group">
            <label>Processor Family:</label>
            <select value={procFamily} onChange={(e) => setProcFamily(e.target.value)}>
              <option value="Celeron">Celeron</option>
              <option value="Core i3">Intel Core i3</option>
              <option value="Core i5">Intel Core i5</option>
              <option value="Core i7">Intel Core i7</option>
              <option value="Core i9">Intel Core i9</option>
              <option value="Ryzen 3">AMD Ryzen 3</option>
              <option value="Ryzen 5">AMD Ryzen 5</option>
              <option value="Ryzen 7">AMD Ryzen 7</option>
              <option value="Ryzen 9">AMD Ryzen 9</option>
              <option value="Apple M1">Apple M1</option>
              <option value="Apple M2">Apple M2</option>
              <option value="Apple M3">Apple M3</option>
            </select>
          </div>
          {!procFamily.includes('Apple') && (
            <div className="input-group">
              <label>Model / Gen:</label>
              <input type="text" value={procGen} onChange={(e) => setProcGen(e.target.value)} required placeholder="Ex: 8 atau 8350U" />
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="input-group">
            <label>RAM (GB):</label>
            <input type="number" name="ram" value={formData.ram} onChange={handleChange} />
          </div>
          <div className="input-group">
            <label>SSD (GB):</label>
            <input type="number" name="ssd" value={formData.ssd} onChange={handleChange} />
          </div>
        </div>
        <div className="input-group">
          <label>Tahun Rilis:</label>
          <input type="number" name="tahun" value={formData.tahun} onChange={handleChange} />
        </div>
        <div className="input-group">
          <label>Kondisi Fisik:</label>
          <select name="kondisi" value={formData.kondisi} onChange={handleChange}>
            <option value={4}>Mulus (Seperti Baru)</option>
            <option value={3}>Lecet Pemakaian Wajar</option>
            <option value={2}>Minus Minor (Dent/Whitespot)</option>
            <option value={1}>Minus Mayor (Baterai Drop/Layar Garis)</option>
          </select>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Menghitung dengan AI..." : "Cek Harga Jual"}
        </button>
      </form>

      {/* --- HASIL ESTIMASI BESAR --- */}
      {hasilEstimasi && (
        <div className="result-card" style={{ maxWidth: '600px', margin: '20px auto 0' }}>
          <h3 style={{ margin: '0 0 10px', color: '#166534' }}>Taksiran Harga AI:</h3>
          <h1 style={{ color: '#22c55e', margin: '0 0 20px', fontSize: '2.5rem' }}>
            Rp {hasilEstimasi.toLocaleString('id-ID')}
          </h1>
          
          {nearestNeighbors && nearestNeighbors.length > 0 && (
            <div style={{ textAlign: 'left', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 10px', color: '#334155' }}>🔍 Referensi Data AI (Nearest Neighbors):</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '0.9rem' }}>
                {nearestNeighbors.map((nb, idx) => (
                  <li key={idx} style={{ marginBottom: '8px' }}>
                    <strong>{nb.merek} {nb.processor}</strong> (RAM {nb.ram}GB, SSD {nb.ssd}GB, Thn {nb.tahun})
                    <br />
                    Terjual di harga: <strong style={{ color: '#0f172a' }}>Rp {nb.harga.toLocaleString('id-ID')}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* --- TABEL RIWAYAT PREDIKSI --- */}
      <div className="table-card" style={{ marginTop: '40px' }}>
        <h3 style={{ margin: '0 0 15px', color: '#0f172a' }}>📋 Riwayat Prediksi AI Terbaru</h3>
        
        {riwayat.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#94a3b8' }}>Belum ada riwayat estimasi.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Waktu Cek</th>
                  <th>Merek & Proc</th>
                  <th>Spesifikasi (RAM/SSD)</th>
                  <th>Tahun</th>
                  <th>Kondisi</th>
                  <th>Hasil Taksiran</th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map((item) => (
                  <tr key={item.id} className="main-row">
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {new Date(item.created_at).toLocaleString('id-ID', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td>{item.merek} - {item.processor}</td>
                    <td style={{ fontWeight: '500' }}>{item.ram}GB / {item.ssd}GB</td>
                    <td>{item.tahun}</td>
                    <td>{getKondisiText(item.kondisi)}</td>
                    <td style={{ fontWeight: 'bold', color: '#3b82f6' }}>
                      Rp {item.harga?.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}