import React, { useState } from 'react';
import { X, Lock, Mail, User, Phone, MapPin, Building, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { switchAccount, setUser } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('donor');
  const [orgType, setOrgType] = useState('pharmacy');

  // Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister
      ? { name, email, password, role, org_type: orgType, phone, address }
      : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      localStorage.setItem('medshare_token', data.token);
      setUser(data.user);
      setSuccess(data.message || 'Signed in successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            {isRegister ? 'Create MedShare Account' : 'Sign in to MedShare'}
          </h3>
          <button onClick={onClose} className="text-slate-400">✕</button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-800 text-xs font-semibold">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-semibold">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {isRegister && (
            <>
              {/* Role selection */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Select Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {['donor', 'recipient', 'verifier'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`p-2 rounded-xl border capitalize font-bold ${
                        role === r ? 'bg-teal-600 text-white border-teal-600' : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Org Type */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Organisation Type</label>
                <select
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                >
                  {role === 'donor' && (
                    <>
                      <option value="pharmacy">Licensed Retail Pharmacy</option>
                      <option value="hospital">Hospital / Medical Center</option>
                      <option value="distributor">Pharmaceutical Distributor</option>
                      <option value="individual">Individual Donor</option>
                    </>
                  )}
                  {role === 'recipient' && (
                    <>
                      <option value="ngo">Registered Health NGO (Requires Verification)</option>
                      <option value="clinic">Charitable Clinic (Requires Verification)</option>
                      <option value="individual">Individual Low-Income Patient</option>
                    </>
                  )}
                  {role === 'verifier' && (
                    <>
                      <option value="hospital">Registered Clinical Pharmacist</option>
                      <option value="pharmacy">Registered Retail Pharmacist</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Full Name / Organisation Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apex Health Clinic"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98200 00000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Address / Area</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Bandra West, Mumbai"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. user@medshare.org"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              {loading ? 'Processing...' : isRegister ? 'Register Account' : 'Sign In'}
            </button>
          </div>
        </form>

        <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-teal-600 font-semibold hover:underline"
          >
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register now"}
          </button>
        </div>
      </div>
    </div>
  );
}
