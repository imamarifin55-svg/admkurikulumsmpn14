import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, UserCheck, ArrowRight, School, User, KeyRound, Eye, EyeOff,
  Megaphone, Compass
} from 'lucide-react';
import { Teacher, SchoolProfile, AppUserRole, SchoolAnnouncement } from '../types/curriculum';
import { INITIAL_SCHOOL_PROFILE } from '../data/initialCurriculumData';

interface LandingLoginPageProps {
  profile: SchoolProfile;
  teachers: Teacher[];
  onUsernameLogin: (username: string, role: AppUserRole, matchedTeacherId?: string) => Promise<void>;
}

const CATEGORY_LABEL_MAP: Record<NonNullable<SchoolAnnouncement['category']>, { label: string; colorClass: string }> = {
  penting: { label: 'Penting', colorClass: 'text-rose-700' },
  jadwal: { label: 'Jadwal', colorClass: 'text-indigo-700' },
  panduan: { label: 'Panduan', colorClass: 'text-emerald-700' },
  edaran: { label: 'Edaran', colorClass: 'text-amber-700' }
};

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

  const visionText = (profile.schoolVision && profile.schoolVision.trim())
    ? profile.schoolVision.trim()
    : (INITIAL_SCHOOL_PROFILE.schoolVision || '');

  const missionList = (profile.schoolMission && profile.schoolMission.length > 0)
    ? profile.schoolMission.filter(m => m.trim().length > 0)
    : (INITIAL_SCHOOL_PROFILE.schoolMission || []);

  const announcementsList: SchoolAnnouncement[] =
    profile.announcements !== undefined
      ? profile.announcements
      : (INITIAL_SCHOOL_PROFILE.announcements || []);

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
    <div className="relative min-h-screen bg-gradient-to-br from-[#168e70] via-[#247b9c] to-[#3d5cb5] text-slate-900 flex flex-col font-sans overflow-x-clip">
      {/* Diagonal Translucent Geometric Bands inspired by Reference Palette */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 -left-24 w-[42%] h-[140%] -skew-x-[20deg] bg-gradient-to-b from-white/15 via-white/5 to-transparent" />
        <div className="absolute -top-24 left-[22%] w-[18%] h-[140%] -skew-x-[20deg] bg-slate-950/[0.06]" />
        <div className="absolute -top-24 left-[46%] w-[24%] h-[140%] -skew-x-[20deg] bg-white/[0.05]" />
        <div className="absolute -top-24 right-[-10%] w-[28%] h-[140%] -skew-x-[20deg] bg-slate-950/[0.08]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent" />
      </div>

      {/* 3-Zone Clean Header */}
      <header className="sticky top-0 z-30 bg-[#16836c]/60 backdrop-blur-md border-b border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-20 py-2.5 flex items-center justify-between gap-4 lg:gap-8">
          {/* Zone 1: Brand Wordmark + School Name & Address */}
          <a href="#top" className="flex items-center gap-3.5 min-w-0">
            {profile.schoolLogoUrl ? (
              <img
                src={profile.schoolLogoUrl}
                alt="Logo Sekolah"
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0 drop-shadow-sm"
              />
            ) : (
              <School className="w-9 h-9 sm:w-10 sm:h-10 text-white shrink-0" />
            )}
            <div className="min-w-0">
              <div className="font-bold text-white tracking-tight text-base sm:text-lg leading-tight">
                ArsipKurikulum
              </div>
              <div className="text-[14px] font-semibold text-white/95 leading-snug">
                {profile.name}
              </div>
              {profile.address && (
                <div className="text-[11px] sm:text-xs text-white/80 leading-snug">
                  {profile.address}
                </div>
              )}
            </div>
          </a>

          {/* Zone 2: Concise Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-white/85">
            <a href="#visi-misi" className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              Visi &amp; Misi
            </a>
            <a href="#pengumuman" className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              Pengumuman Guru
            </a>
            <a href="#login-form" className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              Portal Masuk
            </a>
          </nav>

          {/* Zone 3: Direct Primary Action */}
          <div className="flex items-center shrink-0">
            <a
              href="#login-form"
              className="px-4 py-2 text-xs font-semibold text-white border border-white/60 bg-white/10 hover:bg-white hover:text-[#1e6f7f] rounded-full shadow-xs transition-colors whitespace-nowrap shrink-0"
            >
              Masuk Portal
            </a>
          </div>
        </div>
      </header>

      {/* Main Split Section: School Vision/Mission & Announcements + Login Form */}
      <main id="top" className="relative z-10 py-8 lg:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Column: School Identity, Vision & Mission, and Teacher Announcements */}
          <div className="lg:col-span-7 space-y-6">
            {/* School Identity Header */}
            <div className="space-y-2">
              <div className="text-xs text-emerald-100 font-semibold drop-shadow-xs">
                <span>Tahun Pelajaran {profile.currentAcademicYear}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight text-balance max-w-2xl drop-shadow-xs">
                {profile.name}
              </h1>
            </div>

            {/* Visi & Misi Sekolah Section */}
            <section id="visi-misi" className="pt-2 space-y-5">
              <div className="flex items-center justify-between gap-4 pb-3 border-b border-white/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/15 ring-1 ring-white/25 text-white flex items-center justify-center shrink-0">
                    <Compass className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-white tracking-tight drop-shadow-xs">
                    Visi &amp; Misi Sekolah
                  </h2>
                </div>
                <span className="text-[11px] font-medium text-emerald-100/90 whitespace-nowrap">
                  Pedoman Mutu Kurikulum
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-bold text-emerald-200 tracking-wide">
                  Visi Satuan Pendidikan
                </div>
                <p className="text-sm font-medium text-white/95 leading-relaxed drop-shadow-xs">
                  &ldquo;{visionText}&rdquo;
                </p>
              </div>

              <div className="pt-4 border-t border-white/20 space-y-3">
                <div className="text-[11px] font-bold text-emerald-200 tracking-wide">
                  Misi Sekolah
                </div>
                {missionList.length === 0 ? (
                  <p className="text-xs text-white/75">
                    Poin misi sekolah belum diisi oleh Waka Kurikulum.
                  </p>
                ) : (
                  <ol className="space-y-2.5">
                    {missionList.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-xs sm:text-[13px] text-white/95 leading-relaxed">
                        <span className="font-mono font-bold text-emerald-200 tabular-nums shrink-0 mt-0.5">
                          {String(idx + 1).padStart(2, '0')}.
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </section>

            {/* Informasi & Pengumuman Kurikulum untuk Guru */}
            <section id="pengumuman" className="bg-gradient-to-b from-red-600 via-red-200 to-white rounded-2xl border border-red-200/80 shadow-xl shadow-slate-950/20 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/25 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/20 ring-1 ring-white/30 text-white flex items-center justify-center shrink-0">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-white tracking-tight drop-shadow-xs">
                    Informasi &amp; Pengumuman untuk Guru
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-white/90 tabular-nums whitespace-nowrap">
                  {announcementsList.length} informasi aktif
                </span>
              </div>

              {announcementsList.length === 0 ? (
                <div className="px-6 py-8 text-center text-xs text-slate-700 bg-gradient-to-b from-white/60 to-white/95">
                  Belum ada pengumuman terbaru dari Waka Kurikulum saat ini.
                </div>
              ) : (
                <div className="divide-y divide-red-200/60 bg-gradient-to-b from-white/55 via-white/80 to-white/95">
                  {announcementsList.map((ann) => {
                    const meta = CATEGORY_LABEL_MAP[ann.category || 'edaran'] || CATEGORY_LABEL_MAP.edaran;
                    return (
                      <article key={ann.id} className="px-6 py-4 space-y-1.5 hover:bg-white/60 transition-colors">
                        {ann.title && (
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                            {ann.title}
                          </h3>
                        )}
                        {ann.content && (
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                            {ann.content}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600 pt-0.5">
                          <span className={`font-bold ${meta.colorClass}`}>{meta.label}</span>
                          {ann.date && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">{ann.date}</span>
                            </>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Sticky Login Box */}
          <div id="login-form" className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="bg-[#f4f6f8]/95 backdrop-blur-md rounded-3xl border border-white/90 shadow-2xl shadow-slate-950/25 p-6 sm:p-8 space-y-5">
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
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 text-white bg-gradient-to-r from-[#1fa884] via-[#277ea1] to-[#3f62bd] hover:brightness-110 rounded-full text-xs font-bold shadow-md shadow-teal-950/20 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60"
                >
                  <span>
                    {isLoggingIn
                      ? 'Menghubungkan ke Portal...'
                      : `Masuk sebagai ${selectedRole === 'waka_kurikulum' ? 'Waka Kurikulum' : 'Guru Pengampu'}`}
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/15 bg-slate-950/20 backdrop-blur-sm py-6 px-4 sm:px-6 lg:px-8 mt-auto text-xs text-white/85">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            &copy; {new Date().getFullYear()} {profile.name} · Repositori Kurikulum Merdeka Digital
          </div>
          <div className="flex items-center gap-4 text-white/75">
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
