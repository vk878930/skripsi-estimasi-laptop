import { useState } from 'react'
import EstimasiForm from './components/EstimasiForm'
import PenjualanDashboard from './components/PenjualanDashboard'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('estimasi')

  return (
    <div className="main-layout">
      {/* Sidebar / Top Navigation Sederhana */}
      <nav className="navbar">
        <h1 className="brand">Toko Laptop Seken</h1>
        <div className="nav-menus">
          <button 
            className={`nav-btn ${activeTab === 'estimasi' ? 'active' : ''}`}
            onClick={() => setActiveTab('estimasi')}
          >
            🤖 AI Estimasi
          </button>
          <button 
            className={`nav-btn ${activeTab === 'penjualan' ? 'active' : ''}`}
            onClick={() => setActiveTab('penjualan')}
          >
            📊 Data Penjualan
          </button>
        </div>
      </nav>

      {/* Konten Utama (Berubah sesuai Tab yang dipilih) */}
      <div className="content-area">
        {activeTab === 'estimasi' && <EstimasiForm />}
        {activeTab === 'penjualan' && <PenjualanDashboard />}
      </div>
    </div>
  )
}

export default App