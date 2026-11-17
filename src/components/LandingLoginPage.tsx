import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, UserCheck, ArrowRight, School, User, KeyRound, Eye, EyeOff
} from 'lucide-react';
import { Teacher, SchoolProfile, AppUserRole } from '../types/curriculum';

interface LandingLoginPageProps {
  profile: SchoolProfile;
  teachers: Teacher[];
  onUsernameLogin: (username: string, role: AppUserRole, matchedTeacherId?: string) => Promise<void>;
}

export const LandingLoginPage: React.FC<LandingLoginPageProps> = ({
  profile,
  teachers,
  onUsernameLogin
}) => {
  const [selectedRole, setSelectedRole] = useState<AppUserRole>('waka_kurikulum');
  const [username, setUsername] = useState<string>('');
  const [wakaPinInput, setWakaPinInput] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const activeWakaPin = (profile.wakaPin || '123456').trim();
  const isUsingDefaultPin = activeWakaPin === '123456';

  // Auto-match typed username against teacher directory when role is Guru
  const matchedTeacher = useMemo(() => {
    if (selectedRole !== 'guru') return undefined;
    if (selectedTeacherId) {
      return teachers.find(t => t.id === selectedTeacherId);
    }
    const q = username.trim().toLowerCase();
    if (q.length < 2) return undefined;
    return teachers.find(
      t =>
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().split('@')[0].includes(q)
    );
  }, [selectedRole, selectedTeacherId, username, teachers]);

  const handleTeacherDropdownChange = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    const found = teachers.find(t => t.id === teacherId);
    if (found) {
      setUsername(found.name);
      setAuthError(null);
    }
  };

  const handleUsernameInputChange = (value: string) => {
    setUsername(value);
    setAuthError(null);
    if (selectedTeacherId) {
      const current = teachers.find(t => t.id === selectedTeacherId);
      if (!current || current.name !== value) {
        setSelectedTeacherId('');
      }
    }
  };

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed.length < 2) {
      setAuthError('Silakan masukkan nama pengguna minimal 2 karakter.');
      return;
    }

    if (selectedRole === 'waka_kurikulum') {
      if (!wakaPinInput.trim()) {
        setAuthError('Silakan masukkan PIN Keamanan Waka Kurikulum.');
        return;
      }
      if (wakaPinInput.trim() !== activeWakaPin) {
        setAuthError('PIN Waka Kurikulum tidak sesuai. Silakan periksa kembali PIN Anda.');
        return;
      }
    }

    try {
      setIsLoggingIn(true);
      setAuthError(null);
      await onUsernameLogin(
        trimmed,
        selectedRole,
        selectedRole === 'guru' ? matchedTeacher?.id : undefined
      );
    } catch {
      setAuthError('Gagal masuk ke sistem. Silakan periksa koneksi internet Anda dan coba lagi.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* 3-Zone Clean Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 overflow-hidden">
              {profile.schoolLogoUrl ? (
                <img src={profile.schoolLogoUrl} alt="Logo" className="w-full h-full object-contain p-0.5 bg-white" />
              ) : (
                <School className="w-5 h-5" />
              )}
            </div>
            <div className="leading-none">
              <span className="font-bold text-slate-900 tracking-tight text-base whitespace-nowrap">
                ArsipKurikulum
              </span>
              <span className="hidden sm:inline text-xs text-slate-500 font-normal ml-2 truncate max-w-[200px]">
                {profile.name}
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#fitur" className="hover:text-slate-900 transition-colors whitespace-nowrap">Fitur Terpadu</a>
            <a href="#alur" className="hover:text-slate-900 transition-colors whitespace-nowrap">Alur Supervisi</a>
            <a href="#keamanan" className="hover:text-slate-900 transition-colors whitespace-nowrap">Cloud Real-Time</a>
          </nav>

          {/* Zone 3: Direct Action */}
          <div className="flex items-center gap-2.5">
            <a
              href="#login-form"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              Masuk Portal
            </a>
          </div>
        </div>
      </header>

      {/* Hero & Login Section Split */}
      <section className="py-10 lg:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: School Context & Hero Content */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 text-xs text-indigo-700 font-semibold">
              <span>Kurikulum Merdeka</span>
              <span aria-hidden="true">·</span>
              <span>Fase D SMP</span>
              <span aria-hidden="true">·</span>
              <span>Tahun Pelajaran {profile.currentAcademicYear}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight text-balance">
              Sistem Informasi Arsip Kurikulum &amp; Supervisi Terpadu
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
              Portal terintegrasi antara <strong>Dashboard Utama Waka Kurikulum</strong> untuk telaah dan pengesahan seluruh perangkat ajar sekolah, dengan <strong>Portal Mandiri Guru</strong> untuk pengarsipan silabus, modul ajar, dan program semester secara real-time di semua perangkat.
            </p>

            {/* Visual Campus Showcase Card */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm max-h-72">
              <img
                src="/src/assets/images/school_hero_curriculum_1793926950298.jpg"
                alt="Kampus Satuan Pendidikan"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-transparent flex flex-col justify-end p-5 text-white">
                <div className="text-xs font-bold text-white/90">
                  {profile.name} · NPSN: {profile.npsn}
                </div>
                <div className="text-[11px] text-white/70">
                  {profile.regionalGovernment} · {profile.educationDepartment}
                </div>
              </div>
            </div>

            {/* Key Pillars */}
            <div id="fitur" className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="font-bold text-slate-900 text-xs">Keamanan Peran</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Guru masuk cepat pakai nama, Waka Kurikulum dilindungi PIN.
                </div>
              </div>
              <div id="alur" className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="font-bold text-slate-900 text-xs">Arsip &amp; Unduh Berkas</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Lampiran dokumen &amp; tautan tersimpan di Cloud lintas perangkat.
                </div>
              </div>
              <div id="keamanan" className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="font-bold text-slate-900 text-xs">Cloud Real-Time</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Otomatis tersinkron antar HP dan laptop beserta log aktivitas.
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Simple Username + Role (+ Waka PIN) Login Box */}
          <div id="login-form" className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Masuk ke Sistem Arsip
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Pilih peran dan ketik nama pengguna Anda untuk langsung masuk dan terhubung real-time.
                </p>
              </div>

              {authError && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl leading-normal">
                  {authError}
                </div>
              )}

              <form onSubmit={handleSubmitLogin} className="space-y-4">
                {/* Role Switch: Waka vs Guru */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Masuk Sebagai Peran:
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole('waka_kurikulum');
                        setAuthError(null);
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        selectedRole === 'waka_kurikulum'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Waka Kurikulum</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole('guru');
                        setAuthError(null);
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        selectedRole === 'guru'
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Guru Pengampu</span>
                    </button>
                  </div>
                </div>

                {/* Username Input */}
                <div>
                  <label htmlFor="username-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nama Pengguna:
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="username-input"
                      type="text"
                      value={username}
                      onChange={(e) => handleUsernameInputChange(e.target.value)}
                      placeholder={
                        selectedRole === 'waka_kurikulum'
                          ? `Contoh: ${profile.curriculumViceName || 'Imam Arifin'}`
                          : 'Ketik nama Anda, misal: Dewi Lestari'
                      }
                      className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  {selectedRole === 'waka_kurikulum' && profile.curriculumViceName && (
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500">Klik cepat untuk isi otomatis:</span>
                      <button
                        type="button"
                        onClick={() => handleUsernameInputChange(profile.curriculumViceName)}
                        className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 hover:underline cursor-pointer truncate max-w-[200px]"
                      >
                        {profile.curriculumViceName}
                      </button>
                    </div>
                  )}

                  {selectedRole === 'guru' && matchedTeacher && (
                    <div className="mt-1.5 text-[11px] text-emerald-700 font-medium">
                      Terhubung dengan profil: <span className="font-bold">{matchedTeacher.name}</span> ({matchedTeacher.subject})
                    </div>
                  )}
                </div>

                {/* Role-specific fields */}
                {selectedRole === 'guru' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pilih Cepat dari Daftar Guru (Opsional):
                    </label>
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => handleTeacherDropdownChange(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Pilih Nama Guru Terdaftar --</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} — {t.subject}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="waka-pin-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        PIN Keamanan Waka Kurikulum:
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="waka-pin-input"
                          type={showPin ? 'text' : 'password'}
                          inputMode="numeric"
                          value={wakaPinInput}
                          onChange={(e) => {
                            setWakaPinInput(e.target.value);
                            setAuthError(null);
                          }}
                          placeholder="Masukkan PIN Waka Kurikulum"
                          className="w-full text-xs font-mono font-semibold bg-white border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 text-slate-900 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(prev => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                          title={showPin ? 'Sembunyikan PIN' : 'Lihat PIN'}
                        >
                          {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {isUsingDefaultPin && (
                        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                          <span>PIN awal sistem: <strong className="font-mono text-indigo-700">123456</strong> (ubah di Profil Sekolah)</span>
                          <button
                            type="button"
                            onClick={() => setWakaPinInput('123456')}
                            className="text-indigo-700 font-semibold hover:underline cursor-pointer shrink-0"
                          >
                            Isi PIN
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-900">
                      <div className="font-bold flex items-center gap-1.5 mb-0.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-700" />
                        <span>Waka Kurikulum: {profile.curriculumViceName}</span>
                      </div>
                      <p className="text-[11px] text-indigo-800 leading-relaxed">
                        Akses penuh supervisi {teachers.length} guru, pengesahan SK, manajemen kategori, serta audit log aktivitas.
                      </p>
                    </div>
                  </div>
                )}

                {/* Direct Submit Button */}
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60 ${
                    selectedRole === 'waka_kurikulum'
                      ? 'bg-indigo-700 hover:bg-indigo-800'
                      : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  <span>
                    {isLoggingIn
                      ? 'Menghubungkan ke Portal...'
                      : `Masuk sebagai ${selectedRole === 'waka_kurikulum' ? 'Waka Kurikulum' : 'Guru Pengampu'}`}
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              </form>

              {/* Real-Time Info Snapshot */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
                <img
                  src="/src/assets/images/teacher_portal_preview_1793926950156.jpg"
                  alt="Guru Beraktivitas"
                  className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-200"
                  referrerPolicy="no-referrer"
                />
                <div className="text-[11px] text-slate-500 leading-tight">
                  <strong className="text-slate-800 block">Langsung Terhubung Real-Time:</strong>
                  Unggah atau verifikasi berkas langsung tersinkron otomatis ke seluruh perangkat sekolah.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 sm:px-6 lg:px-8 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            &copy; {new Date().getFullYear()} {profile.name} · Repositori Kurikulum Merdeka Digital
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>NPSN: {profile.npsn}</span>
            <span aria-hidden="true">·</span>
            <span>Akreditasi: {profile.accreditation}</span>
            <span aria-hidden="true">·</span>
            <span>Waka Kurikulum: {profile.curriculumViceName}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
