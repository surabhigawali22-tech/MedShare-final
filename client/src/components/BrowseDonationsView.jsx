import React, { useState, useEffect } from 'react';
import { Search, Filter, ShieldCheck, HeartHandshake, MapPin, Calendar, Clock, AlertCircle, RefreshCw, CheckCircle2, List, Map, Sparkles, Send, ExternalLink, Zap } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import RequestModal from './RequestModal';
import ShelfLifeMatchModal from './ShelfLifeMatchModal';

export default function BrowseDonationsView({ onOpenNewDonation, onSelectTrail }) {
  const { user, token } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minSafetyScore, setMinSafetyScore] = useState(0);
  const [storageFilter, setStorageFilter] = useState('');
  const [nearExpiryOnly, setNearExpiryOnly] = useState(false);

  // Modals
  const [selectedDonationForRequest, setSelectedDonationForRequest] = useState(null);
  const [selectedDonationForMatches, setSelectedDonationForMatches] = useState(null);

  const fetchDonations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('status', 'APPROVED');
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (selectedCategory) params.append('category', selectedCategory);
      if (minSafetyScore > 0) params.append('min_safety_score', minSafetyScore);
      if (storageFilter) params.append('storage_condition', storageFilter);

      const res = await fetch(`/api/donations?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        let list = data.donations || [];
        if (nearExpiryOnly) {
          list = list.filter(d => d.days_remaining <= 60);
        }
        setDonations(list);
      }
    } catch (err) {
      console.error('Failed to fetch donations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, [selectedCategory, minSafetyScore, storageFilter, nearExpiryOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDonations();
  };

  // Render Leaflet map for Map View
  useEffect(() => {
    if (viewMode !== 'map' || donations.length === 0) return;

    const mapContainer = document.getElementById('browse-map');
    if (!mapContainer) return;

    if (mapContainer._leaflet_id) {
      mapContainer._leaflet_id = null;
      mapContainer.innerHTML = '';
    }

    const map = L.map('browse-map').setView([19.0760, 72.8777], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    donations.forEach((d) => {
      const lat = d.donor_lat || 19.0760;
      const lng = d.donor_lng || 72.8777;

      const marker = L.circleMarker([lat, lng], {
        radius: d.days_remaining <= 60 ? 12 : 9,
        fillColor: d.days_remaining <= 60 ? '#f59e0b' : '#0d9488',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; min-width: 180px;">
          <strong style="font-size: 13px;">${d.medicine_name}</strong><br/>
          <span style="color: #64748b;">${d.generic_name}</span><br/>
          <strong>Quantity:</strong> ${d.quantity} ${d.unit}<br/>
          <strong>Expiry:</strong> ${d.expiry_date} (${d.days_remaining}d left)<br/>
          <strong>Safety Score:</strong> ${d.safety_score}/100<br/>
          <strong>Donor:</strong> ${d.donor_name}<br/>
          <div style="margin-top: 6px;">
            <span style="font-family: monospace; font-size: 10px; background: #f1f5f9; padding: 2px 4px; border-radius: 4px;">
              ${d.trail_id}
            </span>
          </div>
        </div>
      `);
    });

    return () => {
      map.remove();
    };
  }, [viewMode, donations]);

  const categories = [
    'Antibiotic', 'Analgesic', 'Antidiabetic', 'Cardiovascular',
    'Gastrointestinal', 'Antihistamine', 'Respiratory', 'Vitamins', 'Vaccines'
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-lg">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero-Waste Healthcare Logistics</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Verified Medicine Surplus</h1>
          <p className="text-sm text-teal-100/90 mt-2 leading-relaxed">
            All listed medicines have undergone sealed packaging validation and pharmacist verification. Available for registered NGOs, charitable dispensaries, and low-income clinics.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-xs bg-white/10 px-3 py-1 rounded-xl backdrop-blur-sm border border-white/10">
              ⚡ Real-Time Expiry Engine
            </span>
            <span className="text-xs bg-white/10 px-3 py-1 rounded-xl backdrop-blur-sm border border-white/10">
              🛡️ Multi-Factor Safety Score
            </span>
            <span className="text-xs bg-white/10 px-3 py-1 rounded-xl backdrop-blur-sm border border-white/10">
              📦 Tamper-Evident QR Tracking
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by medicine name, generic name, or batch number..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-sm transition-all"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] mr-1 flex items-center">
              <Filter className="w-3.5 h-3.5 mr-1" /> Category:
            </span>
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                selectedCategory === ''
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                  selectedCategory === cat
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Pre-expiry rescue toggle */}
            <button
              type="button"
              onClick={() => setNearExpiryOnly(!nearExpiryOnly)}
              className={`px-3 py-1 rounded-lg border text-xs font-bold flex items-center space-x-1.5 transition-colors ${
                nearExpiryOnly
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>NEAR-EXPIRY RESCUE (&le;60d)</span>
            </button>

            <div className="flex items-center space-x-2">
              <span className="text-slate-500 font-semibold text-xs">Safety Score ≥</span>
              <select
                value={minSafetyScore}
                onChange={(e) => setMinSafetyScore(Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs"
              >
                <option value="0">Any Score</option>
                <option value="70">70+ (Good)</option>
                <option value="85">85+ (High Safety)</option>
                <option value="95">95+ (Elite Quality)</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-500 font-semibold text-xs">Storage:</span>
              <select
                value={storageFilter}
                onChange={(e) => setStorageFilter(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs"
              >
                <option value="">All Storage</option>
                <option value="normal">Room Temp</option>
                <option value="cold-chain">Cold-Chain (2-8°C)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header with List vs Map Toggle */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Available Listings ({donations.length})
        </span>

        <div className="flex items-center space-x-3">
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors ${
                viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm' : 'text-slate-500'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors ${
                viewMode === 'map' ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm' : 'text-slate-500'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
          </div>

          <button
            onClick={fetchDonations}
            className="text-xs text-teal-600 font-semibold hover:underline flex items-center space-x-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 px-2">
            <span>Geospatial distribution of available surplus batches in Mumbai & surroundings</span>
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1"><span className="h-2.5 w-2.5 rounded-full bg-teal-600 inline-block"/> <span>Standard Surplus</span></span>
              <span className="flex items-center space-x-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block"/> <span>Near-Expiry Rescue (&le;60d)</span></span>
            </div>
          </div>
          <div id="browse-map" className="w-full h-[500px] rounded-2xl border border-slate-200 dark:border-slate-700 z-10" />
        </div>
      )}

      {/* List View: Donations Grid */}
      {viewMode === 'list' && (
        loading ? (
          <div className="p-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mx-auto mb-2" />
            <p className="text-sm">Fetching verified donations...</p>
          </div>
        ) : donations.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
            <HeartHandshake className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-slate-700 dark:text-slate-300">No surplus found matching your criteria</h3>
            <p className="text-xs text-slate-500 mt-1">Try resetting your filters or search terms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {donations.map((d) => (
              <div
                key={d.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-teal-300 transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Card Top: Badges & Score */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        {d.category}
                      </span>
                      {d.days_remaining <= 60 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 flex items-center">
                          <Zap className="w-3 h-3 mr-0.5" /> RESCUE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] font-semibold text-slate-400">Safety</span>
                      <span className="px-2 py-0.5 rounded-md text-xs font-black bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {d.safety_score} / 100
                      </span>
                    </div>
                  </div>

                  {/* Medicine Title */}
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">{d.medicine_name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{d.generic_name}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {d.requires_prescription === 1 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200">
                        Rx Only
                      </span>
                    )}
                    {d.storage_condition === 'cold-chain' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200">
                        Cold-Chain (2-8°C)
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        Room Temp
                      </span>
                    )}
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900">
                      Sealed Original
                    </span>
                  </div>

                  {/* Details Table */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Quantity</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{d.quantity} {d.unit}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Expiry Countdown</span>
                      <span className={`font-bold ${d.days_remaining < 60 ? 'text-amber-600' : 'text-slate-800 dark:text-slate-200'}`}>
                        {d.expiry_date}
                      </span>
                      <span className="text-[10px] text-teal-600 block">({d.days_remaining}d remaining)</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions & Footer */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[140px]">{d.donor_name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{d.donor_org_type}</div>
                    </div>

                    <button
                      onClick={() => onSelectTrail && onSelectTrail(d.trail_id)}
                      className="font-mono text-[10px] text-teal-600 hover:underline flex items-center"
                      title="View public batch trail"
                    >
                      <span>{d.trail_id}</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </button>
                  </div>

                  {/* Action CTAs */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedDonationForMatches(d.id)}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center space-x-1 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Match Engine</span>
                    </button>

                    {(user?.role === 'recipient' || user?.role === 'admin') && (
                      <button
                        onClick={() => setSelectedDonationForRequest(d)}
                        className="flex-1 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center space-x-1 shadow-sm transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Request Stock</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Shelf-Life Match Engine Modal */}
      <ShelfLifeMatchModal
        donationId={selectedDonationForMatches}
        isOpen={Boolean(selectedDonationForMatches)}
        onClose={() => setSelectedDonationForMatches(null)}
      />

      {/* Request Medicine Modal */}
      <RequestModal
        donation={selectedDonationForRequest}
        isOpen={Boolean(selectedDonationForRequest)}
        onClose={() => setSelectedDonationForRequest(null)}
        onRequestSubmitted={() => fetchDonations()}
      />
    </div>
  );
}
