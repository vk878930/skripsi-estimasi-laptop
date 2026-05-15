import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../api';

// #1 — Credentials hint removed from UI
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
      const response = await api.post('/api/login', { username, password });

      const { token, role } = response.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('username', username);

      toast.success(`Selamat datang, ${username}!`);

      if (role === 'boss') {
        navigate('/boss-dashboard');
      } else {
        navigate('/penjualan');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Login gagal, periksa koneksi server.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
      <div className="form-card page-transition" style={{ maxWidth: '440px', width: '100%', padding: '40px 32px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '1.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '2.2rem' }}>💻</span> Laptop Estimator AI
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--clr-text-secondary)', marginBottom: '32px' }}>Silakan login ke akun Anda</p>

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
      </div>
    </div>
  );
}
