import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { checkUserExists, sendEmailOtp } from '../../../services/api';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSendOtp = async () => {
    if (!email) return setMessage('Enter email');
    setLoading(true);
    setMessage('');
    try {
      await checkUserExists(email); // reuse existing check
      await sendEmailOtp(email, 'login'); // reuse existing otp sender
      setStep(2);
      setMessage('OTP sent to your email');
    } catch (err) {
      setMessage(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!otp) return setMessage('Enter OTP');
    setLoading(true);
    setMessage('');
    try {
      const res = await api.post('/admin/auth/login', { email, otp });
      localStorage.setItem('adminEmail', res.data.user.email);
      navigate('/admin/dashboard');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center rf-page px-4 relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/heroSectionImg/lapwithStand.jpeg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/45 to-black/20" />
      <div className="absolute inset-0 bg-hero-gradient opacity-80" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rf-card p-7 rf-soft-pop bg-white/90 backdrop-blur-md border border-white/30">
          <div className="text-center">
            <div className="text-sm font-semibold tracking-wider text-secondary/80">VornLiving</div>
            <h1 className="text-2xl font-bold text-secondary mt-1">Admin Login</h1>
            <div className="text-sm text-secondary/70 mt-1">
              {step === 1 ? 'Enter your email to get an OTP' : `Sent to ${email || 'your email'}`}
            </div>
          </div>

          {message && (
            <div className="mt-5 text-sm text-secondary bg-white/70 border border-border rounded-xl px-4 py-3">
              {message}
            </div>
          )}
        {step === 1 && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-secondary">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rf-input w-full text-secondary placeholder:text-secondary/70 bg-white"
                placeholder="admin@example.com"
              />
            </div>
            <button
              className="rf-btn-primary px-4 py-2.5 w-full transition disabled:opacity-60"
              onClick={handleSendOtp}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </div>
        )}
        {step === 2 && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-secondary">Enter OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="rf-input w-full text-secondary placeholder:text-secondary/40 text-center tracking-widest text-2xl bg-white"
                placeholder="• • • •"
                maxLength={6}
              />
            </div>
            <button
              className="rf-btn-primary px-4 py-2.5 w-full transition disabled:opacity-60"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <button
              type="button"
              className="w-full text-sm text-secondary/70 hover:text-secondary transition"
              onClick={() => { setStep(1); setOtp(''); }}
              disabled={loading}
            >
              Change Email
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
