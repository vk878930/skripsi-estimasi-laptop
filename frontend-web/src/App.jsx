import { useState } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [formData, setFormData] = useState({
    ram: 8,
    ssd: 256,
    tahun: 2021,
    kondisi: 4
  })
  const [hasilEstimasi, setHasilEstimasi] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: parseInt(e.target.value)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Menembak ke API Golang (port 8080)
      const response = await axios.post('http://localhost:8080/api/estimasi', formData)
      setHasilEstimasi(response.data.data.estimasi_harga_rupiah)
    } catch (error) {
      alert("Gagal mengambil estimasi harga. Pastikan Golang & Python menyala!")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>💻 Estimasi Harga Laptop Bekas</h1>
      <p>Masukkan spesifikasi unit untuk melihat taksiran harga pasar</p>

      <form onSubmit={handleSubmit} className="form-card">
        <div className="input-group">
          <label>RAM (GB):</label>
          <input type="number" name="ram" value={formData.ram} onChange={handleChange} />
        </div>
        
        <div className="input-group">
          <label>SSD (GB):</label>
          <input type="number" name="ssd" value={formData.ssd} onChange={handleChange} />
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

      {hasilEstimasi && (
        <div className="result-card">
          <h2>Estimasi Harga Jual:</h2>
          <h1 style={{ color: '#27ae60' }}>
            Rp {hasilEstimasi.toLocaleString('id-ID')}
          </h1>
        </div>
      )}
    </div>
  )
}

export default App