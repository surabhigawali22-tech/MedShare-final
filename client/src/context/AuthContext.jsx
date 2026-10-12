import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const PORTALS = [
  {
    key: 'donor',
    role: 'donor',
    name: 'Donor',
    email: 'donor.pharma@example.com',
    label: 'Donor (Apex Care Pharmacy)',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    defaultTab: 'my-donations',
    mockUser: {
      id: 5,
      name: 'Apex Care Pharmacy (Demo Donor)',
      email: 'donor.pharma@example.com',
      role: 'donor',
      org_type: 'pharmacy',
      verified: 1,
      reputation: { points: 1250, badge: 'Platinum' }
    }
  },
  {
    key: 'recipient',
    role: 'recipient',
    name: 'Recipient',
    email: 'recipient.sewa@example.com',
    label: 'Recipient (Sewa Foundation NGO)',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    defaultTab: 'recipient-requests',
    mockUser: {
      id: 9,
      name: 'Sewa Community Health Foundation (Demo Recipient)',
      email: 'recipient.sewa@example.com',
      role: 'recipient',
      org_type: 'ngo',
      verified: 1
    }
  },
  {
    key: 'verifier',
    role: 'verifier',
    name: 'Verifier',
    email: 'verifier1@medshare.org',
    label: 'Verifier (Dr. Aditi Sharma)',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    defaultTab: 'verifier-queue',
    mockUser: {
      id: 2,
      name: 'Dr. Aditi Sharma (Chief Pharmacist)',
      email: 'verifier1@medshare.org',
      role: 'verifier',
      org_type: 'hospital',
      verified: 1
    }
  },
  {
    key: 'admin',
    role: 'admin',
    name: 'Admin',
    email: 'admin@medshare.org',
    label: 'Admin (MedShare Central HQ)',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    defaultTab: 'admin-portal',
    mockUser: {
      id: 1,
      name: 'Dr. Vikram Rao (Central Admin)',
      email: 'admin@medshare.org',
      role: 'admin',
      org_type: 'other',
      verified: 1
    }
  }
];

export const DEMO_ACCOUNTS = [
  { role: 'donor', email: 'donor.pharma@example.com', label: 'Donor (Apex Care Pharmacy)', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { role: 'donor', email: 'donor.hosp@example.com', label: 'Donor (Lifeline Hospital)', badgeColor: 'bg-teal-100 text-teal-800 border-teal-200' },
  { role: 'donor', email: 'donor.indiv@example.com', label: 'Donor (Rahul Verma - Individual)', badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { role: 'recipient', email: 'recipient.sewa@example.com', label: 'Recipient (Sewa Foundation NGO)', badgeColor: 'bg-amber-100 text-amber-800 border-amber-200' },
  { role: 'recipient', email: 'recipient.clinic@example.com', label: 'Recipient (Asha Clinic)', badgeColor: 'bg-rose-100 text-rose-800 border-rose-200' },
  { role: 'verifier', email: 'verifier1@medshare.org', label: 'Verifier (Dr. Aditi Sharma)', badgeColor: 'bg-blue-100 text-blue-800 border-blue-200' },
  { role: 'admin', email: 'admin@medshare.org', label: 'Admin (MedShare HQ)', badgeColor: 'bg-purple-100 text-purple-800 border-purple-200' },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('medshare_token'));
  const [activePortal, setActivePortal] = useState(() => localStorage.getItem('medshare_guest_role') || 'donor');
  const [isGuestMode, setIsGuestMode] = useState(true);
  const [loading, setLoading] = useState(true);

  // Switch between the 4 primary portals in Guest Demo Mode
  const switchPortal = async (portalKey) => {
    const key = (portalKey || 'donor').toLowerCase();
    const portal = PORTALS.find(p => p.key === key || p.role === key) || PORTALS[0];
    localStorage.setItem('medshare_guest_role', portal.role);
    setIsGuestMode(true);
    setActivePortal(portal.key);

    // Immediately set synchronous persona so UI updates instantly without blocking
    setUser(portal.mockUser);

    // Request fresh signed token from backend
    try {
      const res = await fetch('/api/auth/guest-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: portal.role })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('medshare_token', data.token);
        setToken(data.token);
        if (data.user) setUser(data.user);
        return { success: true, portal };
      }
    } catch (e) {
      console.warn('Backend guest-switch unreachable, using client guest token:', e);
    }

    const fallbackToken = `guest-${portal.role}`;
    localStorage.setItem('medshare_token', fallbackToken);
    setToken(fallbackToken);
    return { success: true, portal };
  };

  // Load user profile on mount or token change
  useEffect(() => {
    async function loadUser() {
      const savedRole = localStorage.getItem('medshare_guest_role') || 'donor';
      if (!token) {
        await switchPortal(savedRole);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          const matched = PORTALS.find(p => p.role === data.user?.role);
          if (matched) setActivePortal(matched.key);
        } else {
          await switchPortal(savedRole);
        }
      } catch (err) {
        console.warn('Failed to load user profile, falling back to guest portal:', err);
        await switchPortal(savedRole);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [token]);

  // Quick switch demo account
  const switchAccount = async (email) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Password123!' })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('medshare_token', data.token);
        setToken(data.token);
        setUser(data.user);
        const matched = PORTALS.find(p => p.role === data.user?.role);
        if (matched) {
          setActivePortal(matched.key);
          localStorage.setItem('medshare_guest_role', matched.role);
        }
        setIsGuestMode(false);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('medshare_token');
    localStorage.removeItem('medshare_guest_role');
    switchPortal('donor');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        activePortal,
        isGuestMode,
        switchPortal,
        switchAccount,
        logout,
        setUser,
        PORTALS
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
