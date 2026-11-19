import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, Upload, Trash2, CheckCircle2, Save, 
  Eye, ShieldCheck, Award, 
  Compass, Megaphone, Plus 
} from 'lucide-react';
import { SchoolProfile, SchoolAnnouncement } from '../types/curriculum';
import { INITIAL_SCHOOL_PROFILE } from '../data/initialCurriculumData';

interface SchoolProfileViewProps {
  profile: SchoolProfile;
  onSaveProfile: (updatedProfile: SchoolProfile) => void;
}

export const SchoolProfileView: React.FC<SchoolProfileViewProps> = ({
  profile,
  onSaveProfile
}) => {
  const [formData, setFormData] = useState<SchoolProfile>(profile);
  const [isSaved, setIsSaved] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const effectiveVision =
    formData.schoolVision !== undefined
      ? formData.schoolVision
      : (INITIAL_SCHOOL_PROFILE.schoolVision || '');

  const effectiveMission =
    formData.schoolMission !== undefined
      ? formData.schoolMission
      : (INITIAL_SCHOOL_PROFILE.schoolMission || []);

  const effectiveAnnouncements =
    formData.announcements !== undefined
      ? formData.announcements
      : (INITIAL_SCHOOL_PROFILE.announcements || []);

  const handleUpdateMissionItem = (index: number, value: string) => {
    const next = [...effectiveMission];
    next[index] = value;
    setFormData(prev => ({ ...prev, schoolMission: next }));
  };

  const handleAddMissionItem = () => {
    setFormData(prev => ({ ...prev, schoolMission: [...effectiveMission, ''] }));
  };

  const handleRemoveMissionItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      schoolMission: effectiveMission.filter((_, i) => i !== index)
    }));
  };

  const handleAddAnnouncement = () => {
    const todayFormatted = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const newItem: SchoolAnnouncement = {
      id: `ann-${Date.now()}`,
      title: '',
      content: '',
      date: todayFormatted,
      category: 'penting'
    };
    setFormData(prev => ({
      ...prev,
      announcements: [newItem, ...effectiveAnnouncements]
    }));
  };

  const handleUpdateAnnouncement = (
    id: string,
    field: keyof SchoolAnnouncement,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      announcements: effectiveAnnouncements.map(a =>
        a.id === id ? { ...a, [field]: value } : a
      )
    }));
  };

  const handleRemoveAnnouncement = (id: string) => {
    setFormData(prev => ({
      ...prev,
      announcements: effectiveAnnouncements.filter(a => a.id !== id)
    }));
  };

  const schoolLogoInputRef = useRef<HTMLInputElement>(null);
  const pemdaLogoInputRef = useRef<HTMLInputElement>(null);
  const wakaSigInputRef = useRef<HTMLInputElement>(null);
  const headmasterSigInputRef = useRef<HTMLInputElement>(null);

  // Handle image upload and resize/compress to stay well below Firestore 1MB doc limit
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'schoolLogoUrl' | 'pemdaLogoUrl' | 'wakaSignatureUrl' | 'headmasterSignatureUrl'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Ukuran berkas gambar terlalu besar. Maksimal 2 MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const updateState = (finalUrl: string) => {
        setFormData(prev => ({ ...prev, [field]: finalUrl }));
      };

      // Keep small SVGs directly; resize raster images via canvas to max 256x256
      if (file.type === 'image/svg+xml' && rawDataUrl.length < 150000) {
        updateState(rawDataUrl);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const maxDim = 256;
        const scale = Math.min(1, maxDim / Math.max(img.width || maxDim, img.height || maxDim));
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, targetW, targetH);
          updateState(canvas.toDataURL('image/png'));
        } else {
          updateState(rawDataUrl);
        }
      };
      img.onerror = () => updateState(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = (type: 'school' | 'pemda') => {
    if (type === 'school') {
      setFormData(prev => ({ ...prev, schoolLogoUrl: '' }));
      if (schoolLogoInputRef.current) schoolLogoInputRef.current.value = '';
    } else {
      setFormData(prev => ({ ...prev, pemdaLogoUrl: '' }));
      if (pemdaLogoInputRef.current) pemdaLogoInputRef.current.value = '';
    }
  };

  // Preset demo logos
  const handleUsePresetLogo = (type: 'school' | 'pemda') => {
    if (type === 'school') {
      // SVG School Emblem
      const schoolSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="%234338ca" stroke="%23fbbf24" stroke-width="4"/><path d="M50 20 L75 35 L50 50 L25 35 Z" fill="%23fbbf24"/><path d="M35 48 L35 70 C35 75 65 75 65 70 L65 48" fill="none" stroke="%23ffffff" stroke-width="3"/><path d="M40 78 L60 78" stroke="%23fbbf24" stroke-width="3"/><text x="50" y="90" font-size="8" font-family="sans-serif" font-weight="bold" fill="%23ffffff" text-anchor="middle">SMP 1</text></svg>`;
      setFormData(prev => ({ ...prev, schoolLogoUrl: schoolSvg }));
    } else {
      // SVG Pemda Emblem
      const pemdaSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 10 L85 28 L85 62 C85 78 50 92 50 92 C50 92 15 78 15 62 L15 28 Z" fill="%23dc2626" stroke="%23fbbf24" stroke-width="3"/><circle cx="50" cy="50" r="22" fill="%23ffffff"/><polygon points="50,34 54,44 65,44 56,51 59,62 50,55 41,62 44,51 35,44 46,44" fill="%23fbbf24"/><text x="50" y="80" font-size="7" font-family="sans-serif" font-weight="bold" fill="%23ffffff" text-anchor="middle">DKI JKT</text></svg>`;
      setFormData(prev => ({ ...prev, pemdaLogoUrl: pemdaSvg }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedMission = effectiveMission.map(m => m.trim()).filter(Boolean);
    const cleanedAnnouncements = effectiveAnnouncements
      .map(a => ({
        ...a,
        title: a.title.trim(),
        content: a.content.trim(),
        date: a.date.trim()
      }))
      .filter(a => a.title.length > 0 || a.content.length > 0);

    onSaveProfile({
      ...formData,
      wakaPin: (formData.wakaPin ?? '').trim() || '123456',
      schoolVision: effectiveVision.trim(),
      schoolMission: cleanedMission,
      announcements: cleanedAnnouncements
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 mb-8 text-xs">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Profil Satuan Pendidikan &amp; Identitas Kop Surat
            </h2>
            <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-2 py-0.5">
              NPSN: {formData.npsn}
            </span>
          </div>
          <p className="text-slate-500 mt-1">
            Kelola data pokok sekolah, pejabat kurikulum, serta unggah logo sekolah dan logo pemda untuk penerbitan Lembar Pengesahan Resmi.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs transition-colors shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Perubahan</span>
        </button>
      </div>

      {isSaved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Profil sekolah dan logo berhasil diperbarui ke seluruh sistem!</span>
        </div>
      )}

      {uploadError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-2 font-medium">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-rose-700 underline text-[11px]"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Grid: Logos Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Upload Logo Pemda / Dinas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                1. Logo Pemerintah Daerah / Dinas
              </h3>
              <p className="text-[11px] text-slate-500">
                Ditampilkan di sisi kiri atas Kop Surat Resmi
              </p>
            </div>
            <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              Kop Kiri
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Preview Box */}
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center p-2 overflow-hidden shrink-0">
              {formData.pemdaLogoUrl ? (
                <img
                  src={formData.pemdaLogoUrl}
                  alt="Logo Pemda"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center text-slate-400 text-[10px]">
                  <Building2 className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                  <span>Belum ada logo</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="space-y-2 flex-1">
              <input
                type="file"
                ref={pemdaLogoInputRef}
                onChange={(e) => handleImageUpload(e, 'pemdaLogoUrl')}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => pemdaLogoInputRef.current?.click()}
                className="w-full py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Pilih Logo Pemda</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUsePresetLogo('pemda')}
                  className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded text-[11px] transition-colors"
                >
                  Gunakan Preset
                </button>
                {formData.pemdaLogoUrl && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLogo('pemda')}
                    className="py-1 px-2 text-rose-600 hover:bg-rose-50 rounded text-[11px] transition-colors"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400">
            Format yang didukung: PNG, JPG, SVG, WebP (Maks. 2MB, rasio 1:1 disarankan).
          </div>
        </div>

        {/* 2. Upload Logo Sekolah */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                2. Logo Satuan Pendidikan
              </h3>
              <p className="text-[11px] text-slate-500">
                Ditampilkan di sisi kanan atas Kop Surat Resmi &amp; Sidebar
              </p>
            </div>
            <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              Kop Kanan
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Preview Box */}
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center p-2 overflow-hidden shrink-0">
              {formData.schoolLogoUrl ? (
                <img
                  src={formData.schoolLogoUrl}
                  alt="Logo Sekolah"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center text-slate-400 text-[10px]">
                  <Building2 className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                  <span>Belum ada logo</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="space-y-2 flex-1">
              <input
                type="file"
                ref={schoolLogoInputRef}
                onChange={(e) => handleImageUpload(e, 'schoolLogoUrl')}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => schoolLogoInputRef.current?.click()}
                className="w-full py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Pilih Logo Sekolah</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUsePresetLogo('school')}
                  className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded text-[11px] transition-colors"
                >
                  Gunakan Preset
                </button>
                {formData.schoolLogoUrl && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLogo('school')}
                    className="py-1 px-2 text-rose-600 hover:bg-rose-50 rounded text-[11px] transition-colors"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400">
            Format yang didukung: PNG, JPG, SVG, WebP (Maks. 2MB, rasio 1:1 transparan disarankan).
          </div>
        </div>
      </div>

      {/* Live Kop Surat Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Eye className="w-4 h-4 text-indigo-600" />
            <span>Pratinjau Hasil Kop Surat Kedinasan:</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Format A4 Resmi</span>
        </div>

        <div className="border border-slate-300 rounded-xl p-5 bg-white font-serif max-w-3xl mx-auto shadow-2xs">
          <div className="flex items-center justify-between gap-4 pb-3 border-b-2 border-slate-900">
            {/* Logo Pemda */}
            <div className="w-16 h-16 flex items-center justify-center shrink-0">
              {formData.pemdaLogoUrl ? (
                <img src={formData.pemdaLogoUrl} alt="Logo Pemda" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="w-12 h-12 rounded border border-slate-300 flex items-center justify-center text-[8px] text-slate-400 text-center font-sans">
                  Logo Pemda
                </div>
              )}
            </div>

            {/* Kop Center Text */}
            <div className="text-center font-sans flex-1">
              <div className="text-[10px] font-bold tracking-widest uppercase text-slate-700">
                {formData.regionalGovernment}
              </div>
              <div className="text-xs font-bold tracking-wider uppercase text-slate-800">
                {formData.educationDepartment}
              </div>
              <div className="text-base sm:text-lg font-bold font-serif text-slate-950 uppercase tracking-tight my-0.5">
                {formData.name}
              </div>
              <div className="text-[10px] text-slate-600">
                {formData.address} {formData.postalCode ? `Kode Pos ${formData.postalCode}` : ''}
              </div>
              <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                NPSN: {formData.npsn} · {formData.accreditation} · Telp: {formData.phone || '-'} · Laman: {formData.website || '-'}
              </div>
            </div>

            {/* Logo Sekolah */}
            <div className="w-16 h-16 flex items-center justify-center shrink-0">
              {formData.schoolLogoUrl ? (
                <img src={formData.schoolLogoUrl} alt="Logo Sekolah" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="w-12 h-12 rounded border border-slate-300 flex items-center justify-center text-[8px] text-slate-400 text-center font-sans">
                  Logo Sekolah
                </div>
              )}
            </div>
          </div>
          <div className="border-b border-slate-900 mt-0.5" />
        </div>
      </div>

      {/* Main Edit Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
          Rincian Identitas Satuan Pendidikan &amp; Pengesahan
        </h3>

        {/* School Name & NPSN */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Nama Lengkap Satuan Pendidikan
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full font-semibold text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nomor Pokok Sekolah Nasional (NPSN)
            </label>
            <input
              type="text"
              required
              value={formData.npsn}
              onChange={(e) => setFormData(prev => ({ ...prev, npsn: e.target.value }))}
              className="w-full font-mono font-bold text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Level, Accreditation & Active Academic Year */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Jenjang Satuan Pendidikan
            </label>
            <select
              value={formData.level}
              onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:border-indigo-500 focus:outline-none"
            >
              <option value="SMP (Sekolah Menengah Pertama)">SMP (Sekolah Menengah Pertama)</option>
              <option value="SMA (Sekolah Menengah Atas)">SMA (Sekolah Menengah Atas)</option>
              <option value="SMK (Sekolah Menengah Kejuruan)">SMK (Sekolah Menengah Kejuruan)</option>
              <option value="SD (Sekolah Dasar)">SD (Sekolah Dasar)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Status Akreditasi
            </label>
            <input
              type="text"
              value={formData.accreditation}
              onChange={(e) => setFormData(prev => ({ ...prev, accreditation: e.target.value }))}
              placeholder="Contoh: Akreditasi A (Unggul)"
              className="w-full border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Tahun Pelajaran Aktif
            </label>
            <select
              value={formData.currentAcademicYear}
              onChange={(e) => setFormData(prev => ({ ...prev, currentAcademicYear: e.target.value }))}
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
            >
              <option value="2026/2027">2026/2027</option>
              <option value="2025/2026">2025/2026</option>
              <option value="2024/2025">2024/2025</option>
              <option value="2023/2024">2023/2024</option>
            </select>
          </div>
        </div>

        {/* Regional Government & Education Department */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Pemerintah Daerah (Header Baris 1 Kop)
            </label>
            <input
              type="text"
              value={formData.regionalGovernment}
              onChange={(e) => setFormData(prev => ({ ...prev, regionalGovernment: e.target.value }))}
              placeholder="PEMERINTAH DAERAH PROVINSI..."
              className="w-full uppercase font-medium text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Dinas Pendidikan (Header Baris 2 Kop)
            </label>
            <input
              type="text"
              value={formData.educationDepartment}
              onChange={(e) => setFormData(prev => ({ ...prev, educationDepartment: e.target.value }))}
              placeholder="DINAS PENDIDIKAN..."
              className="w-full uppercase font-medium text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Address & Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Alamat Lengkap Sekolah
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="w-full text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Kode Pos
            </label>
            <input
              type="text"
              value={formData.postalCode || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
              className="w-full font-mono text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Phone, Email, Website */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nomor Telepon
            </label>
            <input
              type="text"
              value={formData.phone || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Email Resmi Sekolah
            </label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Laman Website Sekolah
            </label>
            <input
              type="text"
              value={formData.website || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              className="w-full text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Headmaster & Curriculum Vice */}
        <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" />
              Kepala Sekolah (Pejabat Pengesah)
            </h4>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Nama Lengkap &amp; Gelar</label>
              <input
                type="text"
                required
                value={formData.headmasterName}
                onChange={(e) => setFormData(prev => ({ ...prev, headmasterName: e.target.value }))}
                className="w-full font-semibold text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">NIP Kepala Sekolah</label>
              <input
                type="text"
                required
                value={formData.headmasterNip}
                onChange={(e) => setFormData(prev => ({ ...prev, headmasterNip: e.target.value }))}
                className="w-full font-mono text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Waka Kurikulum &amp; Supervisi (Pejabat Penelaah)
            </h4>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Nama Lengkap &amp; Gelar</label>
              <input
                type="text"
                required
                value={formData.curriculumViceName}
                onChange={(e) => setFormData(prev => ({ ...prev, curriculumViceName: e.target.value }))}
                className="w-full font-semibold text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">NIP Waka Kurikulum</label>
              <input
                type="text"
                required
                value={formData.curriculumViceNip}
                onChange={(e) => setFormData(prev => ({ ...prev, curriculumViceNip: e.target.value }))}
                className="w-full font-mono text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tanda Tangan / Stempel Digital & Password Login Waka */}
        <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* TTD Waka */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="font-bold text-slate-900">TTD / Paraf Waka Kurikulum</div>
            <div className="h-20 rounded-lg border border-dashed border-slate-300 bg-white flex items-center justify-center p-2 overflow-hidden">
              {formData.wakaSignatureUrl ? (
                <img src={formData.wakaSignatureUrl} alt="TTD Waka" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-[11px] text-slate-400">Belum diunggah (pakai QR otomatis)</span>
              )}
            </div>
            <input
              type="file"
              ref={wakaSigInputRef}
              onChange={(e) => handleImageUpload(e, 'wakaSignatureUrl')}
              accept="image/*"
              className="hidden"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => wakaSigInputRef.current?.click()}
                className="flex-1 py-1.5 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-semibold cursor-pointer"
              >
                Unggah TTD
              </button>
              {formData.wakaSignatureUrl && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, wakaSignatureUrl: '' }))}
                  className="py-1.5 px-2.5 text-rose-600 hover:bg-rose-50 rounded-lg font-medium cursor-pointer"
                >
                  Hapus
                </button>
              )}
            </div>
          </div>

          {/* TTD Kepala Sekolah */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="font-bold text-slate-900">TTD &amp; Stempel Kepala Sekolah</div>
            <div className="h-20 rounded-lg border border-dashed border-slate-300 bg-white flex items-center justify-center p-2 overflow-hidden">
              {formData.headmasterSignatureUrl ? (
                <img src={formData.headmasterSignatureUrl} alt="TTD Kepala Sekolah" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-[11px] text-slate-400">Belum diunggah (pakai segel digital)</span>
              )}
            </div>
            <input
              type="file"
              ref={headmasterSigInputRef}
              onChange={(e) => handleImageUpload(e, 'headmasterSignatureUrl')}
              accept="image/*"
              className="hidden"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => headmasterSigInputRef.current?.click()}
                className="flex-1 py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-semibold cursor-pointer"
              >
                Unggah TTD/Cap
              </button>
              {formData.headmasterSignatureUrl && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, headmasterSignatureUrl: '' }))}
                  className="py-1.5 px-2.5 text-rose-600 hover:bg-rose-50 rounded-lg font-medium cursor-pointer"
                >
                  Hapus
                </button>
              )}
            </div>
          </div>

          {/* Password Login Waka */}
          <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-2">
            <div className="font-bold text-indigo-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-700" />
              <span>Password Login Waka Kurikulum</span>
            </div>
            <p className="text-[11px] text-indigo-800 leading-relaxed">
              Melindungi akses admin Waka Kurikulum saat masuk di halaman login.
            </p>
            <input
              type="text"
              maxLength={32}
              value={formData.wakaPin ?? ''}
              onChange={(e) => setFormData(prev => ({ ...prev, wakaPin: e.target.value }))}
              placeholder="Kosongkan untuk bawaan (123456)"
              className="w-full font-mono font-bold text-slate-900 bg-white border border-indigo-300 rounded-lg p-2.5 focus:border-indigo-600 focus:outline-none placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
            />
            <div className="text-[10px] text-indigo-700">
              Disarankan ubah dari password bawaan (<span className="font-mono">123456</span>).
            </div>
          </div>
        </div>

        {/* Visi, Misi & Pengumuman Guru (Tampil di Halaman Login) */}
        <div className="pt-4 border-t border-slate-200 space-y-5">
          <div>
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-indigo-600" />
              Visi, Misi &amp; Papan Pengumuman Guru (Halaman Login)
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Seluruh informasi di bawah ini langsung tampil di halaman depan sebelum guru masuk portal.
            </p>
          </div>

          {/* Visi Sekolah */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Visi Sekolah
            </label>
            <textarea
              rows={2}
              value={effectiveVision}
              onChange={(e) => setFormData(prev => ({ ...prev, schoolVision: e.target.value }))}
              placeholder="Tuliskan visi resmi sekolah..."
              className="w-full text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Misi Sekolah */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="font-semibold text-slate-700">
                Poin Misi Sekolah ({effectiveMission.length} poin)
              </label>
              <button
                type="button"
                onClick={handleAddMissionItem}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Poin Misi</span>
              </button>
            </div>

            {effectiveMission.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-slate-400 text-center">
                Belum ada poin misi. Klik &ldquo;Tambah Poin Misi&rdquo; untuk menambahkan.
              </div>
            ) : (
              <div className="space-y-2">
                {effectiveMission.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-500 w-6 text-right shrink-0">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={m}
                      onChange={(e) => handleUpdateMissionItem(idx, e.target.value)}
                      placeholder={`Poin misi ke-${idx + 1}...`}
                      className="flex-1 text-slate-800 border border-slate-200 rounded-lg p-2 focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveMissionItem(idx)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer shrink-0"
                      title="Hapus poin misi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pengumuman & Informasi Guru */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-2">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Megaphone className="w-4 h-4 text-amber-600" />
                <span>Informasi &amp; Pengumuman untuk Guru ({effectiveAnnouncements.length})</span>
              </label>
              <button
                type="button"
                onClick={handleAddAnnouncement}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Pengumuman</span>
              </button>
            </div>

            {effectiveAnnouncements.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-400 text-center">
                Belum ada pengumuman aktif di halaman login.
              </div>
            ) : (
              <div className="space-y-3">
                {effectiveAnnouncements.map((ann, idx) => (
                  <div key={ann.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-slate-700">
                        Pengumuman #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAnnouncement(ann.id)}
                        className="inline-flex items-center gap-1 text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-md font-medium cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-6">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Judul Pengumuman
                        </label>
                        <input
                          type="text"
                          value={ann.title}
                          onChange={(e) => handleUpdateAnnouncement(ann.id, 'title', e.target.value)}
                          placeholder="Contoh: Batas Akhir Unggah ATP"
                          className="w-full bg-white font-semibold text-slate-900 border border-slate-200 rounded-lg p-2 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Kategori
                        </label>
                        <select
                          value={ann.category || 'edaran'}
                          onChange={(e) => handleUpdateAnnouncement(ann.id, 'category', e.target.value)}
                          className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg p-2 focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="penting">Penting</option>
                          <option value="jadwal">Jadwal</option>
                          <option value="panduan">Panduan</option>
                          <option value="edaran">Edaran</option>
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Tanggal Info
                        </label>
                        <input
                          type="text"
                          value={ann.date}
                          onChange={(e) => handleUpdateAnnouncement(ann.id, 'date', e.target.value)}
                          placeholder="Mis. 17 Nov 2026"
                          className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg p-2 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Isi Pesan untuk Guru
                      </label>
                      <textarea
                        rows={2}
                        value={ann.content}
                        onChange={(e) => handleUpdateAnnouncement(ann.id, 'content', e.target.value)}
                        placeholder="Tuliskan detail pengumuman atau instruksi kurikulum..."
                        className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg p-2 focus:border-indigo-500 focus:outline-none leading-relaxed"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Bar */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-slate-500 text-[11px]">
            * Data profil ini secara langsung menentukan identitas kop surat, tanda tangan cetak, Password Waka, serta Visi, Misi &amp; Pengumuman di halaman login.
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan Profil</span>
          </button>
        </div>
      </form>
    </div>
  );
};
