import React from 'react';
import { HeartHandshake, ShieldCheck, ArrowRight, Clock, Award, Users, Leaf, CheckCircle2, QrCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function LandingPageView({ onExplore, onDonate, onLogin }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-16 py-6">
      {/* Hero Section */}
      <div className="relative rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-slate-950 text-white p-8 sm:p-14 overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 text-xs font-bold uppercase tracking-wider">
            <HeartHandshake className="w-4 h-4 text-teal-400" />
            <span>Digital Medicine Redistribution & Expiry Safeguard</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            Stop Medicine Waste. <br />
            <span className="text-teal-400">Save Vulnerable Lives.</span>
          </h1>

          <p className="text-base text-teal-100/90 leading-relaxed max-w-2xl">
            Billions of Rupees in valid, unexpired medicines are thrown away each year while charitable dispensaries and low-income patients suffer from shortages. MedShare bridges verified donors with vetted healthcare providers under strict pharmacist verification and AI shelf-life matching.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={onExplore}
              className="px-6 py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm shadow-lg shadow-teal-500/25 transition-all flex items-center space-x-2"
            >
              <span>Browse Surplus Catalog</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onDonate}
              className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm backdrop-blur transition-all"
            >
              Donate Unused Medicine
            </button>
          </div>
        </div>

        {/* Decorative Grid Accent */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-teal-500/10 to-transparent pointer-events-none" />
      </div>

      {/* Two Pillars Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-teal-500 transition-colors">
          <div className="h-12 w-12 rounded-2xl bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Pillar A: Medicine Donation
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Strict end-to-end custody: <strong>List → Pharmacist Verify → Multi-Factor Match → Request → QR Handover</strong>. Prescription-only and cold-chain items restricted to licensed healthcare institutions.
          </p>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 pt-2">
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>Mandatory sealed packaging & minimum 90-day shelf life</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>Multi-parameter Safety Score (0-100) on all batches</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>Tamper-evident Batch Trail with QR scanner handover</span>
            </li>
          </ul>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-amber-500 transition-colors">
          <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Pillar B: Expiry Management
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Automated daily scanning and safety decommissioning: <strong>Validation, Automated Alerts (90d, 30d, 7d), Near-Expiry Rescue, and Regulated Disposal Queue</strong>.
          </p>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 pt-2">
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span>"My Medicine Cabinet" color-coded visual tracking</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span>Pre-expiry redistribution: flags &le;60d stock for priority dispatch</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span>Safe disposal compliance log according to Bio-Medical waste rules</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Unique Features Spotlight */}
      <div className="bg-slate-900 text-white p-8 sm:p-12 rounded-3xl space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">
            Engineering Innovations
          </span>
          <h2 className="text-2xl sm:text-3xl font-black">Built for Zero Error Healthcare Safety</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-3">
            <div className="text-teal-400 font-bold text-sm">01. Shelf-Life Match Engine</div>
            <p className="text-slate-300 leading-relaxed">
              Proprietary multi-factor scoring: <strong>45% Usability</strong> (ensures recipient demand can utilize stock before expiry) + <strong>30% Proximity</strong> (Haversine formula) + <strong>15% Urgency</strong> + <strong>10% Trust</strong>.
            </p>
          </div>

          <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-3">
            <div className="text-teal-400 font-bold text-sm">02. Batch Trail with QR</div>
            <p className="text-slate-300 leading-relaxed">
              Immutable public audit trail at <code>/trail/:id</code>. Recipient QR scanning is the single cryptographically enforced gate to execute physical handover, preventing double-claiming.
            </p>
          </div>

          <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-3">
            <div className="text-teal-400 font-bold text-sm">03. Impact & Reputation Score</div>
            <p className="text-slate-300 leading-relaxed">
              Donors earn verifiable reputation points and Bronze/Silver/Gold/Platinum tiers with bonuses for rescue of near-expiry stocks (&le;120d) and rapid emergency fulfillment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
