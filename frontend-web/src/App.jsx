import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import EstimasiForm from './components/EstimasiForm'
import PenjualanDashboard from './components/PenjualanDashboard'
import BossDashboard from './components/BossDashboard'
import Login from './components/Login'
import LaporanDashboard from './components/LaporanDashboard'
import './App.css'

// Komponen pelindung rute
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Jika role tidak diizinkan, kembalikan ke default halaman mereka
    return <Navigate to={role === 'boss' ? '/boss-dashboard' : '/penjualan'} replace />;
  }

  return children;
};

// Layout Utama
const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role');
  const username = localStorage.getItem('username');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="main-layout">
      <nav className="navbar">
        <h1 className="brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          💻 Toko Laptop Seken
          <span style={{ fontSize: '0.8rem', padding: '4px 8px', backgroundColor: '#e2e8f0', color: '#475569', borderRadius: '4px' }}>
            {role?.toUpperCase()}
          </span>
        </h1>
        
        <div className="nav-menus">
          {role === 'boss' && (
            <button 
              className={`nav-btn ${location.pathname === '/boss-dashboard' ? 'active' : ''}`}
              onClick={() => navigate('/boss-dashboard')}
            >
              📈 Dashboard
            </button>
          )}
          
          <button 
            className={`nav-btn ${location.pathname === '/estimasi' ? 'active' : ''}`}
            onClick={() => navigate('/estimasi')}
          >
            🤖 AI Estimasi
          </button>
          
          <button 
            className={`nav-btn ${location.pathname === '/penjualan' ? 'active' : ''}`}
            onClick={() => navigate('/penjualan')}
          >
            📊 Data Penjualan
          </button>

          <button 
            className={`nav-btn ${location.pathname === '/laporan' ? 'active' : ''}`}
            onClick={() => navigate('/laporan')}
          >
            📄 Laporan
          </button>

          <button className="nav-btn" onClick={handleLogout} style={{ color: '#ef4444' }}>
            🚪 Logout ({username})
          </button>
        </div>
      </nav>
      <div className="content-area">
        {children}
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/boss-dashboard" element={
          <ProtectedRoute allowedRoles={['boss']}>
            <MainLayout><BossDashboard /></MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/estimasi" element={
          <ProtectedRoute allowedRoles={['admin', 'boss']}>
            <MainLayout><EstimasiForm /></MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/penjualan" element={
          <ProtectedRoute allowedRoles={['admin', 'boss']}>
            <MainLayout><PenjualanDashboard /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/laporan" element={
          <ProtectedRoute allowedRoles={['admin', 'boss']}>
            <MainLayout><LaporanDashboard /></MainLayout>
          </ProtectedRoute>
        } />

        {/* Redirect root ke halaman yang sesuai */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App