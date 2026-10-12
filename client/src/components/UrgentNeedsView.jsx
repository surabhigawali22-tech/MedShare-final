import React, { useState, useEffect } from 'react';
import { AlertCircle, Plus, Send, RefreshCw, MapPin, Calendar, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function UrgentNeedsView({ onOpenDonationWithMedicine }) {
  const { token, user } = useAuth();
  const [urgentNeeds, setUrgentNeeds] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form
  const [selectedMedId, setSelectedMedId] = useState('');
  const [quantity, setQuantity] = useState('20');
  const [neededBy, setNeededBy] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchNeeds = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/urgent-needs');
      if (res.ok) {
        const data = await res.json();
        setUrgentNeeds(data.urgent_needs || []);
      }
    } catch (e) {
      console.error('Failed to load urgent needs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNeeds();
    // Fetch medicines for modal dropdown
    fetch('/api/medicines')
      .then(res => res.json())
      .then(data => setMedicines(data.medicines || []))
      .catch(() => {});
  }, []);

  const handleCreateNeed = async (e) => {
    e.preventDefault();
    if (!selectedMedId || !neededBy) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/urgent-needs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          medicine_id: parseInt(selectedMedId, 10),
          quantity: parseInt(quantity, 10),
          needed_by: neededBy
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit urgent need');

      setMessage({ type: 'success', text: data.message });
      setShowModal(false);
      setSelectedMedId('');
      setNeededBy('');
      fetchNeeds();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            <span>Open Urgent Needs Board</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Charitable clinics and NGOs flag critical medicine deficits. Matching donors receive automated notifications.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchNeeds}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
          {(user?.role === 'recipient' || user?.role === 'admin') && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Post Urgent Need</span>
            </button>
          )}
        </div>
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
          <p className="text-sm">Loading urgent needs...</p>
        </div>
      ) : urgentNeeds.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 dark:text-white">No active urgent needs</h3>
          <p className="text-xs text-slate-500 mt-1">All hospital and clinic emergency requests are currently satisfied.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {urgentNeeds.map((need) => (
            <div
              key={need.id}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-amber-400 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                      High Urgency
                    </span>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mt-1.5">
                      {need.medicine_name}
                    </h3>
                    <p className="text-xs text-slate-500">{need.generic_name} • {need.category}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-semibold block">Needed by</span>
                    <span className="text-xs font-bold text-rose-600">{need.needed_by}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Requested Quantity</span>
                    <span className="font-bold text-slate-900 dark:text-white">{need.quantity} units</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Requesting Organisation</span>
                    <span className="font-bold text-slate-900 dark:text-white">{need.recipient_name}</span>
                    <span className="text-[10px] text-slate-400 capitalize block">{need.recipient_org_type}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-teal-600 font-semibold">
                  ⚡ {need.available_donor_stocks || 0} approved donor listings in platform
                </span>

                {(user?.role === 'donor' || user?.role === 'admin') && (
                  <button
                    onClick={() => onOpenDonationWithMedicine && onOpenDonationWithMedicine(need)}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm"
                  >
                    Donate to Fulfill
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Urgent Need Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Post Urgent Medicine Need
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleCreateNeed} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Medicine Required <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedMedId}
                  onChange={(e) => setSelectedMedId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                >
                  <option value="">Select medicine from catalog...</option>
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Quantity Needed
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Needed By Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={neededBy}
                    onChange={(e) => setNeededBy(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs"
                >
                  {submitting ? 'Broadcasting...' : 'Broadcast to Matching Donors'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
