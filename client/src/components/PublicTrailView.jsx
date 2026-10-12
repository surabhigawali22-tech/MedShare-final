import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, Clock, Package, AlertCircle, ArrowLeft, Calendar, User, FileText, QrCode } from 'lucide-react';

export default function PublicTrailView({ trailId, onBack }) {
  const [trail, setTrail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!trailId) return;

    async function fetchTrail() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/trail/${trailId}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Batch trail not found');
        }
        const data = await res.json();
        setTrail(data.trail);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTrail();
  }, [trailId]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to App</span>
        </button>

        <span className="text-xs font-mono text-slate-400">
          Public Ledger Verification ID: {trailId}
        </span>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading verifiable batch trail registry...</p>
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-rose-200 text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="font-bold text-slate-800 dark:text-white text-lg">Batch Trail Not Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">{error}</p>
        </div>
      ) : trail ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Header Card */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {trail.medicine_name}
                </h1>
                {trail.is_expired ? (
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
                    EXPIRED
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" /> VALID MEDICINE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Generic: <strong className="text-slate-700 dark:text-slate-300">{trail.generic_name}</strong> • Category: <strong className="text-slate-700 dark:text-slate-300">{trail.category}</strong>
              </p>
            </div>

            <div className="flex items-center space-x-6 text-right">
              <div>
                <span className="text-[11px] text-slate-400 block font-semibold uppercase">Batch Number</span>
                <span className="font-mono text-base font-bold text-slate-900 dark:text-white">{trail.batch_no}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-semibold uppercase">Safety Score</span>
                <span className="text-xl font-black text-teal-600 dark:text-teal-400">{trail.safety_score}<span className="text-xs text-slate-400">/100</span></span>
              </div>
            </div>
          </div>

          {/* Key Facts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Quantity</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{trail.quantity} {trail.unit}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Expiry Date</span>
              <span className={`font-bold ${trail.is_expired ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}`}>
                {trail.expiry_date}
              </span>
              <span className="text-[10px] text-slate-400 block">({trail.days_remaining}d remaining)</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Packaging</span>
              <span className="font-bold text-emerald-700 capitalize">{trail.packaging}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Storage Requirement</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{trail.storage_condition}</span>
            </div>
          </div>

          {/* Verification Details */}
          {trail.verification && (
            <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-xs space-y-1">
              <div className="flex items-center space-x-2 font-bold text-teal-900 dark:text-teal-200">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Verified by Pharmacist {trail.verification.verifier_name}</span>
                <span className="text-[10px] text-teal-600 font-normal">
                  on {new Date(trail.verification.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-teal-800 dark:text-teal-300 pl-6">
                Clinical Remarks: "{trail.verification.remarks}"
              </p>
            </div>
          )}

          {/* Handover Details */}
          {trail.handover && (
            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs space-y-1">
              <div className="flex items-center space-x-2 font-bold text-blue-900 dark:text-blue-200">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Handed Over & Verified by Recipient {trail.handover.recipient_name} ({trail.handover.recipient_org_type})</span>
              </div>
              <p className="text-blue-800 dark:text-blue-300 pl-6">
                QR scanned at: {trail.handover.qr_scanned_at ? new Date(trail.handover.qr_scanned_at).toLocaleString() : 'Pending confirmation'}
              </p>
            </div>
          )}

          {/* Immutable Audit Trail Timeline */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Immutable Audit Events Timeline
            </h3>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
              {trail.timeline?.map((event, idx) => (
                <div key={idx} className="relative flex items-start space-x-3 text-xs">
                  <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full bg-teal-600 ring-4 ring-white dark:ring-slate-900" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {event.action.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(event.created_at).toLocaleString()}
                      </span>
                    </div>
                    {event.actor_name && (
                      <span className="text-slate-500 block text-[11px]">
                        Actor: {event.actor_name} ({event.actor_role})
                      </span>
                    )}
                    {event.metadata_json && (
                      <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg mt-1">
                        {event.metadata_json}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
