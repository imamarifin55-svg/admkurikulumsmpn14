import React, { useState } from 'react';
import { 
  ShieldCheck, UserCheck, ArrowRight, School
} from 'lucide-react';
import { Teacher, SchoolProfile, AppUserRole } from '../types/curriculum';

interface LandingLoginPageProps {
  profile: SchoolProfile;
  teachers: Teacher[];
  onGoogleLogin: (preferredRole: AppUserRole, preferredTeacherId?: string) => Promise<void>;
}

export const LandingLoginPage: React.FC<LandingLoginPageProps> = ({
  profile,
  teachers,
  onGoogleLogin
}) => {
  const [selectedRole, setSelectedRole] = useState<AppUserRole>('waka_kurikulum');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsAuthenticating(true);
      setAuthError(null);
      await onGoogleLogin(selectedRole, selectedRole === 'guru' ? selectedTeacherId : undefined);
    } catch {
      setAuthError('Login Google dibatalkan atau gagal. Silakan coba kembali dan izinkan popup browser.');
    } finally {
      setIsAuthenticating(false);
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
                <div className="font-bold text-slate-900 text-xs">Pemisahan Hak Akses</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Guru hanya melihat &amp; mengelola berkas pribadi miliknya.
                </div>
              </div>
              <div id="alur" className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="font-bold text-slate-900 text-xs">Dashboard Waka</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Supervisi matriks kelengkapan seluruh guru se-sekolah.
                </div>
              </div>
              <div id="keamanan" className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="font-bold text-slate-900 text-xs">Cloud Real-Time</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Otomatis tersinkron antar HP dan laptop begitu masuk akun.
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Unified Online Login Box */}
          <div id="login-form" className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Masuk ke Sistem Arsip
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Pilih peran Anda lalu masuk dengan akun Google / belajar.id agar langsung terhubung ke Cloud secara real-time.
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
                    Masuk Sebagai:
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('waka_kurikulum')}
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
                      onClick={() => setSelectedRole('guru')}
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

                {/* Role Context */}
                {selectedRole === 'guru' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Identitas Guru Pengampu:
                    </label>
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
                    >
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} — Guru {t.subject}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Jika email Google/belajar.id Anda sudah terdaftar di data guru, akun akan dikenali otomatis.
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-900">
                    <div className="font-bold flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="w-4 h-4 text-indigo-700" />
                      <span>Waka Kurikulum: {profile.curriculumViceName}</span>
                    </div>
                    <p className="text-[11px] text-indigo-800 leading-relaxed">
                      Akses penuh memonitor matriks seluruh {teachers.length} guru pengampu, memvalidasi telaah, dan mengesahkan berkas kurikulum sekolah secara real-time.
                    </p>
                  </div>
                )}

                {/* Unified Online Google / belajar.id Sign In */}
                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-[0.99] cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>
                    {isAuthenticating
                      ? 'Menghubungkan ke Cloud...'
                      : `Masuk Google / belajar.id (${selectedRole === 'waka_kurikulum' ? 'Waka Kurikulum' : 'Guru'})`}
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              </form>

              {/* Teacher Portofolio Preview Snapshot */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
                <img
                  src="/src/assets/images/teacher_portal_preview_1793926950156.jpg"
                  alt="Guru Beraktivitas"
                  className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-200"
                  referrerPolicy="no-referrer"
                />
                <div className="text-[11px] text-slate-500 leading-tight">
                  <strong className="text-slate-800 block">Langsung Terhubung Real-Time:</strong>
                  Unggah atau verifikasi berkas langsung tersinkron ke seluruh perangkat sekolah.
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
