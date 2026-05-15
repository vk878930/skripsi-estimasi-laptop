import { useState, useEffect } from 'react'
import api from '../api'
import KNNVisualization from './KNNVisualization'

// #8 — Input validation
const validateForm = (formData, procFamily, procGen) => {
  const errors = {};
  if (!formData.merek || !formData.merek.trim()) errors.merek = 'Merek tidak boleh kosong.';
  if (!procFamily.includes('Apple') && !procGen.trim()) errors.procGen = 'Model/Gen tidak boleh kosong.';
  if (formData.ram <= 0) errors.ram = 'RAM harus lebih dari 0 GB.';
  if (formData.ssd <= 0) errors.ssd = 'SSD harus lebih dari 0 GB.';
  if (formData.tahun < 2005 || formData.tahun > new Date().getFullYear() + 1)
    errors.tahun = `Tahun harus antara 2005 - ${new Date().getFullYear() + 1}.`;
  return errors;
};

export default function EstimasiForm() {
  const [formData, setFormData] = useState({
    merek: '', processor: '', ram: 0, ssd: 0, tahun: '', kondisi: 0
  })
  const [procFamily, setProcFamily] = useState('')
  const [procGen, setProcGen] = useState('')
  const [validationErrors, setValidationErrors] = useState({}) // #8

  // STATE BARU UNTUK KONTROL PRESET & CUSTOM
  const [merekMode, setMerekMode] = useState('preset') // 'preset' | 'custom'
  const [merekSelect, setMerekSelect] = useState('')

  const [modelSeri, setModelSeri] = useState('') // Opsional

  const [ramMode, setRamMode] = useState('preset') // 'preset' | 'custom'
  const [ramSelect, setRamSelect] = useState('')

  const [ssdMode, setSsdMode] = useState('preset') // 'preset' | 'custom'
  const [ssdSelect, setSsdSelect] = useState('')

  const [hasilEstimasi, setHasilEstimasi] = useState(null)
  const [hargaBawah, setHargaBawah] = useState(null)
  const [hargaAtas, setHargaAtas] = useState(null)
  const [nearestNeighbors, setNearestNeighbors] = useState(null)
  const [scalerStats, setScalerStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const [riwayat, setRiwayat] = useState([])

  const fetchRiwayat = async () => {
    try {
      const response = await api.get('/api/estimasi/riwayat')
      setRiwayat(response.data.data || [])
    } catch (error) {
      console.error("Gagal mengambil data riwayat", error)
    }
  }

  useEffect(() => {
    fetchRiwayat()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (['ram', 'ssd', 'tahun', 'kondisi'].includes(name)) {
      setFormData({ ...formData, [name]: parseInt(value) || 0 })
    } else {
      setFormData({ ...formData, [name]: value })
    }
    // Clear field error on change (#8)
    if (validationErrors[name]) {
      setValidationErrors(prev => { const e = {...prev}; delete e[name]; return e; });
    }
  }

  const handleMerekSelect = (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      setMerekMode('custom');
      setFormData(prev => ({ ...prev, merek: '' }));
    } else {
      setMerekMode('preset');
      setMerekSelect(val);
      setFormData(prev => ({ ...prev, merek: val }));
    }
    if (validationErrors.merek) setValidationErrors(p => { const e={...p}; delete e.merek; return e; });
  }

  const handleRamSelect = (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      setRamMode('custom');
    } else {
      setRamMode('preset');
      const num = parseInt(val);
      setRamSelect(num);
      setFormData(prev => ({ ...prev, ram: num }));
    }
    if (validationErrors.ram) setValidationErrors(p => { const e={...p}; delete e.ram; return e; });
  }

  const handleSsdSelect = (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      setSsdMode('custom');
    } else {
      setSsdMode('preset');
      const num = parseInt(val);
      setSsdSelect(num);
      setFormData(prev => ({ ...prev, ssd: num }));
    }
    if (validationErrors.ssd) setValidationErrors(p => { const e={...p}; delete e.ssd; return e; });
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg(null)

    // Client-side validation (#8)
    const errors = validateForm(formData, procFamily, procGen);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});

    setLoading(true)
    const finalProcessor = procFamily.includes('Apple') ? procFamily : `${procFamily}-${procGen}`
    const payload = { ...formData, processor: finalProcessor }

    try {
      const response = await api.post('/api/estimasi', payload)
      setHasilEstimasi(response.data.data.estimasi_harga_rupiah)
      setHargaBawah(response.data.data.harga_bawah)
      setHargaAtas(response.data.data.harga_atas)
      setNearestNeighbors(response.data.data.nearest_neighbors)
      setScalerStats(response.data.data.scaler_stats)
      fetchRiwayat()
    } catch (error) {
      setErrorMsg("Gagal mengambil estimasi harga. Pastikan server ML berjalan.")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getKondisiText = (angka) => {
    switch(angka) {
      case 4: return "Mulus (Seperti Baru)";
      case 3: return "Lecet Pemakaian Wajar";
      case 2: return "Minus Minor";
      case 1: return "Minus Mayor";
      default: return "-";
    }
  }

  // Helper to render validation error inline (#8)
  const FieldError = ({ field }) => validationErrors[field]
    ? <small style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>{validationErrors[field]}</small>
    : null;

  const errorBorder = (field) => validationErrors[field] ? '1px solid #ef4444' : undefined;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2>🤖 Estimasi Harga AI (KNN)</h2>
        <p className="text-secondary">Masukkan spesifikasi unit untuk melihat taksiran harga jual yang ideal</p>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', maxWidth: '500px', margin: '0 auto 20px', border: '1px solid #fca5a5' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="form-card" style={{ maxWidth: '600px' }}>
        <div className="form-row">
          <div className="input-group" style={{ flex: 1 }}>
            <label>Merek:</label>
            <select value={merekMode === 'custom' ? 'custom' : merekSelect} onChange={handleMerekSelect} style={{ border: errorBorder('merek') }}>
              <option value="" disabled>Pilih Merek</option>
              <option value="Lenovo">Lenovo</option>
              <option value="Apple">Apple (Macbook)</option>
              <option value="Asus">Asus</option>
              <option value="Acer">Acer</option>
              <option value="HP">HP</option>
              <option value="Dell">Dell</option>
              <option value="MSI">MSI</option>
              <option value="custom">Lainnya (Custom)</option>
            </select>
            {merekMode === 'custom' && (
              <input 
                type="text" 
                name="merek" 
                value={formData.merek} 
                onChange={handleChange} 
                placeholder="Ketik merek (Ex: Chuwi)" 
                required 
                style={{ border: errorBorder('merek'), marginTop: '8px' }} 
                autoFocus 
              />
            )}
            <FieldError field="merek" />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label>Model / Seri (Opsional):</label>
            <input 
              type="text" 
              value={modelSeri} 
              onChange={(e) => setModelSeri(e.target.value)} 
              placeholder="Ex: ThinkPad T480" 
            />
          </div>
        </div>

        <div className="form-row">
          <div className="input-group" style={{ flex: 1 }}>
            <label>Processor Family:</label>
            <select value={procFamily} onChange={(e) => setProcFamily(e.target.value)}>
              <option value="" disabled>Pilih Processor</option>
              <option value="Celeron">Celeron</option>
              <option value="Pentium">Pentium</option>
              <option value="Core i3">Intel Core i3</option>
              <option value="Core i5">Intel Core i5</option>
              <option value="Core i7">Intel Core i7</option>
              <option value="Core i9">Intel Core i9</option>
              <option value="Core Ultra">Intel Core Ultra</option>
              <option value="Ryzen 3">AMD Ryzen 3</option>
              <option value="Ryzen 5">AMD Ryzen 5</option>
              <option value="Ryzen 7">AMD Ryzen 7</option>
              <option value="Ryzen 9">AMD Ryzen 9</option>
              <option value="Apple M1">Apple M1</option>
              <option value="Apple M2">Apple M2</option>
              <option value="Apple M3">Apple M3</option>
              <option value="Snapdragon">Snapdragon</option>
            </select>
          </div>
          {!procFamily.includes('Apple') && (
            <div className="input-group" style={{ flex: 1 }}>
              <label>Model / Gen:</label>
              <input type="text" value={procGen} onChange={(e) => { setProcGen(e.target.value); if (validationErrors.procGen) setValidationErrors(p => { const e={...p}; delete e.procGen; return e; }); }} required placeholder="Ex: 8 atau 8350U" style={{ border: errorBorder('procGen') }} />
              <FieldError field="procGen" />
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="input-group" style={{ flex: 1 }}>
            <label>RAM (GB):</label>
            <select value={ramMode === 'custom' ? 'custom' : ramSelect} onChange={handleRamSelect} style={{ border: errorBorder('ram') }}>
              <option value="" disabled>Pilih RAM</option>
              <option value="2">2 GB</option>
              <option value="4">4 GB</option>
              <option value="8">8 GB</option>
              <option value="12">12 GB</option>
              <option value="16">16 GB</option>
              <option value="24">24 GB</option>
              <option value="32">32 GB</option>
              <option value="64">64 GB</option>
              <option value="custom">Custom (Ketik Sendiri)</option>
            </select>
            {ramMode === 'custom' && (
              <input 
                type="number" 
                name="ram" 
                value={formData.ram} 
                onChange={handleChange} 
                min="1" 
                placeholder="RAM (GB)" 
                required 
                style={{ border: errorBorder('ram'), marginTop: '8px' }} 
                autoFocus 
              />
            )}
            <FieldError field="ram" />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label>SSD / Storage (GB):</label>
            <select value={ssdMode === 'custom' ? 'custom' : ssdSelect} onChange={handleSsdSelect} style={{ border: errorBorder('ssd') }}>
              <option value="" disabled>Pilih Storage</option>
              <option value="64">64 GB</option>
              <option value="128">128 GB</option>
              <option value="256">256 GB</option>
              <option value="512">512 GB</option>
              <option value="1024">1 TB (1024 GB)</option>
              <option value="2048">2 TB (2048 GB)</option>
              <option value="custom">Custom (Ketik Sendiri)</option>
            </select>
            {ssdMode === 'custom' && (
              <input 
                type="number" 
                name="ssd" 
                value={formData.ssd} 
                onChange={handleChange} 
                min="1" 
                placeholder="SSD (GB)" 
                required 
                style={{ border: errorBorder('ssd'), marginTop: '8px' }} 
                autoFocus 
              />
            )}
            <FieldError field="ssd" />
          </div>
        </div>

        <div className="form-row">
          <div className="input-group" style={{ flex: 1 }}>
            <label>Tahun Rilis:</label>
            <input type="number" name="tahun" value={formData.tahun} onChange={handleChange} placeholder="Ex: 2022" style={{ border: errorBorder('tahun') }} />
            <FieldError field="tahun" />
          </div>
          <div className="input-group" style={{ flex: 2 }}>
            <label>Kondisi Fisik:</label>
            <select name="kondisi" value={formData.kondisi} onChange={handleChange}>
              <option value={0} disabled>Pilih Kondisi</option>
              <option value={4}>Mulus (Seperti Baru)</option>
              <option value={3}>Lecet Pemakaian Wajar</option>
              <option value={2}>Minus Minor (Dent/Whitespot)</option>
              <option value={1}>Minus Mayor (Baterai Drop/Layar Garis)</option>
            </select>
          </div>
        </div>

        <button type="submit" disabled={loading} style={{ marginTop: '10px' }}>
          {loading ? "Menghitung dengan AI..." : "Cek Harga Jual"}
        </button>
      </form>

      {/* Hasil Estimasi */}
      {hasilEstimasi && (
        <div className="result-card" style={{ maxWidth: '600px', margin: '20px auto 0' }}>
          <h3 style={{ margin: '0 0 10px', color: '#166534' }}>
            Taksiran Harga AI {modelSeri ? `(${formData.merek} ${modelSeri})` : `(${formData.merek})`}:
          </h3>
          <h1 style={{ color: '#22c55e', margin: '0 0 5px', fontSize: '2.2rem' }}>
            {hargaBawah && hargaAtas && hargaBawah !== hargaAtas ?
              `Rp ${hargaBawah.toLocaleString('id-ID')} - Rp ${hargaAtas.toLocaleString('id-ID')}` :
              `Rp ${hasilEstimasi.toLocaleString('id-ID')}`}
          </h1>
          {hargaBawah && hargaAtas && hargaBawah !== hargaAtas && (
            <p style={{ color: '#475569', marginTop: 0, marginBottom: '20px', fontSize: '0.9rem' }}>
              *Nilai Tengah Prediksi: Rp {hasilEstimasi.toLocaleString('id-ID')}
            </p>
          )}

          {nearestNeighbors && nearestNeighbors.length > 0 && (
            <div style={{ textAlign: 'left', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
              <h4 style={{ margin: '0 0 10px', color: '#334155' }}>🧠 Bagaimana AI Bekerja? (Behind the Scenes)</h4>
              <p style={{ color: '#475569', fontSize: '0.85rem', marginBottom: '15px' }}>
                Berikut adalah proses kalkulasi K-Nearest Neighbors (KNN) langkah demi langkah untuk menemukan taksiran harga.
              </p>

              {scalerStats && (
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e0f2fe', borderRadius: '6px', fontSize: '0.85rem', color: '#0369a1', marginBottom: '15px' }}>
                  <h5 style={{ margin: '0 0 5px', fontSize: '0.95rem' }}>Langkah 1: Standarisasi Data (Z-Score)</h5>
                  <p style={{ margin: '0 0 10px' }}>Algoritma menggunakan <strong>StandardScaler</strong>: <code>z = (x - μ) / σ</code> <strong>hanya pada fitur numerik</strong> agar satuan (GB, Tahun) tidak mengacaukan perhitungan jarak Euclidean. Fitur kategorikal (merek, prosesor) menggunakan <em>one-hot encoding</em> (0/1) dan <strong>tidak di-scale</strong>.</p>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontFamily: 'monospace' }}>
                    <li><strong>RAM</strong>: ({formData.ram} - {scalerStats.ram?.mean}) / {scalerStats.ram?.scale} = {((formData.ram - scalerStats.ram?.mean) / scalerStats.ram?.scale).toFixed(4)}</li>
                    <li><strong>SSD</strong>: ({formData.ssd} - {scalerStats.ssd?.mean}) / {scalerStats.ssd?.scale} = {((formData.ssd - scalerStats.ssd?.mean) / scalerStats.ssd?.scale).toFixed(4)}</li>
                    <li><strong>Tahun</strong>: ({formData.tahun} - {scalerStats.tahun?.mean}) / {scalerStats.tahun?.scale} = {((formData.tahun - scalerStats.tahun?.mean) / scalerStats.tahun?.scale).toFixed(4)}</li>
                    <li><strong>Kondisi</strong>: ({formData.kondisi} - {scalerStats.kondisi?.mean}) / {scalerStats.kondisi?.scale} = {((formData.kondisi - scalerStats.kondisi?.mean) / scalerStats.kondisi?.scale).toFixed(4)}</li>
                  </ul>
                </div>
              )}

              <h5 style={{ margin: '0 0 10px', color: '#334155', fontSize: '0.95rem' }}>Langkah 2: Pencarian Jarak Euclidean (Terdekat)</h5>
              <ul style={{ margin: 0, paddingLeft: '0', listStyleType: 'none', color: '#475569', fontSize: '0.85rem' }}>
                {nearestNeighbors.map((nb, idx) => (
                  <li key={idx} style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                    <strong>{idx+1}. {nb.merek} {nb.processor}</strong> (RAM {nb.ram}GB, SSD {nb.ssd}GB, Thn {nb.tahun})
                    <br />
                    Terjual: <strong style={{ color: '#0f172a' }}>Rp {nb.harga.toLocaleString('id-ID')}</strong> | Distance: <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{nb.jarak !== undefined ? nb.jarak.toFixed(4) : '-'}</span>

                    <details style={{ marginTop: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                      <summary style={{ cursor: 'pointer', padding: '8px', backgroundColor: '#f1f5f9', fontWeight: 'bold', color: '#475569' }}>
                        Lihat Rincian Perhitungan Distance
                      </summary>
                      <div style={{ padding: '10px', fontSize: '0.8rem', borderTop: '1px solid #e2e8f0', overflowX: 'auto' }}>
                        <p style={{ margin: '0 0 10px' }}><strong>Rumus Euclidean:</strong> <code>d = √ (Σ (Input_z - Neighbor_z)²)</code></p>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                              <th style={{ padding: '6px' }}>Fitur (One-Hot &amp; Scaled)</th>
                              <th style={{ padding: '6px' }}>Input (z)</th>
                              <th style={{ padding: '6px' }}>Neighbor (z)</th>
                              <th style={{ padding: '6px' }}>(Input - Neighbor)²</th>
                            </tr>
                          </thead>
                          <tbody>
                            {nb.perhitungan_jarak?.map((calc, cIdx) => (
                              <tr key={cIdx} style={{ borderBottom: '1px dashed #e2e8f0' }}>
                                <td style={{ padding: '6px' }}>{calc.fitur}</td>
                                <td style={{ padding: '6px', fontFamily: 'monospace' }}>{calc.input}</td>
                                <td style={{ padding: '6px', fontFamily: 'monospace' }}>{calc.neighbor}</td>
                                <td style={{ padding: '6px', fontFamily: 'monospace' }}>{calc.squared_diff}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                              <td colSpan="3" style={{ textAlign: 'right', padding: '6px', fontWeight: 'bold' }}>Total Selisih Kuadrat (Σ):</td>
                              <td style={{ padding: '6px', fontFamily: 'monospace', fontWeight: 'bold' }}>{nb.perhitungan_jarak?.reduce((acc, curr) => acc + curr.squared_diff, 0).toFixed(4)}</td>
                            </tr>
                            <tr style={{ backgroundColor: '#fee2e2' }}>
                              <td colSpan="3" style={{ textAlign: 'right', padding: '6px', fontWeight: 'bold', color: '#b91c1c' }}>Akar Kuadrat (Euclidean Distance):</td>
                              <td style={{ padding: '6px', fontFamily: 'monospace', fontWeight: 'bold', color: '#b91c1c' }}>√ {nb.perhitungan_jarak?.reduce((acc, curr) => acc + curr.squared_diff, 0).toFixed(4)} = {nb.jarak?.toFixed(4)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>

              <h5 style={{ margin: '15px 0 10px', color: '#334155', fontSize: '0.95rem' }}>Langkah 3: Kalkulasi Estimasi Akhir (Rata-rata Harga)</h5>
              <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534' }}>
                <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#15803d', fontWeight: '600' }}>Rumus Estimasi Regresi KNN:</p>
                <div style={{ background: 'white', padding: '10px 14px', borderRadius: '6px', border: '1px solid #dcfce7', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: '"Cambria Math", "Times New Roman", serif', fontSize: '1.4rem', fontWeight: 'bold', color: '#15803d' }}>
                  <span>y&#770; =</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.95rem', lineHeight: '1.1' }}>
                    <span>1</span>
                    <span style={{ borderTop: '2px solid #15803d', width: '100%', textAlign: 'center' }}>K</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', marginBottom: '-4px' }}>K</span>
                      <span style={{ fontSize: '1.8rem', fontWeight: 'normal', lineHeight: '1' }}>&sum;</span>
                      <span style={{ fontSize: '0.7rem', marginTop: '0px' }}>i=1</span>
                    </div>
                    <span style={{ fontStyle: 'italic', fontSize: '1.2rem' }}>y<sub>i</sub></span>
                  </div>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#166534', marginBottom: '12px', lineHeight: '1.4' }}>
                  <strong>Keterangan:</strong>
                  <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                    <li><strong>ŷ</strong> = Estimasi harga jual laptop uji.</li>
                    <li><strong>K</strong> = Jumlah tetangga terdekat yang digunakan ({nearestNeighbors.length}).</li>
                    <li><strong>y<sub>i</sub></strong> = Harga jual aktual dari tetangga terdekat ke-i.</li>
                  </ul>
                </div>

                <div style={{ borderTop: '1px dashed #bbf7d0', paddingTop: '10px', fontSize: '0.9rem' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '0.82rem', fontWeight: '600', color: '#15803d' }}>Kalkulasi Manual:</p>
                  <div style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.6)', padding: '8px 10px', borderRadius: '4px', marginBottom: '6px' }}>
                    ŷ = (
                    {nearestNeighbors.map((nb, idx) => (
                      <span key={idx}>Rp {nb.harga.toLocaleString('id-ID')}{idx < nearestNeighbors.length - 1 ? ' + ' : ''}</span>
                    ))}
                    ) / {nearestNeighbors.length}
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#166534' }}>
                    ŷ = Rp {Math.round(nearestNeighbors.reduce((sum, nb) => sum + nb.harga, 0) / nearestNeighbors.length).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KNN Visualization */}
      {nearestNeighbors && nearestNeighbors.length > 0 && (
        <KNNVisualization
          neighbors={nearestNeighbors}
          queryData={formData}
          hasilEstimasi={hasilEstimasi}
          hargaBawah={hargaBawah}
          hargaAtas={hargaAtas}
        />
      )}

      {/* Tabel Riwayat */}
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
                  <th>Merek &amp; Proc</th>
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
                    <td>{item.merek} {modelSeri ? `(${modelSeri})` : ''} - {item.processor}</td>
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