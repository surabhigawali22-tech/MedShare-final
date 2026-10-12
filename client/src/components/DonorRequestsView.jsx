import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, QrCode, RefreshCw, AlertCircle, User, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DonorRequestsView() {
  const { token, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHandover, setSelectedHandover] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/requests/incoming', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to load incoming requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [token, user]);

  const handleRespond = async (requestId, action) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/requests/${requestId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update request');

      setMessage({ type: 'success', text: data.message });
      fetchRequests();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewQR = async (requestId) => {
    try {
      const res = await fetch(`/api/handovers/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedHandover(data.handover);
      }
    } catch (e) {
      console.error('Failed to load handover details:', e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Incoming Medicine Requests
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review allocations requested by verified clinics, NGOs, and low-income patients.
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mx-auto mb-2" />
          <p className="text-sm">Loading incoming requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-300">No incoming requests yet</h3>
          <p className="text-xs text-slate-500 mt-1">When clinics or recipients request your approved donations, they will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div
              key={r.id}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-base text-slate-900 dark:text-white">
                    {r.medicine_name}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    r.status === 'ACCEPTED'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : r.status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : r.status === 'DECLINED'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {r.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Recipient: <strong className="text-slate-700 dark:text-slate-300">{r.recipient_name} ({r.recipient_org_type})</strong></span>
                  <span>Requested: <strong className="text-slate-700 dark:text-slate-300">{r.quantity} {r.unit}</strong></span>
                  <span>Batch: <strong className="font-mono">{r.batch_no}</strong></span>
                  <span>Match Score: <strong className="text-teal-600">{r.match_score}</strong></span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {r.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleRespond(r.id, 'ACCEPT')}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm flex items-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Accept Match</span>
                    </button>
                    <button
                      onClick={() => handleRespond(r.id, 'DECLINE')}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-bold text-xs"
                    >
                      <span>Decline</span>
                    </button>
                  </>
                )}

                {(r.status === 'ACCEPTED' || r.status === 'COMPLETED') && (
                  <button
                    onClick={() => handleViewQR(r.id)}
                    className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs shadow-sm flex items-center space-x-1.5"
                  >
                    <QrCode className="w-3.5 h-3.5 text-teal-400" />
                    <span>View Handover QR</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Code Presentation Modal */}
      {selectedHandover && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Handover QR Code
              </h3>
              <button onClick={() => setSelectedHandover(null)} className="text-slate-400">✕</button>
            </div>

            <p className="text-xs text-slate-500">
              Present this QR to <strong>{selectedHandover.recipient_name}</strong> during pickup/delivery.
            </p>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-inner flex justify-center">
              <img src={selectedHandover.qr_code} alt="Handover QR" className="w-56 h-56" />
            </div>

            <div className="text-xs font-mono text-slate-600 dark:text-slate-300">
              Trail ID: {selectedHandover.trail_id}
            </div>

            <button
              onClick={() => setSelectedHandover(null)}
              className="w-full py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
