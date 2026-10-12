import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, ShieldCheck, CheckCircle2, RefreshCw, ExternalLink, Calendar, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DisposalQueueView() {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [guidelines, setGuidelines] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState(null);
  const [disposalMethod, setDisposalMethod] = useState('authorized_pharmacy_takeback');
  const [reason, setReason] = useState('Product expired prior to redistribution');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/disposal');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setGuidelines(data.guidelines || null);
      }
    } catch (e) {
      console.error('Failed to load disposal queue:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleLogDisposal = async (e) => {
    e.preventDefault();
    if (!activeItem) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/disposal/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          source_type: activeItem.source_type,
          source_id: activeItem.source_id,
          method: disposalMethod,
          reason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log disposal');

      setMessage({ type: 'success', text: 'Safe disposal recorded successfully!' });
      setActiveItem(null);
      fetchQueue();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Trash2 className="w-6 h-6 text-rose-600" />
            <span>Regulated Disposal Queue</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Safe tracking and decommissioning of expired pharmaceuticals to prevent environmental and patient harm.
          </p>
        </div>

        <button
          onClick={fetchQueue}
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

      {/* Statutory Guidance Card */}
      {guidelines && (
        <div className="p-6 rounded-3xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
          <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
            <BookOpen className="w-4 h-4 text-amber-600" />
            <span>Statutory Safe Disposal Guidelines (Bio-Medical Waste Management)</span>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            {guidelines.summary}
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            {guidelines.recommendedMethods?.map((m) => (
              <div key={m.key} className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-2xl border border-amber-200/60 dark:border-amber-800/60 text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">{m.label}</span>
                <span className="text-[11px] text-slate-500">{m.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Queue items */}
      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mx-auto mb-2" />
          <p className="text-sm">Loading disposal queue...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
          <ShieldCheck className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 dark:text-white">Disposal Queue Empty</h3>
          <p className="text-xs text-slate-500 mt-1">No expired medicines are currently pending destruction logging.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div
              key={`${item.source_type}-${item.source_id}-${idx}`}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-base text-slate-900 dark:text-white">
                    {item.medicine_name}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
                    EXPIRED
                  </span>
                  <span className="text-[11px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    Source: {item.source_type}
                  </span>
                </div>

                <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Batch: <strong className="font-mono">{item.batch_no || 'N/A'}</strong></span>
                  <span>Quantity: <strong>{item.quantity} {item.unit}</strong></span>
                  <span>Expired on: <strong className="text-rose-600">{item.expiry_date}</strong></span>
                  <span>Owner: {item.owner_name}</span>
                </div>

                {item.disposed_at && (
                  <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Disposed on {new Date(item.disposed_at).toLocaleDateString()} via {item.disposal_method}</span>
                  </div>
                )}
              </div>

              <div>
                {!item.disposed_at ? (
                  <button
                    onClick={() => setActiveItem(item)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center space-x-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Log Safe Disposal</span>
                  </button>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-semibold">
                    Decommissioned
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log Disposal Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Log Safe Disposal Record
              </h3>
              <button onClick={() => setActiveItem(null)} className="text-slate-400">✕</button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs">
              <div className="font-bold text-slate-900 dark:text-white">{activeItem.medicine_name}</div>
              <div className="text-slate-500">Expired: {activeItem.expiry_date} • {activeItem.quantity} {activeItem.unit}</div>
            </div>

            <form onSubmit={handleLogDisposal} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Disposal Protocol Method <span className="text-rose-500">*</span>
                </label>
                <select
                  value={disposalMethod}
                  onChange={(e) => setDisposalMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="authorized_pharmacy_takeback">Authorized Pharmacy Take-Back Bin (Recommended)</option>
                  <option value="high_temp_incineration">High-Temperature Incineration (&gt;1000°C)</option>
                  <option value="chemical_inactivation">Chemical Inactivation & Encapsulation</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Reason / Compliance Remarks
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs"
                >
                  {submitting ? 'Recording...' : 'Submit Disposal Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
