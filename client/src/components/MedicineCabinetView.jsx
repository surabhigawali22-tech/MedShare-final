import React, { useState, useEffect } from 'react';
import { Pill, Plus, Trash2, HeartHandshake, AlertCircle, RefreshCw, Calendar, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MedicineCabinetView({ onPrefillDonation }) {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [medicineName, setMedicineName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error('Failed to load cabinet items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [token, user]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!medicineName.trim() || !expiryDate) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          medicine_name: medicineName.trim(),
          expiry_date: expiryDate,
          quantity: parseInt(quantity, 10)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add item');

      setShowAddModal(false);
      setMedicineName('');
      setExpiryDate('');
      setQuantity('1');
      fetchItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchItems();
      }
    } catch (e) {
      console.error('Delete item failed:', e);
    }
  };

  const getExpiryBadge = (item) => {
    const days = item.days_remaining;
    if (days <= 0) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300">
          Expired ({Math.abs(days)}d ago)
        </span>
      );
    }
    if (days > 90) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          ● Green: {days}d safe (&gt;90d)
        </span>
      );
    }
    if (days >= 30) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          ▲ Amber: {days}d left (30-90d)
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
        ■ Red: {days}d left (&lt;30d)
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Pill className="w-6 h-6 text-teal-600" />
            <span>My Medicine Cabinet</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track household and personal medication expiries with color-coded safety monitoring.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchItems}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medicine to Cabinet</span>
          </button>
        </div>
      </div>

      {/* Colour Code Legend */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-bold text-slate-600 dark:text-slate-300">Expiry Visual Coding:</span>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center space-x-1 text-emerald-700 dark:text-emerald-400 font-semibold">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>&gt;90 days (Healthy / Eligible for donation)</span>
          </span>
          <span className="flex items-center space-x-1 text-amber-700 dark:text-amber-400 font-semibold">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span>30–90 days (Expiring soon)</span>
          </span>
          <span className="flex items-center space-x-1 text-rose-700 dark:text-rose-400 font-semibold">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span>&lt;30 days (High urgency / Near expiry)</span>
          </span>
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mx-auto mb-2" />
          <p className="text-sm">Loading your medicine cabinet...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
          <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-300">Your cabinet is currently empty</h3>
          <p className="text-xs text-slate-500 mt-1">Add medications to monitor expiries and donate unneeded sealed stock.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs"
          >
            + Add First Medicine
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {item.medicine_name}
                  </h3>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-lg"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                  <div>Quantity: <strong className="text-slate-700 dark:text-slate-300">{item.quantity} units</strong></div>
                  <div>Expiry: <strong className="text-slate-700 dark:text-slate-300">{item.expiry_date}</strong></div>
                </div>

                <div className="mt-3">
                  {getExpiryBadge(item)}
                </div>
              </div>

              {/* Prefill Donate CTA */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                {item.days_remaining >= 90 ? (
                  <button
                    onClick={() => onPrefillDonation && onPrefillDonation(item)}
                    className="w-full py-2 px-3 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900 text-xs font-bold border border-teal-200 dark:border-teal-800 flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <HeartHandshake className="w-3.5 h-3.5" />
                    <span>Donate this Medicine</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">
                    Remaining shelf life &lt; 90 days. Not eligible for listing.
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Add Medicine to Cabinet
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400">✕</button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Medicine Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={medicineName}
                  onChange={(e) => setMedicineName(e.target.value)}
                  placeholder="e.g. Paracetamol 650mg, Cough Syrup"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Expiry Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs"
                >
                  {submitting ? 'Saving...' : 'Add to Cabinet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
