import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';

const AdminProfile = () => {
  const navigate = useNavigate();
  const email = typeof window !== 'undefined' ? (localStorage.getItem('adminEmail') || '') : '';

  const logout = async () => {
    try {
      await api.post('/admin/auth/logout', {});
    } catch (e) {
      void e;
    }
    localStorage.removeItem('adminEmail');
    navigate('/admin/login');
  };

  return (
    <div className="space-y-4 rf-fade-in">
      <h1 className="text-2xl font-bold">Profile</h1>
      <div className="rf-card p-5 space-y-3">
        <div className="text-sm text-gray-600">Signed in as</div>
        <div className="text-lg font-semibold text-secondary">{email || 'Admin'}</div>
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            className="border border-border px-4 py-2 rounded-xl bg-white hover:bg-gray-50 transition"
            onClick={() => navigate('/admin/dashboard')}
          >
            Go to Dashboard
          </button>
          <button
            type="button"
            className="rf-btn-primary px-4 py-2 transition"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;

