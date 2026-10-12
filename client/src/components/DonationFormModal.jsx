import React, { useState, useEffect, useRef } from 'react';
import { X, Search, ShieldCheck, AlertTriangle, Upload, Calendar, PackageCheck, Thermometer, CheckCircle2, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DonationFormModal({ isOpen, onClose, onDonationCreated, prefillData }) {
  const { user, token } = useAuth();

  // Search & Selected Medicine
  const [searchTerm, setSearchTerm] = useState('');
  const [medicineResults, setMedicineResults] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [searching, setSearching] = useState(false);

  // Form Fields
  const [batchNo, setBatchNo] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('strips');
  const [packaging, setPackaging] = useState('sealed');
  const [storageCondition, setStorageCondition] = useState('normal');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const fileInputRef = useRef(null);

  // Handle prefill data when modal opens
  useEffect(() => {
    if (isOpen && prefillData) {
      if (prefillData.medicine_name) {
        setSearchTerm(prefillData.medicine_name);
      }
      if (prefillData.expiry_date) {
        setExpiryDate(prefillData.expiry_date);
      }
      if (prefillData.quantity) {
        setQuantity(String(prefillData.quantity));
      }
    }
  }, [isOpen, prefillData]);

  // Autocomplete fetch
  useEffect(() => {
    if (!searchTerm.trim() || selectedMedicine) {
      setMedicineResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/medicines?search=${encodeURIComponent(searchTerm.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setMedicineResults(data.medicines || []);
        }
      } catch (err) {
        console.error('Failed to search medicines:', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedMedicine]);

  // Reset form
  const resetForm = () => {
    setSearchTerm('');
    setSelectedMedicine(null);
    setMedicineResults([]);
    setBatchNo('');
    setExpiryDate('');
    setQuantity('');
    setUnit('strips');
    setPackaging('sealed');
    setStorageCondition('normal');
    setPhoto(null);
    setPhotoPreview(null);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Real-time shelf-life calculation
  const calculateDaysLeft = () => {
    if (!expiryDate) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);
    const diff = exp - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const daysLeft = calculateDaysLeft();

  // Institutional restriction check
  const isInstitutional = user && ['pharmacy', 'hospital', 'distributor'].includes(user.org_type) && user.verified;
  const isRestrictedMedicine = selectedMedicine && (selectedMedicine.requires_prescription || selectedMedicine.storage_condition === 'cold-chain' || storageCondition === 'cold-chain');
  const hasInstitutionalViolation = isRestrictedMedicine && !isInstitutional;

  const handleSelectMedicine = (med) => {
    setSelectedMedicine(med);
    setSearchTerm(med.name);
    setMedicineResults([]);
    if (med.storage_condition === 'cold-chain') {
      setStorageCondition('cold-chain');
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedMedicine) {
      setErrorMessage('Please select a medicine from the verified catalog.');
      return;
    }

    if (!batchNo.trim()) {
      setErrorMessage('Batch Number is required for verification.');
      return;
    }

    if (!expiryDate) {
      setErrorMessage('Please select the manufacturer expiry date.');
      return;
    }

    if (daysLeft <= 0) {
      setErrorMessage('Expiry date cannot be in the past. Expired medicines must be disposed of safely.');
      return;
    }

    if (daysLeft < 90) {
      setErrorMessage(`Remaining shelf life (${daysLeft} days) is below the minimum safety threshold of 90 days.`);
      return;
    }

    if (packaging === 'opened') {
      setErrorMessage('Only sealed, original blister or container packaging is permitted.');
      return;
    }

    if (hasInstitutionalViolation) {
      setErrorMessage('Prescription and cold-chain medicines may only be donated by verified institutions.');
      return;
    }

    const formData = new FormData();
    formData.append('medicine_id', selectedMedicine.id);
    formData.append('batch_no', batchNo.trim());
    formData.append('expiry_date', expiryDate);
    formData.append('quantity', quantity);
    formData.append('unit', unit);
    formData.append('packaging', packaging);
    formData.append('storage_condition', storageCondition);
    if (photo) {
      formData.append('photo', photo);
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit donation.');
      }

      setSuccessMessage('Donation listing created! It has been submitted to the Pharmacist Verification Queue.');
      setTimeout(() => {
        if (onDonationCreated) onDonationCreated(data.donation);
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
              <PackageCheck className="w-5 h-5 text-teal-600" />
              <span>Create Medicine Donation</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">List unneeded sealed medication for NGO & clinic redistribution</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Alerts */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold">Submission Blocked:</span> {errorMessage}
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold">Success:</span> {successMessage}
              </div>
            </div>
          )}

          {/* 1. Medicine Autocomplete Search */}
          <div className="space-y-1.5 relative">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Medicine Name <span className="text-rose-500">*</span></span>
              {selectedMedicine && (
                <button
                  type="button"
                  onClick={() => { setSelectedMedicine(null); setSearchTerm(''); }}
                  className="text-xs text-teal-600 font-semibold hover:underline"
                >
                  Change Medicine
                </button>
              )}
            </label>

            {!selectedMedicine ? (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type to search (e.g., Amoxicillin, Paracetamol, Metformin)..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  required
                />
                {searching && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400">
                    Searching...
                  </div>
                )}

                {/* Dropdown Results */}
                {medicineResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-xl z-20 divide-y divide-slate-100">
                    {medicineResults.map((med) => (
                      <button
                        type="button"
                        key={med.id}
                        onClick={() => handleSelectMedicine(med)}
                        className="w-full text-left p-3 hover:bg-teal-50/50 transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900 group-hover:text-teal-700">{med.name}</div>
                          <div className="text-xs text-slate-500">{med.generic_name} • {med.category}</div>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          {med.requires_prescription === 1 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold border border-amber-200">
                              Rx Only
                            </span>
                          )}
                          {med.storage_condition === 'cold-chain' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 font-bold border border-cyan-200">
                              Cold-Chain (2-8°C)
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 flex items-start justify-between">
                <div>
                  <div className="text-sm font-bold text-teal-900">{selectedMedicine.name}</div>
                  <div className="text-xs text-teal-700 mt-0.5">Generic: {selectedMedicine.generic_name}</div>
                  <div className="text-xs text-teal-600 mt-0.5">Category: {selectedMedicine.category}</div>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  {selectedMedicine.requires_prescription === 1 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      Prescription Required
                    </span>
                  )}
                  {selectedMedicine.storage_condition === 'cold-chain' && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 border border-cyan-300">
                      Cold-Chain Required
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Institutional Warning */}
            {hasInstitutionalViolation && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold">Institutional Restriction:</span> Individual donors cannot donate prescription or cold-chain medicines. Only verified pharmacies, hospitals, or distributors can list this medicine.
                </div>
              </div>
            )}
          </div>

          {/* 2. Batch Number & Expiry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Batch / Lot Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value.toUpperCase())}
                placeholder="e.g. BATCH-2024A"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Expiry Date <span className="text-rose-500">*</span></span>
                {daysLeft !== null && (
                  <span className={`text-[11px] font-bold ${daysLeft < 90 ? 'text-rose-600' : daysLeft < 120 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {daysLeft > 0 ? `${daysLeft} days remaining` : 'EXPIRED'}
                  </span>
                )}
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                required
              />
            </div>
          </div>

          {/* Expiry Warning Message */}
          {daysLeft !== null && daysLeft < 90 && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>
                <strong>Shelf life too low:</strong> Only medicines with at least 90 days remaining are eligible for redistribution.
              </span>
            </div>
          )}

          {/* 3. Quantity & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Quantity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 50"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Packaging Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white"
              >
                <option value="strips">Strips (Blister/Foil)</option>
                <option value="boxes">Boxes / Cartons</option>
                <option value="vials">Vials / Ampoules</option>
                <option value="bottles">Bottles</option>
                <option value="sachets">Sachets</option>
                <option value="units">Inhalers / Devices</option>
              </select>
            </div>
          </div>

          {/* 4. Packaging Condition & Storage Condition */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Packaging Condition <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPackaging('sealed')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    packaging === 'sealed'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ✓ Sealed Original
                </button>
                <button
                  type="button"
                  onClick={() => setPackaging('opened')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    packaging === 'opened'
                      ? 'border-rose-500 bg-rose-50 text-rose-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ✗ Opened / Cut
                </button>
              </div>
              {packaging === 'opened' && (
                <p className="text-[11px] text-rose-600 font-medium">Opened packaging is strictly prohibited by health regulations.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Storage Condition
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStorageCondition('normal')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    storageCondition === 'normal'
                      ? 'border-teal-500 bg-teal-50 text-teal-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Room Temp (15-25°C)
                </button>
                <button
                  type="button"
                  onClick={() => setStorageCondition('cold-chain')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    storageCondition === 'cold-chain'
                      ? 'border-cyan-500 bg-cyan-50 text-cyan-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Cold Chain (2-8°C)
                </button>
              </div>
            </div>
          </div>

          {/* 5. Photo Upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Packaging & Expiry Photo (Optional but Boosts Safety Score)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-teal-400 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />
              {photoPreview ? (
                <div className="flex items-center space-x-4">
                  <img src={photoPreview} alt="Preview" className="h-16 w-16 object-cover rounded-xl border border-slate-200" />
                  <div className="text-left text-xs">
                    <p className="font-semibold text-slate-800">{photo.name}</p>
                    <p className="text-slate-500">{(photo.size / 1024).toFixed(1)} KB</p>
                    <span className="text-teal-600 font-bold hover:underline">Click to replace photo</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 text-slate-500">
                  <Upload className="w-6 h-6 text-slate-400 mb-1" />
                  <p className="text-xs font-medium text-slate-700">Click to upload photo of packaging and expiry print</p>
                  <p className="text-[11px] text-slate-400">PNG, JPG, or WebP up to 5MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || hasInstitutionalViolation || packaging === 'opened' || (daysLeft !== null && daysLeft < 90)}
              className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-md shadow-teal-600/20 transition-all flex items-center space-x-2"
            >
              {submitting ? (
                <span>Submitting & Validating...</span>
              ) : (
                <span>Submit to Pharmacist Review</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
