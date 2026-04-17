import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:8080/api/login', {
        username,
        password,
      });

      const { token, role } = response.data.data;
      
      // Simpan token dan role di localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('username', username);

      // Arahkan berdasarkan role
      if (role === 'boss') {
        navigate('/boss-dashboard');
      } else {
        navigate('/penjualan');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login gagal, periksa koneksi server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="form-card" style={{ maxWidth: '400px', width: '100%', padding: '40px 30px' }}>
        <h2 style={{ textAlign: 'center', color: '#0f172a', marginBottom: '10px' }}>Laptop Estimator AI</h2>
        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '30px' }}>Silakan login ke akun Anda</p>
        
        {error && (
          <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Masukkan username..."
              required 
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              required 
            />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '10px' }}>
            {loading ? 'Memproses...' : 'Login'}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: '#94a3b8' }}>
          Gunakan <strong>admin/admin123</strong> untuk Admin <br/> atau <strong>boss/boss123</strong> untuk Owner
        </div>
      </div>
    </div>
  );
}
