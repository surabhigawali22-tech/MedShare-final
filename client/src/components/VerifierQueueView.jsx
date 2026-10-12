import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Clock, AlertTriangle, User, Calendar, RefreshCw, FileText, Image } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function VerifierQueueView({ onQueueCountChange }) {
  const { token, user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionItem, setActionItem] = useState(null); // item selected for modal
  const [actionType, setActionType] = useState('APPROVED'); // 'APPROVED' | 'REJECTED'
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/verifications/queue', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setQueue(data.queue || []);
        if (onQueueCountChange) onQueueCountChange(data.queue?.length || 0);
      }
    } catch (err) {
      console.error('Failed to fetch verification queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [token, user]);

  const handleOpenAction = (item, type) => {
    setActionItem(item);
    setActionType(type);
    setRemarks(
      type === 'APPROVED'
        ? 'Inspected blister pack integrity. Clear manufacturer batch label and expiry date. Safe for redistribution.'
        : 'Packaging appears damaged or seal broken. Fails quality safety guidelines.'
    );
  };

  const handleCloseModal = () => {
    setActionItem(null);
    setRemarks('');
  };

  const handleSubmitDecision = async (e) => {
    e.preventDefault();
    if (!actionItem || !remarks.trim()) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/verifications/${actionItem.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          decision: actionType,
          remarks: remarks.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit verification');

      setFeedback({
        type: 'success',
        message: `Donation batch ${actionItem.batch_no} was successfully ${actionType.toLowerCase()}!`
      });

      handleCloseModal();
      fetchQueue();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900">Pharmacist Verification Queue</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              {queue.length} Pending
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Review listed medicines for packaging seal, storage conditions, batch authenticity, and expiry safety.
          </p>
        </div>

        <button
          onClick={fetchQueue}
          className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center space-x-2 text-xs font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-sm flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Queue Items */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mb-2" />
          <p className="text-sm">Loading verification queue...</p>
        </div>
      ) : queue.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center">
          <ShieldCheck className="w-12 h-12 text-teal-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Review Queue Clear</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            All submitted medicine donations have been verified. New donor submissions will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {queue.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 hover:border-slate-300 transition-all flex flex-col lg:flex-row gap-6 justify-between"
            >
              {/* Left Column: Medicine Details */}
              <div className="space-y-4 flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-slate-900">{item.medicine_name}</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {item.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Generic: <strong className="text-slate-700">{item.generic_name}</strong> • Category: <strong className="text-slate-700">{item.category}</strong>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold">Batch No</span>
                    <span className="font-mono font-bold text-slate-800">{item.batch_no}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Expiry Date</span>
                    <span className="font-bold text-slate-800">{item.expiry_date}</span>
                    <span className="text-[11px] text-teal-600 font-semibold block">({item.days_remaining}d left)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Quantity</span>
                    <span className="font-bold text-slate-800">{item.quantity} {item.unit}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Packaging</span>
                    <span className="font-bold text-emerald-700 capitalize">{item.packaging}</span>
                  </div>
                </div>

                {/* Storage & Prescription Badges */}
                <div className="flex items-center space-x-2">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                    item.storage_condition === 'cold-chain'
                      ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    Storage: {item.storage_condition}
                  </span>

                  {item.requires_prescription === 1 && (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                      Prescription Required
                    </span>
                  )}

                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    Trail ID: {item.trail_id}
                  </span>
                </div>
              </div>

              {/* Middle Column: Donor Track Record */}
              <div className="lg:w-72 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between text-xs space-y-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Donor Profile</div>
                  <div className="font-bold text-slate-900 text-sm">{item.donor_name}</div>
                  <div className="text-slate-500 capitalize">{item.donor_org_type} • {item.donor_address || 'Address registered'}</div>
                </div>

                <div className="pt-2 border-t border-slate-200/60">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">Donor Track Record</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200">
                      <span className="block font-bold text-slate-800">{item.donor_total_donations || 0}</span>
                      <span className="text-[10px] text-slate-400">Total</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200">
                      <span className="block font-bold text-emerald-600">{item.donor_completed || 0}</span>
                      <span className="text-[10px] text-slate-400">Complete</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200">
                      <span className="block font-bold text-rose-600">{item.donor_rejections || 0}</span>
                      <span className="text-[10px] text-slate-400">Rejected</span>
                    </div>
                  </div>
                </div>

                {item.image_url ? (
                  <div className="pt-2 border-t border-slate-200/60">
                    <span className="text-[11px] text-slate-400 block mb-1">Packaging Photo Attached</span>
                    <a
                      href={item.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-teal-600 font-bold hover:underline flex items-center"
                    >
                      <Image className="w-3.5 h-3.5 mr-1" /> View High-Res Photo
                    </a>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic">No packaging photo attached</div>
                )}
              </div>

              {/* Right Column: Actions */}
              <div className="lg:w-48 flex flex-row lg:flex-col justify-end lg:justify-center gap-2.5">
                <button
                  onClick={() => handleOpenAction(item, 'APPROVED')}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center space-x-1.5 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Verify</span>
                </button>
                <button
                  onClick={() => handleOpenAction(item, 'REJECTED')}
                  className="w-full py-2.5 px-4 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Listing</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verification Decision Modal */}
      {actionItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                Confirm {actionType === 'APPROVED' ? 'Approval' : 'Rejection'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div className="font-bold text-slate-900">{actionItem.medicine_name}</div>
              <div className="text-slate-500">Batch: {actionItem.batch_no} • {actionItem.quantity} {actionItem.unit}</div>
              <div className="text-slate-500">Donor: {actionItem.donor_name}</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Pharmacist Clinical Remarks <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                placeholder="Enter clinical observations, seal inspection results, or reason for rejection..."
                required
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || !remarks.trim()}
                onClick={handleSubmitDecision}
                className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-all ${
                  actionType === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submitting ? 'Recording...' : `Confirm ${actionType}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
