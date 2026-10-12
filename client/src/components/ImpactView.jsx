import React, { useState, useEffect } from 'react';
import { Award, Trophy, Sparkles, TrendingUp, Heart, Users, Leaf, IndianRupee, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ImpactView() {
  const { token, user } = useAuth();
  const [personalImpact, setPersonalImpact] = useState(null);
  const [platformTotals, setPlatformTotals] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchImpact = async () => {
    setLoading(true);
    try {
      // Leaderboard
      const lRes = await fetch('/api/impact/leaderboard');
      if (lRes.ok) {
        const lData = await lRes.json();
        setLeaderboard(lData.leaderboard || []);
        setPlatformTotals(lData.platform_totals || null);
      }

      // Personal impact
      const pRes = await fetch('/api/impact/me', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (pRes.ok) {
        const pData = await pRes.json();
        setPersonalImpact(pData.impact || null);
      }
    } catch (e) {
      console.error('Failed to load impact stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImpact();
  }, [token, user]);

  const getBadgeIcon = (badge) => {
    switch (badge) {
      case 'Platinum':
        return '👑 Platinum Guardian';
      case 'Gold':
        return '🥇 Gold Hero';
      case 'Silver':
        return '🥈 Silver Champion';
      default:
        return '🥉 Bronze Contributor';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-teal-600" />
            <span>Impact & Reputation Score</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quantifying waste prevention, lives touched, and recognizing top healthcare contributors.
          </p>
        </div>
        <button
          onClick={fetchImpact}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
        </button>
      </div>

      {/* Platform Totals Banner */}
      {platformTotals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600">
              <Leaf className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-semibold">Waste Diverted</span>
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {platformTotals.total_waste_avoided_kg} kg
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-semibold">Units Rescued</span>
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {platformTotals.total_units_rescued.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-semibold">Economic Value</span>
              <span className="text-xl font-black text-slate-900 dark:text-white">
                ₹{platformTotals.total_value_saved_inr.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-semibold">Active Network</span>
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {platformTotals.total_donors + platformTotals.total_recipients} Partners
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Personal Impact Card for Logged In User */}
      {personalImpact && (
        <div className="bg-gradient-to-br from-teal-800 via-teal-900 to-slate-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Your Personal Contribution</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight">{user?.name}</h2>
              <p className="text-xs text-teal-200/80 max-w-md">
                Points are earned ONLY for verified, completed donations with bonuses for near-expiry rescues and urgent need responses.
              </p>
            </div>

            <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <Award className="w-10 h-10 text-teal-300" />
              <div>
                <span className="text-[11px] text-teal-200 uppercase font-bold block">Current Tier</span>
                <span className="text-lg font-black">{getBadgeIcon(personalImpact.badge)}</span>
                <span className="text-xs text-teal-300 block">{personalImpact.reputation_points} cumulative points</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <span className="text-xs text-teal-200/70 block">Medicines Donated</span>
              <span className="text-2xl font-black mt-0.5 block">{personalImpact.total_donations}</span>
            </div>
            <div>
              <span className="text-xs text-teal-200/70 block">Units Delivered</span>
              <span className="text-2xl font-black mt-0.5 block">{personalImpact.total_units_donated}</span>
            </div>
            <div>
              <span className="text-xs text-teal-200/70 block">Organisations Helped</span>
              <span className="text-2xl font-black mt-0.5 block">{personalImpact.recipients_helped}</span>
            </div>
            <div>
              <span className="text-xs text-teal-200/70 block">Waste Avoided</span>
              <span className="text-2xl font-black mt-0.5 block">{personalImpact.waste_avoided_kg} kg</span>
            </div>
          </div>
        </div>
      )}

      {/* Public Leaderboard */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <span>Donor Hall of Fame (Top Rescuers)</span>
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {leaderboard.map((item, idx) => (
            <div key={item.id} className="py-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <span className={`w-6 font-black text-center ${
                  idx === 0 ? 'text-amber-500 text-sm' : idx === 1 ? 'text-slate-400 text-sm' : idx === 2 ? 'text-amber-700 text-sm' : 'text-slate-400'
                }`}>
                  #{idx + 1}
                </span>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block text-sm">{item.name}</span>
                  <span className="text-slate-400 capitalize">{item.org_type} • {item.completed_count || 0} completed donations</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-right">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {item.badge}
                </span>
                <span className="font-black text-teal-600 dark:text-teal-400 text-sm w-20 text-right">
                  {item.points} pts
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
