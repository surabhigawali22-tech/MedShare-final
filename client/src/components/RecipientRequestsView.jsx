import React, { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle2, QrCode, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RecipientRequestsView({ onOpenScanner, onSelectTrail }) {
  const { token, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/requests/outgoing', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to load outgoing requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [token, user]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            My Requested Allocations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track donation requests and scan donor QR codes during physical handover.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchRequests}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
          <button
            onClick={onOpenScanner}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm flex items-center space-x-1.5"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan Handover QR</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mx-auto mb-2" />
          <p className="text-sm">Loading your requested medicines...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-300">No active medicine requests</h3>
          <p className="text-xs text-slate-500 mt-1">Browse surplus listings and click "Request Stock" to get started.</p>
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
                  <span>Donor: <strong className="text-slate-700 dark:text-slate-300">{r.donor_name} ({r.donor_org_type})</strong></span>
                  <span>Quantity: <strong className="text-slate-700 dark:text-slate-300">{r.quantity} {r.unit}</strong></span>
                  <span>Batch: <strong className="font-mono">{r.batch_no}</strong></span>
                  <span>Expiry: <strong>{r.expiry_date}</strong></span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {r.status === 'ACCEPTED' && (
                  <button
                    onClick={onOpenScanner}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm flex items-center space-x-1.5"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Scan QR to Confirm Receipt</span>
                  </button>
                )}

                <button
                  onClick={() => onSelectTrail(r.trail_id)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  title="View Public Batch Trail"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
