import React, { useState, useEffect, useRef } from 'react';
import { X, QrCode, Camera, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';

export default function QRScannerModal({ isOpen, onClose, onHandoverComplete }) {
  const { token, user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [manualTrailId, setManualTrailId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
      setScanning(false);
      setManualTrailId('');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startCamera = async () => {
    setError(null);
    setScanning(true);
    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          // Detected QR Code
          html5QrCode.stop().catch(() => {});
          scannerRef.current = null;
          setScanning(false);
          handleProcessPayload(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.error('Camera start failed:', err);
      setError('Could not access camera. Please enter the Batch Trail ID manually below.');
      setScanning(false);
    }
  };

  const handleProcessPayload = async (rawPayload) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    let trailId = rawPayload.trim();
    try {
      // If payload is JSON with trail_id
      const parsed = JSON.parse(rawPayload);
      if (parsed.trail_id) trailId = parsed.trail_id;
    } catch (e) {
      // Plain trail ID string
    }

    try {
      const res = await fetch('/api/handovers/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ trail_id: trailId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to verify handover QR code');

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setSuccess({
        message: data.message,
        trail_id: data.trail_id,
        points: data.points_earned
      });

      if (onHandoverComplete) {
        onHandoverComplete(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualTrailId.trim()) return;
    handleProcessPayload(manualTrailId.trim());
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Scan Handover QR Code
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Recipients scan the donor's QR code during physical handover to complete the batch trail and prevent double-claiming.
        </p>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-base">
              Handover Successfully Confirmed!
            </h4>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Batch Trail <strong>{success.trail_id}</strong> is now COMPLETED and sealed on the audit trail.
            </p>
            {success.points && (
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-200/60 text-emerald-900 font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Donor awarded +{success.points} points!</span>
              </div>
            )}
            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Camera Viewport */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-900 min-h-[220px] flex flex-col items-center justify-center relative">
              <div id="qr-reader" className="w-full" />
              {!scanning && (
                <div className="text-center p-6 text-white space-y-3">
                  <Camera className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-300">Point your camera at the donor's handover QR code</p>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md"
                  >
                    Start Camera Scanner
                  </button>
                </div>
              )}
            </div>

            {/* Manual ID Input Fallback */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-2">
                Or Enter Batch Trail ID Manually:
              </span>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={manualTrailId}
                  onChange={(e) => setManualTrailId(e.target.value.toUpperCase())}
                  placeholder="e.g. MED-TR-001 or MED-TR-015"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="submit"
                  disabled={loading || !manualTrailId.trim()}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Confirm'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
