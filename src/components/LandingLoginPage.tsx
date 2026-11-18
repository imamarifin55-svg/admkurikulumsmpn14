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
  const [isTeacherSuggestionsOpen, setIsTeacherSuggestionsOpen] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const activeWakaPin = (profile.wakaPin || '123456').trim();

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

  // Live matching list when Guru types in Nama Pengguna (supports teachers with multiple subjects)
  const matchingTeachers = useMemo(() => {
    if (selectedRole !== 'guru') return [];
    const q = username.trim().toLowerCase();
    if (q.length < 1) return [];
    return teachers.filter(
      t =>
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.email.toLowerCase().split('@')[0].includes(q)
    );
  }, [selectedRole, username, teachers]);

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

  const handleSelectTeacherSuggestion = (teacher: Teacher) => {
    setSelectedTeacherId(teacher.id);
    setUsername(teacher.name);
    setIsTeacherSuggestionsOpen(false);
    setAuthError(null);
  };

  const handleUsernameInputChange = (value: string) => {
    setUsername(value);
    setAuthError(null);
    if (selectedRole === 'guru') {
      setIsTeacherSuggestionsOpen(value.trim().length > 0);
    }
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

    if (selectedRole === 'guru' && !selectedTeacherId && matchingTeachers.length > 1) {
      setIsTeacherSuggestionsOpen(true);
      setAuthError('Tersedia lebih dari satu pilihan mapel untuk nama tersebut. Silakan klik nama & mapel pada daftar.');
      return;
    }

    if (selectedRole === 'waka_kurikulum') {
      if (!wakaPinInput.trim()) {
        setAuthError('Silakan masukkan Password Waka Kurikulum.');
        return;
      }
      if (wakaPinInput.trim() !== activeWakaPin) {
        setAuthError('Password Waka Kurikulum tidak sesuai. Silakan periksa kembali password Anda.');
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
            <div className="bg-gradient-to-br from-[#13786a]/75 via-[#1c6285]/80 to-[#2b4794]/85 backdrop-blur-xl rounded-3xl border border-white/25 shadow-2xl shadow-slate-950/35 p-6 sm:p-8 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight drop-shadow-xs">
                  Masuk Sebagai
                </h2>
              </div>

              {authError && (
                <div className="p-3 text-xs text-rose-100 bg-rose-950/65 border border-rose-300/45 rounded-xl leading-normal">
                  {authError}
                </div>
              )}

              <form onSubmit={handleSubmitLogin} className="space-y-4">
                {/* Role Switch: Waka vs Guru */}
                <div>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/25 border border-white/15 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole('waka_kurikulum');
                        setIsTeacherSuggestionsOpen(false);
                        setAuthError(null);
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        selectedRole === 'waka_kurikulum'
                          ? 'bg-white text-[#274c9c] shadow-sm font-bold'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Waka Kurikulum</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole('guru');
                        setIsTeacherSuggestionsOpen(username.trim().length > 0);
                        setAuthError(null);
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        selectedRole === 'guru'
                          ? 'bg-white text-[#147a69] shadow-sm font-bold'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Guru Pengampu</span>
                    </button>
                  </div>
                </div>

                {/* Username Input */}
                <div className="relative">
                  <label htmlFor="username-input" className="block text-xs font-semibold text-white/95 mb-1.5">
                    Nama Pengguna:
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="username-input"
                      type="text"
                      autoComplete="off"
                      value={username}
                      onFocus={() => {
                        if (selectedRole === 'guru' && username.trim().length > 0) {
                          setIsTeacherSuggestionsOpen(true);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setIsTeacherSuggestionsOpen(false), 150);
                      }}
                      onChange={(e) => handleUsernameInputChange(e.target.value)}
                      placeholder={
                        selectedRole === 'waka_kurikulum'
                          ? 'Masukkan nama pengguna Waka Kurikulum'
                          : 'Ketik nama pengguna Anda'
                      }
                      className="w-full text-xs font-semibold bg-white/95 border border-white/60 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-emerald-200 focus:ring-2 focus:ring-white/30"
                    />
                  </div>

                  {/* Live Autocomplete Suggestions for Guru Pengampu (Name + Subject) */}
                  {selectedRole === 'guru' && isTeacherSuggestionsOpen && matchingTeachers.length > 0 && (
                    <div className="mt-1.5 bg-white border border-white/80 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100">
                      {matchingTeachers.map((t) => {
                        const isSelected = selectedTeacherId === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectTeacherSuggestion(t);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-900'
                                : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">{t.name}</div>
                              <div className="text-[11px] text-emerald-700 font-medium truncate">
                                {t.subject}
                              </div>
                            </div>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded shrink-0">
                                Dipilih
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {selectedRole === 'guru' && matchedTeacher && (!isTeacherSuggestionsOpen || Boolean(selectedTeacherId)) && (
                    <div className="mt-1.5 text-[11px] text-emerald-200 font-medium">
                      Terhubung dengan profil: <span className="font-bold text-white">{matchedTeacher.name}</span> ({matchedTeacher.subject})
                    </div>
                  )}
                </div>

                {/* Role-specific fields: Waka Password */}
                {selectedRole === 'waka_kurikulum' && (
                  <div>
                    <label htmlFor="waka-pin-input" className="block text-xs font-semibold text-white/95 mb-1.5">
                      Password:
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="waka-pin-input"
                        type={showPin ? 'text' : 'password'}
                        value={wakaPinInput}
                        onChange={(e) => {
                          setWakaPinInput(e.target.value);
                          setAuthError(null);
                        }}
                        placeholder="Masukkan password"
                        className="w-full text-xs font-mono font-semibold bg-white/95 border border-white/60 rounded-xl pl-9 pr-10 py-2.5 text-slate-900 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-emerald-200 focus:ring-2 focus:ring-white/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(prev => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                        title={showPin ? 'Sembunyikan Password' : 'Lihat Password'}
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Direct Submit Button */}
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 text-white bg-gradient-to-r from-[#22c096] via-[#278db3] to-[#4b6fd4] hover:brightness-110 ring-1 ring-white/35 rounded-full text-xs font-bold shadow-lg shadow-slate-950/30 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60"
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
