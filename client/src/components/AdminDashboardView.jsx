import React, { useState, useEffect } from 'react';
import { Users, Settings, Map, FileText, CheckCircle2, XCircle, ShieldCheck, RefreshCw, AlertTriangle, Activity } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboardView() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'settings' | 'heatmap' | 'audits' | 'reports'

  // Users state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({});
  const [savingSettings, setSavingSettings] = useState(false);

  // Heatmap state
  const [heatmapData, setHeatmapData] = useState(null);

  // Reports state
  const [reports, setReports] = useState(null);

  // Message feedback
  const [message, setMessage] = useState(null);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || {});
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHeatmap = async () => {
    try {
      const res = await fetch('/api/admin/heatmap', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHeatmapData(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/admin/reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'settings') fetchSettings();
    if (activeTab === 'heatmap') fetchHeatmap();
    if (activeTab === 'reports' || activeTab === 'audits') fetchReports();
  }, [activeTab]);

  const handleVerifyUser = async (userId, newVerifiedStatus) => {
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ verified: newVerifiedStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');

      setMessage({ type: 'success', text: data.message });
      fetchUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');

      setMessage({ type: 'success', text: 'Settings updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  // Setup Leaflet map for heatmap
  useEffect(() => {
    if (activeTab !== 'heatmap' || !heatmapData) return;

    const mapContainer = document.getElementById('heatmap-map');
    if (!mapContainer) return;

    // Reset container if already initialized
    if (mapContainer._leaflet_id) {
      mapContainer._leaflet_id = null;
      mapContainer.innerHTML = '';
    }

    const map = L.map('heatmap-map').setView([19.0760, 72.8777], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Red markers for urgent needs
    heatmapData.urgent_needs?.forEach((need) => {
      const circle = L.circleMarker([need.lat, need.lng], {
        radius: 12,
        fillColor: '#ef4444',
        color: '#b91c1c',
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.6
      }).addTo(map);

      circle.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px;">
          <strong style="color: #b91c1c;">⚠️ URGENT NEED</strong><br/>
          <strong>${need.medicine_name}</strong> (${need.quantity} units)<br/>
          Recipient: ${need.recipient_name}<br/>
          Needed by: ${need.needed_by}
        </div>
      `);
    });

    // Green markers for surplus stock
    heatmapData.available_surplus?.forEach((surplus) => {
      const circle = L.circleMarker([surplus.lat, surplus.lng], {
        radius: 10,
        fillColor: '#10b981',
        color: '#047857',
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.6
      }).addTo(map);

      circle.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px;">
          <strong style="color: #047857;">✓ AVAILABLE SURPLUS</strong><br/>
          <strong>${surplus.medicine_name}</strong> (${surplus.quantity} units)<br/>
          Donor: ${surplus.donor_name}<br/>
          Batch: ${surplus.batch_no} | Expiry: ${surplus.expiry_date}
        </div>
      `);
    });

    return () => {
      map.remove();
    };
  }, [activeTab, heatmapData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            <span>MedShare Central Administration</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Institutional oversight, NGO approvals, algorithm parameters, and demand-gap mapping.
          </p>
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

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 ${
            activeTab === 'users' ? 'bg-purple-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Approvals</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 ${
            activeTab === 'settings' ? 'bg-purple-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Policy Rules & Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('heatmap')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 ${
            activeTab === 'heatmap' ? 'bg-purple-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Map className="w-4 h-4" />
          <span>Demand-Gap Heatmap</span>
        </button>

        <button
          onClick={() => setActiveTab('audits')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 ${
            activeTab === 'audits' ? 'bg-purple-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Audit Log Trail</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 ${
            activeTab === 'reports' ? 'bg-purple-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>System Analytics</span>
        </button>
      </div>

      {/* Tab 1: Users & Approvals */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Registered Users & Institutions</h3>
            <button onClick={fetchUsers} className="text-xs text-purple-600 font-semibold hover:underline">Refresh</button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((u) => (
              <div key={u.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{u.name}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {u.role} ({u.org_type})
                    </span>
                    {u.verified === 1 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Verified
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        Pending Verification
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    {u.email} • {u.phone || 'No phone'} • {u.address}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {u.verified === 0 ? (
                    <button
                      onClick={() => handleVerifyUser(u.id, 1)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                      Approve & Verify
                    </button>
                  ) : (
                    <button
                      onClick={() => handleVerifyUser(u.id, 0)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-bold text-xs"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: System Settings */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Safety Parameters & Policy Limits</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                MIN_SHELF_LIFE_DAYS (Minimum shelf-life to list)
              </label>
              <input
                type="number"
                value={settings.MIN_SHELF_LIFE_DAYS || '90'}
                onChange={(e) => setSettings({ ...settings, MIN_SHELF_LIFE_DAYS: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-[11px] text-slate-400">Default: 90 days. Items below this are blocked from donation.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                MAX_RADIUS_KM (Shelf-Life Match Search Radius)
              </label>
              <input
                type="number"
                value={settings.MAX_RADIUS_KM || '50'}
                onChange={(e) => setSettings({ ...settings, MAX_RADIUS_KM: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-[11px] text-slate-400">Default: 50 km for proximity scoring calculations.</span>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                RESTRICTED_CATEGORIES (Institutional-only medicines)
              </label>
              <input
                type="text"
                value={settings.RESTRICTED_CATEGORIES || 'Vaccines,Cold-Chain,Schedule-X'}
                onChange={(e) => setSettings({ ...settings, RESTRICTED_CATEGORIES: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
            >
              {savingSettings ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Demand-Gap Heatmap */}
      {activeTab === 'heatmap' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Demand-Gap Geospatial Map</h3>
              <p className="text-xs text-slate-500">Visualizing deficit hotspots (red) vs active surplus pools (green).</p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-semibold">
              <span className="flex items-center space-x-1.5 text-rose-600">
                <span className="h-3 w-3 rounded-full bg-rose-500" />
                <span>Open Urgent Needs ({heatmapData?.urgent_needs?.length || 0})</span>
              </span>
              <span className="flex items-center space-x-1.5 text-emerald-600">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <span>Available Surplus ({heatmapData?.available_surplus?.length || 0})</span>
              </span>
            </div>
          </div>

          <div id="heatmap-map" className="w-full h-[450px] rounded-2xl border border-slate-200 dark:border-slate-700 z-10" />
        </div>
      )}

      {/* Tab 4: Audit Log Viewer */}
      {activeTab === 'audits' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Append-Only Regulatory Audit Log</h3>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {reports?.recent_audits?.map((a) => (
              <div key={a.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-purple-600">{a.action}</span>
                    <span className="text-slate-400">on {a.entity_type} #{a.entity_id}</span>
                  </div>
                  {a.metadata_json && (
                    <span className="text-[11px] font-mono text-slate-500 block mt-0.5">{a.metadata_json}</span>
                  )}
                </div>
                <div className="text-right text-slate-400">
                  <div>Actor: {a.actor_name || 'System / Cron'}</div>
                  <div className="text-[10px]">{new Date(a.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Reports */}
      {activeTab === 'reports' && reports && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Donations by Lifecycle Status</h4>
            <div className="space-y-2 text-xs">
              {reports.donation_breakdown?.map((d) => (
                <div key={d.status} className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{d.status}</span>
                  <span className="font-bold text-purple-600">{d.count} listings ({d.total_quantity} units)</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">User Base Breakdown</h4>
            <div className="space-y-2 text-xs">
              {reports.user_breakdown?.map((u) => (
                <div key={`${u.role}-${u.org_type}`} className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">{u.role} ({u.org_type})</span>
                  <span className="font-bold text-slate-900 dark:text-white">{u.count} users ({u.verified_count} verified)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
