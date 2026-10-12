import React, { useState, useEffect } from 'react';
import { X, Sparkles, MapPin, Clock, ShieldCheck, AlertCircle, CheckCircle2, ChevronRight, Award, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ShelfLifeMatchModal({ donationId, isOpen, onClose, onRequestMatch }) {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);

  useEffect(() => {
    if (!isOpen || !donationId) return;

    async function fetchMatches() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/donations/${donationId}/matches`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to load matches');
        }
        const json = await res.json();
        setData(json);
        if (json.bestMatch) {
          setSelectedMatch(json.bestMatch);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
  }, [isOpen, donationId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Shelf-Life Match Engine</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 font-bold">
                  AI Multi-Factor
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formula: 45% Usability + 30% Proximity + 15% Urgency + 10% Trust
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="p-16 text-center text-slate-400">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium">Computing recipient match scores & proximity vectors...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-800 text-sm">
              {error}
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Medicine Context Banner */}
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold text-[11px]">Matching Surplus</span>
                  <span className="font-bold text-slate-900 dark:text-white text-base">{data.donation.medicine_name}</span>
                  <span className="text-slate-500 ml-2 font-mono">({data.donation.batch_no})</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Quantity</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{data.donation.quantity} {data.donation.unit}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Shelf Life</span>
                    <span className="font-bold text-teal-600 dark:text-teal-400">{data.donation.days_remaining} days</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Safety Score</span>
                    <span className="font-bold text-emerald-600">{data.donation.safety_score}/100</span>
                  </div>
                </div>
              </div>

              {/* Best Match Highlight Callout */}
              {data.bestMatch && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent border-2 border-teal-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-xl bg-teal-600 text-white font-black text-sm flex-shrink-0">
                      ★ 1
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                          Recommended Best Match
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-teal-600 text-white">
                          Score {data.bestMatch.totalScore}
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">
                        {data.bestMatch.recipient.name}
                      </h4>
                      <p className="text-xs text-slate-500 capitalize">
                        {data.bestMatch.recipient.org_type} • {data.bestMatch.distance_km} km away • {data.bestMatch.recipient.address}
                      </p>
                    </div>
                  </div>

                  {data.bestMatch.urgent_need && (
                    <div className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-xs font-bold border border-amber-300">
                      ⚡ Open Urgent Need for this medicine!
                    </div>
                  )}
                </div>
              )}

              {/* Match Rankings Table with Explainable Score Components */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  All Ranked Recipients ({data.matches.length})
                </h3>

                <div className="space-y-3">
                  {data.matches.map((item, index) => {
                    const b = item.breakdown;
                    const isSelected = selectedMatch?.recipient.id === item.recipient.id;

                    return (
                      <div
                        key={item.recipient.id}
                        onClick={() => setSelectedMatch(item)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50/40 dark:bg-teal-950/20 border-teal-500 ring-2 ring-teal-500/20'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <span className="font-black text-sm text-slate-400 w-6">#{index + 1}</span>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-sm text-slate-900 dark:text-white">
                                  {item.recipient.name}
                                </span>
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                  {item.recipient.org_type}
                                </span>
                                {item.recipient.verified === 1 && (
                                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" title="Verified NGO/Clinic" />
                                )}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center space-x-3 mt-0.5">
                                <span className="flex items-center"><MapPin className="w-3 h-3 mr-0.5" /> {item.distance_km} km</span>
                                <span>Est. Daily Demand: {item.avg_daily_demand} units/day</span>
                                {item.urgent_need && (
                                  <span className="text-amber-600 font-bold">Urgent Need Active</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <span className="text-[11px] text-slate-400 block font-semibold">Total Match Score</span>
                              <span className="text-xl font-black text-teal-600 dark:text-teal-400">{item.totalScore}</span>
                              <span className="text-xs text-slate-400 font-normal"> / 100</span>
                            </div>
                          </div>
                        </div>

                        {/* Explainable Factor Breakdown Bar */}
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          {/* Usability 45% */}
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                            <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                              <span>Usability (45%)</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{b.usability.score}/100</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div className="h-full bg-teal-500" style={{ width: `${b.usability.score}%` }} />
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-1">
                              {b.usability.expectedUseDays}d use window
                            </span>
                          </div>

                          {/* Proximity 30% */}
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                            <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                              <span>Proximity (30%)</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{b.proximity.score}/100</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${b.proximity.score}%` }} />
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-1">
                              {item.distance_km} km away
                            </span>
                          </div>

                          {/* Urgency 15% */}
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                            <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                              <span>Urgency (15%)</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{b.urgency.score}/100</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div className="h-full bg-amber-500" style={{ width: `${b.urgency.score}%` }} />
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-1">
                              {b.urgency.hasUrgentNeed ? 'High Priority' : 'Routine'}
                            </span>
                          </div>

                          {/* Trust 10% */}
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                            <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                              <span>Trust (10%)</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{b.trust.score}/100</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div className="h-full bg-purple-500" style={{ width: `${b.trust.score}%` }} />
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-1">
                              {b.trust.verified ? 'Verified NGO' : 'Individual'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <span className="text-xs text-slate-500">
            Click any recipient to view their breakdown and contact profile
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold hover:bg-slate-800"
          >
            Close Matches
          </button>
        </div>
      </div>
    </div>
  );
}
