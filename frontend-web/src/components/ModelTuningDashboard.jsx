import { useState } from 'react'
import axios from 'axios'

export default function ModelTuningDashboard() {
  const [kValue, setKValue] = useState(5)
  const [loading, setLoading] = useState(false)
  const [evaluationResult, setEvaluationResult] = useState(null)
  const [message, setMessage] = useState(null)

  const handleEvaluate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const response = await axios.post('http://localhost:8080/api/estimasi/evaluate', { k: parseInt(kValue) })
      const resultData = response.data.data;
      if (resultData && resultData.status === 'error') {
        setMessage({ type: 'error', text: resultData.message || "Gagal melakukan evaluasi model." })
        setEvaluationResult(null)
      } else {
        setEvaluationResult(resultData)
      }
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: error.response?.data?.error || "Gagal melakukan evaluasi model." })
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!evaluationResult) return;
    
    setLoading(true)
    setMessage(null)
    try {
      const response = await axios.post('http://localhost:8080/api/estimasi/update_k', { k: parseInt(evaluationResult.k) })
      const resultData = response.data.data;
      if (resultData && resultData.status === 'error') {
        setMessage({ type: 'error', text: resultData.message || "Gagal mengatur model default." })
      } else {
        setMessage({ type: 'success', text: resultData.message || `Berhasil mengatur K=${evaluationResult.k} sebagai default model.` })
      }
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: "Gagal mengatur model default." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: '#0f172a' }}>⚙️ Dashboard Tuning Model ML</h2>
        <p style={{ color: '#64748b' }}>Sesuaikan parameter K-Nearest Neighbors (KNN) dan evaluasi performanya</p>
      </div>

      <div className="form-card">
        <form onSubmit={handleEvaluate}>
          <div className="input-group">
            <label>Nilai K (Jumlah Tetangga Terdekat):</label>
            <input 
              type="number" 
              min="1" 
              max="20"
              value={kValue} 
              onChange={(e) => setKValue(e.target.value)} 
              required 
            />
            <small style={{ color: '#64748b', display: 'block', marginTop: '5px' }}>
              Nilai K menentukan berapa banyak data mirip yang diambil sebagai referensi harga. Semakin kecil nilainya, model semakin sensitif.
            </small>
          </div>
          
          <button type="submit" disabled={loading} style={{ marginTop: '15px' }}>
            {loading ? "Mengevaluasi..." : "🔍 Evaluasi Model"}
          </button>
        </form>
      </div>

      {message && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          borderRadius: '8px',
          backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`
        }}>
          {message.text}
        </div>
      )}

      {evaluationResult && (
        <div className="result-card" style={{ marginTop: '30px', textAlign: 'left' }}>
          <h3 style={{ margin: '0 0 15px', color: '#1e293b' }}>Hasil Evaluasi (K = {evaluationResult.k})</h3>
          
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: 1, backgroundColor: '#f1f5f9', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 5px', color: '#64748b', fontSize: '0.9rem' }}>Mean Absolute Error (MAE)</p>
              <h2 style={{ margin: 0, color: '#0f172a' }}>Rp {evaluationResult.mae?.toLocaleString('id-ID')}</h2>
              <small style={{ color: '#94a3b8' }}>Rata-rata error prediksi</small>
            </div>
            
            <div style={{ flex: 1, backgroundColor: '#f1f5f9', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 5px', color: '#64748b', fontSize: '0.9rem' }}>Root Mean Squared Error (RMSE)</p>
              <h2 style={{ margin: 0, color: '#ef4444' }}>Rp {evaluationResult.rmse?.toLocaleString('id-ID')}</h2>
              <small style={{ color: '#94a3b8' }}>Sensitif terhadap error besar</small>
            </div>
          </div>

          <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '20px' }}>
            Model dievaluasi menggunakan <strong>{evaluationResult.test_size} data test</strong>.
          </p>

          <button 
            onClick={handleApply} 
            disabled={loading}
            style={{ 
              width: '100%', 
              backgroundColor: '#10b981', 
              color: 'white',
              padding: '12px',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? "Menyimpan..." : "✅ Gunakan K ini sebagai Default Model"}
          </button>
        </div>
      )}
    </div>
  )
}
