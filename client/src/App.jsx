import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LandingPageView from './components/LandingPageView';
import BrowseDonationsView from './components/BrowseDonationsView';
import MyDonationsView from './components/MyDonationsView';
import DonorRequestsView from './components/DonorRequestsView';
import RecipientRequestsView from './components/RecipientRequestsView';
import MedicineCabinetView from './components/MedicineCabinetView';
import DisposalQueueView from './components/DisposalQueueView';
import UrgentNeedsView from './components/UrgentNeedsView';
import ImpactView from './components/ImpactView';
import VerifierQueueView from './components/VerifierQueueView';
import AdminDashboardView from './components/AdminDashboardView';
import PublicTrailView from './components/PublicTrailView';
import DonationFormModal from './components/DonationFormModal';
import QRScannerModal from './components/QRScannerModal';
import AuthModal from './components/AuthModal';
import { ShieldCheck } from 'lucide-react';

function MainApp() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('browse');
  const [selectedTrailId, setSelectedTrailId] = useState(null);

  // Modals
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [prefilledMedicine, setPrefilledMedicine] = useState(null);

  const [queueCount, setQueueCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch queue count for verifier badge
  useEffect(() => {
    if (user?.role !== 'verifier' && user?.role !== 'admin') return;

    async function checkQueue() {
      try {
        const res = await fetch('/api/verifications/queue', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setQueueCount(data.count || 0);
        }
      } catch (e) {
        console.error('Queue poll error:', e);
      }
    }
    checkQueue();
  }, [token, user, refreshKey]);

  // Adjust active tab when switching roles
  useEffect(() => {
    if (user?.role === 'verifier' && activeTab === 'my-donations') {
      setActiveTab('verifier-queue');
    } else if (user?.role === 'donor' && activeTab === 'verifier-queue') {
      setActiveTab('my-donations');
    }
  }, [user?.role]);

  const handleDonationCreated = () => {
    setRefreshKey(prev => prev + 1);
    setActiveTab('my-donations');
  };

  const handleSelectTrail = (trailId) => {
    setSelectedTrailId(trailId);
    setActiveTab('public-trail');
  };

  const handlePrefillDonation = (item) => {
    setPrefilledMedicine(item);
    setIsDonationModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Universal Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewDonation={() => {
          setPrefilledMedicine(null);
          setIsDonationModalOpen(true);
        }}
        onOpenScanner={() => setIsScannerModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        queueCount={queueCount}
      />

      {/* Statutory Disclaimer Strip */}
      <div className="bg-teal-900 text-teal-100 text-xs py-2 px-4 border-b border-teal-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <span>
              <strong>Regulatory Notice:</strong> MedShare is a digital coordination platform connecting licensed donors and charitable clinics to eliminate medicine waste. It does not replace statutory pharmacist review or regulatory licensing checks.
            </span>
          </div>
          <span className="hidden md:inline font-mono text-[11px] text-teal-300">
            Protocols: CDSCO / Bio-Medical Waste Rules
          </span>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {activeTab === 'landing' && (
          <LandingPageView
            onExplore={() => setActiveTab('browse')}
            onDonate={() => {
              setPrefilledMedicine(null);
              setIsDonationModalOpen(true);
            }}
            onLogin={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === 'browse' && (
          <BrowseDonationsView
            key={`browse-${refreshKey}`}
            onOpenNewDonation={() => {
              setPrefilledMedicine(null);
              setIsDonationModalOpen(true);
            }}
            onSelectTrail={handleSelectTrail}
          />
        )}

        {activeTab === 'my-donations' && (
          <MyDonationsView
            key={`my-${refreshKey}`}
            onOpenNewDonation={() => {
              setPrefilledMedicine(null);
              setIsDonationModalOpen(true);
            }}
          />
        )}

        {activeTab === 'donor-requests' && (
          <DonorRequestsView key={`donor-req-${refreshKey}`} />
        )}

        {activeTab === 'recipient-requests' && (
          <RecipientRequestsView
            key={`recip-req-${refreshKey}`}
            onOpenScanner={() => setIsScannerModalOpen(true)}
            onSelectTrail={handleSelectTrail}
          />
        )}

        {activeTab === 'cabinet' && (
          <MedicineCabinetView
            key={`cabinet-${refreshKey}`}
            onPrefillDonation={handlePrefillDonation}
          />
        )}

        {activeTab === 'disposal' && (
          <DisposalQueueView key={`disposal-${refreshKey}`} />
        )}

        {activeTab === 'urgent-needs' && (
          <UrgentNeedsView
            key={`urgent-${refreshKey}`}
            onOpenDonationWithMedicine={handlePrefillDonation}
          />
        )}

        {activeTab === 'impact' && (
          <ImpactView key={`impact-${refreshKey}`} />
        )}

        {activeTab === 'verifier-queue' && (
          <VerifierQueueView
            key={`queue-${refreshKey}`}
            onQueueCountChange={(count) => setQueueCount(count)}
          />
        )}

        {activeTab === 'admin-portal' && (
          <AdminDashboardView key={`admin-${refreshKey}`} />
        )}

        {activeTab === 'public-trail' && (
          <PublicTrailView
            trailId={selectedTrailId || 'MED-TR-001'}
            onBack={() => setActiveTab('browse')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 MedShare – Medicine Donation & Expiry Management Platform.</p>
          <div className="flex items-center space-x-4">
            <button onClick={() => handleSelectTrail('MED-TR-001')} className="hover:underline">Sample Batch Trail (MED-TR-001)</button>
            <button onClick={() => setActiveTab('disposal')} className="hover:underline">Safe Disposal Guide</button>
            <button onClick={() => setActiveTab('landing')} className="hover:underline">About MedShare</button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <DonationFormModal
        isOpen={isDonationModalOpen}
        onClose={() => setIsDonationModalOpen(false)}
        onDonationCreated={handleDonationCreated}
        prefillData={prefilledMedicine}
      />

      <QRScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onHandoverComplete={() => setRefreshKey(prev => prev + 1)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
