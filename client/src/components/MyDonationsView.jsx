import React, { useState, useEffect } from 'react';
import { Package, Clock, ShieldCheck, CheckCircle2, XCircle, AlertCircle, FileText, ArrowRight, RefreshCw, Calendar, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MyDonationsView({ onOpenNewDonation }) {
  const { token, user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const fetchMyDonations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/donations/my', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setDonations(data.donations || []);
      }
    } catch (err) {
      console.error('Failed to fetch my donations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyDonations();
  }, [token, user]);

  const filteredDonations = donations.filter(d => {
    if (filter === 'ALL') return true;
    if (filter === 'ACTIVE') return ['LISTED', 'UNDER_REVIEW', 'APPROVED', 'MATCHED'].includes(d.status);
    if (filter === 'COMPLETED') return d.status === 'COMPLETED';
    if (filter === 'REJECTED') return d.status === 'REJECTED';
    if (filter === 'EXPIRED') return d.status === 'EXPIRED';
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</span>;
      case 'UNDER_REVIEW':
      case 'LISTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center"><Clock className="w-3 h-3 mr-1" /> Pharmacist Review</span>;
      case 'MATCHED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> Matched</span>;
      case 'HANDED_OVER':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> Handed Over</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center"><XCircle className="w-3 h-3 mr-1" /> Rejected</span>;
      case 'EXPIRED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300 flex items-center"><AlertCircle className="w-3 h-3 mr-1" /> Expired</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  const steps = ['LISTED', 'UNDER_REVIEW', 'APPROVED', 'MATCHED', 'HANDED_OVER', 'COMPLETED'];

  const getStepIndex = (status) => {
    if (status === 'REJECTED') return -1;
    if (status === 'EXPIRED') return -2;
    return steps.indexOf(status);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <Package className="w-6 h-6 text-teal-600" />
            <span>My Medicine Donations</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track verification status, safety compliance, and distribution timeline for your listings.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchMyDonations}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh listings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onOpenNewDonation}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-600/20 transition-all flex items-center space-x-2"
          >
            <span>+ Donate Medicine</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        {['ALL', 'ACTIVE', 'COMPLETED', 'REJECTED', 'EXPIRED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filter === tab
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Donations List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mb-2" />
          <p className="text-sm">Loading your donations...</p>
        </div>
      ) : filteredDonations.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No donations in this category</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You haven't listed any medicines matching the selected filter yet.
          </p>
          <button
            onClick={onOpenNewDonation}
            className="mt-4 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors"
          >
            List a Medicine Now
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDonations.map((d) => {
            const currentStep = getStepIndex(d.status);

            return (
              <div key={d.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 hover:border-slate-300 transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-bold text-slate-900">{d.medicine_name}</span>
                      {getStatusBadge(d.status)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>Generic: <strong className="text-slate-700">{d.generic_name}</strong></span>
                      <span>Category: <strong className="text-slate-700">{d.category}</strong></span>
                      <span>Batch: <strong className="font-mono text-slate-700">{d.batch_no}</strong></span>
                      <span className="font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-teal-200">
                        {d.trail_id}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 text-right">
                    <div>
                      <div className="text-xs text-slate-400 uppercase font-semibold">Quantity</div>
                      <div className="text-base font-bold text-slate-900">{d.quantity} {d.unit}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 uppercase font-semibold">Expiry Date</div>
                      <div className="text-sm font-bold text-slate-900">{d.expiry_date}</div>
                      <div className="text-[11px] text-teal-600 font-semibold">{d.days_remaining} days left</div>
                    </div>
                    <div className="pl-3 border-l border-slate-100">
                      <div className="text-xs text-slate-400 uppercase font-semibold">Safety Score</div>
                      <div className="text-lg font-black text-teal-700">{d.safety_score}<span className="text-xs font-normal text-slate-400">/100</span></div>
                    </div>
                  </div>
                </div>

                {/* Timeline Progress */}
                {d.status !== 'REJECTED' && d.status !== 'EXPIRED' ? (
                  <div className="pt-4">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Lifecycle Timeline</div>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                      {steps.map((step, idx) => {
                        const isDone = currentStep >= idx;
                        const isCurrent = currentStep === idx;

                        return (
                          <div
                            key={step}
                            className={`p-2 rounded-xl border text-[11px] font-bold transition-colors ${
                              isCurrent
                                ? 'bg-teal-500 text-white border-teal-500 shadow-sm'
                                : isDone
                                ? 'bg-teal-50 text-teal-900 border-teal-200'
                                : 'bg-slate-50 text-slate-400 border-slate-200'
                            }`}
                          >
                            {step.replace('_', ' ')}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="pt-4">
                    {d.status === 'REJECTED' && (
                      <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                        <span className="font-bold">Pharmacist Inspection Note:</span> {d.verification_remarks || 'Packaging damaged or failed storage compliance requirements.'}
                      </div>
                    )}
                    {d.status === 'EXPIRED' && (
                      <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-700">
                        <span className="font-bold">System Notice:</span> This item reached its expiry date and has been archived into the Disposal Queue for safe destruction.
                      </div>
                    )}
                  </div>
                )}

                {/* Pharmacist Review Feedback */}
                {d.verification_remarks && d.status === 'APPROVED' && (
                  <div className="mt-3 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-800 flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Pharmacist Endorsement:</span> {d.verification_remarks}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
