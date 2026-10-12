import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  ShieldCheck,
  PlusCircle,
  CheckCircle,
  ChevronDown,
  User,
  Award,
  Bell,
  Sun,
  Moon,
  Globe,
  QrCode,
  Package,
  Pill,
  Trash2,
  AlertCircle,
  Trophy,
  Users,
  LogOut,
  LogIn
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth, PORTALS, DEMO_ACCOUNTS } from '../context/AuthContext';

export default function Navbar({
  activeTab,
  setActiveTab,
  onOpenNewDonation,
  onOpenScanner,
  onOpenAuth,
  queueCount = 0
}) {
  const { user, token, activePortal, isGuestMode, switchPortal, switchAccount, logout } = useAuth();
  const { t, i18n } = useTranslation();

  // Dropdown states
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('medshare_dark') === 'true' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Apply dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('medshare_dark', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('medshare_dark', 'false');
    }
  }, [darkMode]);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // 15s poll
    return () => clearInterval(interval);
  }, [token, user]);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('medshare_lng', lang);
    setLangDropdownOpen(false);
  };

  const role = user?.role || activePortal || 'donor';

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveTab('landing')}
              className="flex items-center space-x-2.5 text-left focus:outline-none"
            >
              <div className="h-10 w-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <div className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white flex items-center">
                  Med<span className="text-teal-600 dark:text-teal-400">Share</span>
                </div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Medicine Rescue
                </div>
              </div>
            </button>

            {/* Navigation Tabs */}
            <nav className="hidden lg:flex items-center space-x-1">
              <button
                onClick={() => setActiveTab('browse')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === 'browse'
                    ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t('browseSurplus')}
              </button>

              {(role === 'donor' || role === 'admin') && (
                <button
                  onClick={() => setActiveTab('my-donations')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    activeTab === 'my-donations'
                      ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {t('myDonations')}
                </button>
              )}

              {/* Requests Tab (Incoming for donor, Outgoing for recipient) */}
              {role === 'donor' && (
                <button
                  onClick={() => setActiveTab('donor-requests')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    activeTab === 'donor-requests'
                      ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Requests
                </button>
              )}

              {role === 'recipient' && (
                <button
                  onClick={() => setActiveTab('recipient-requests')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    activeTab === 'recipient-requests'
                      ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  My Requests
                </button>
              )}

              <button
                onClick={() => setActiveTab('cabinet')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === 'cabinet'
                    ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t('myCabinet')}
              </button>

              <button
                onClick={() => setActiveTab('disposal')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === 'disposal'
                    ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t('disposalQueue')}
              </button>

              <button
                onClick={() => setActiveTab('urgent-needs')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === 'urgent-needs'
                    ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t('urgentNeeds')}
              </button>

              <button
                onClick={() => setActiveTab('impact')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === 'impact'
                    ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t('impact')}
              </button>

              {(role === 'verifier' || role === 'admin') && (
                <button
                  onClick={() => setActiveTab('verifier-queue')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                    activeTab === 'verifier-queue'
                      ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{t('verificationQueue')}</span>
                  {queueCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                      {queueCount}
                    </span>
                  )}
                </button>
              )}

              {role === 'admin' && (
                <button
                  onClick={() => setActiveTab('admin-portal')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors text-purple-600 dark:text-purple-400 ${
                    activeTab === 'admin-portal'
                      ? 'bg-purple-50 dark:bg-purple-950'
                      : 'hover:bg-purple-50 dark:hover:bg-purple-950'
                  }`}
                >
                  {t('adminPortal')}
                </button>
              )}
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2.5">
            {/* Quick Action: Donate Medicine */}
            {(role === 'donor' || role === 'admin') && (
              <button
                onClick={onOpenNewDonation}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{t('donateMedicine')}</span>
              </button>
            )}

            {/* Quick Action: QR Scanner */}
            <button
              onClick={onOpenScanner}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              title="Scan Handover QR"
            >
              <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 relative"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-slate-400">No notifications</div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div key={n.id} className={`p-3 ${n.read ? 'opacity-70' : 'bg-teal-50/40 dark:bg-teal-950/20'}`}>
                          <p className="text-slate-800 dark:text-slate-200">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                title="Change Language"
              >
                <Globe className="w-4 h-4" />
              </button>
              {langDropdownOpen && (
                <div className="absolute right-0 mt-2 w-36 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-50 text-xs">
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold"
                  >
                    English
                  </button>
                  <button
                    onClick={() => handleLanguageChange('hi')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold"
                  >
                    हिन्दी (Hindi)
                  </button>
                  <button
                    onClick={() => handleLanguageChange('mr')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold"
                  >
                    मराठी (Marathi)
                  </button>
                </div>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Profile & Portal Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center space-x-2 p-1.5 pr-2.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/30 hover:bg-teal-100/50 dark:hover:bg-teal-900/50 transition-colors text-left"
                id="portal-selector-button"
                title="Switch Demo Portal"
              >
                <div className="h-7 w-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                  {role?.slice(0, 2) || 'GU'}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                    {user?.name || `${role.toUpperCase()} Portal`}
                  </div>
                  <div className="text-[10px] text-teal-600 dark:text-teal-400 capitalize font-medium flex items-center space-x-1">
                    <span>{role} portal</span>
                    <span className="text-[8px] bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 px-1 py-0.2 rounded font-bold uppercase tracking-wider">DEMO</span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 animate-in fade-in">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Persona / Portal</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">{user?.name || 'Guest User'}</div>
                    <div className="text-xs text-slate-500">{user?.email || 'guest@medshare.local'}</div>
                    {user?.reputation && (
                      <div className="mt-2 flex items-center space-x-1.5 text-xs text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded font-semibold">
                        <Award className="w-3.5 h-3.5 text-teal-600" />
                        <span>Badge: {user.reputation.badge} ({user.reputation.points} pts)</span>
                      </div>
                    )}
                  </div>

                  {/* 4 Primary Portals */}
                  <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider px-1 mb-2 flex items-center justify-between">
                      <span>Switch Portal (Guest Demo)</span>
                      <span className="text-[9px] bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 px-1.5 py-0.5 rounded font-bold">ALL 4 PORTALS</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PORTALS.map((portal) => {
                        const isCurrent = (activePortal === portal.key || role === portal.role);
                        return (
                          <button
                            key={portal.key}
                            onClick={async () => {
                              await switchPortal(portal.key);
                              setActiveTab(portal.defaultTab);
                              setRoleDropdownOpen(false);
                            }}
                            className={`text-left p-2 rounded-xl text-xs flex flex-col justify-between transition-all border ${
                              isCurrent
                                ? 'bg-teal-600 text-white font-bold border-teal-600 shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span className="text-[9px] opacity-75 uppercase tracking-wider font-semibold">
                              {portal.role}
                            </span>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs font-bold">{portal.name}</span>
                              {isCurrent && <CheckCircle className="w-3.5 h-3.5 text-white flex-shrink-0" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Specific Demo Accounts */}
                  <div className="px-3 py-2 max-h-44 overflow-y-auto">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1.5">
                      Or Switch Demo Account
                    </div>
                    <div className="space-y-1">
                      {DEMO_ACCOUNTS.map((acc) => (
                        <button
                          key={acc.email}
                          onClick={() => {
                            switchAccount(acc.email);
                            setRoleDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            user?.email === acc.email
                              ? 'bg-teal-50 dark:bg-teal-950 font-bold text-teal-900 dark:text-teal-200'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate">{acc.label}</span>
                          {user?.email === acc.email && <CheckCircle className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    {!token || isGuestMode ? (
                      <button
                        onClick={() => {
                          setRoleDropdownOpen(false);
                          onOpenAuth();
                        }}
                        className="w-full text-center py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-colors"
                      >
                        Sign In with Real Account
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          logout();
                          setRoleDropdownOpen(false);
                        }}
                        className="w-full text-center py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors"
                      >
                        Sign Out (Return to Guest)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Horizontal Navigation Strip (visible only on mobile/small screens < lg) */}
      <div className="lg:hidden flex items-center space-x-1.5 overflow-x-auto px-4 py-2 border-t border-slate-100 dark:border-slate-800 scrollbar-none bg-slate-50/50 dark:bg-slate-900/50">
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'browse'
              ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {t('browseSurplus')}
        </button>

        {(role === 'donor' || role === 'admin') && (
          <button
            onClick={() => setActiveTab('my-donations')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'my-donations'
                ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t('myDonations')}
          </button>
        )}

        {role === 'donor' && (
          <button
            onClick={() => setActiveTab('donor-requests')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'donor-requests'
                ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Requests
          </button>
        )}

        {role === 'recipient' && (
          <button
            onClick={() => setActiveTab('recipient-requests')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'recipient-requests'
                ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            My Requests
          </button>
        )}

        <button
          onClick={() => setActiveTab('cabinet')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'cabinet'
              ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {t('myCabinet')}
        </button>

        <button
          onClick={() => setActiveTab('disposal')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'disposal'
              ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {t('disposalQueue')}
        </button>

        <button
          onClick={() => setActiveTab('urgent-needs')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'urgent-needs'
              ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {t('urgentNeeds')}
        </button>

        <button
          onClick={() => setActiveTab('impact')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'impact'
              ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {t('impact')}
        </button>

        {(role === 'verifier' || role === 'admin') && (
          <button
            onClick={() => setActiveTab('verifier-queue')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
              activeTab === 'verifier-queue'
                ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{t('verificationQueue')}</span>
            {queueCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {queueCount}
              </span>
            )}
          </button>
        )}

        {role === 'admin' && (
          <button
            onClick={() => setActiveTab('admin-portal')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors text-purple-600 dark:text-purple-400 ${
              activeTab === 'admin-portal'
                ? 'bg-purple-50 dark:bg-purple-950'
                : 'hover:bg-purple-50 dark:hover:bg-purple-950'
            }`}
          >
            {t('adminPortal')}
          </button>
        )}
      </div>
    </header>
  );
}
