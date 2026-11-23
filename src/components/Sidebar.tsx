import React, { useState, useEffect } from 'react';
import { 
  Archive, ListFilter, LayoutGrid, ShieldCheck, FileSpreadsheet, 
  Plus, Building2, X, FolderKanban, Users, UserCheck, ChevronDown,
  BookOpenCheck, MailCheck, FolderArchive
} from 'lucide-react';
import { AppUser, SchoolProfile, SemesterType, Teacher } from '../types/curriculum';
import { SchoolLogoImg } from './SchoolLogoImg';

export type SidebarActiveView =
  | 'list'
  | 'surat_izin'
  | 'lainnya'
  | 'matrix'
  | 'supervision'
  | 'reports'
  | 'profile'
  | 'categories'
  | 'teachers'
  | 'wali_kelas';

interface SidebarProps {
  activeView: SidebarActiveView;
  onViewChange: (view: SidebarActiveView) => void;
  onOpenUpload: () => void;
  profile: SchoolProfile;
  academicYear: string;
  onAcademicYearChange: (year: string) => void;
  currentSemester: SemesterType;
  onSemesterChange: (semester: SemesterType) => void;
  totalDocumentsCount: number;
  semesterDocsCount: number;
  suratIzinCount?: number;
  lainnyaCount?: number;
  pendingCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  currentUser: AppUser;
  teachers: Teacher[];
  isHomeroomGuru?: boolean;
  homeroomClass?: string | null;
  walasDocsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  onOpenUpload,
  profile,
  academicYear,
  onAcademicYearChange,
  currentSemester,
  onSemesterChange,
  totalDocumentsCount,
  semesterDocsCount,
  suratIzinCount = 0,
  lainnyaCount = 0,
  pendingCount,
  isOpenMobile,
  onCloseMobile,
  currentUser,
  teachers,
  isHomeroomGuru = false,
  homeroomClass,
  walasDocsCount = 0
}) => {
  const currentTeacher = teachers.find(t => t.id === currentUser.teacherId);
  const isGuru = currentUser.role === 'guru';
  const showWalasMenu = !isGuru || isHomeroomGuru;
  const isArsipGuruChildActive =
    activeView === 'list' || activeView === 'surat_izin' || activeView === 'lainnya';
  const [isArsipGuruOpen, setIsArsipGuruOpen] = useState<boolean>(true);

  useEffect(() => {
    if (isArsipGuruChildActive) {
      setIsArsipGuruOpen(true);
    }
  }, [isArsipGuruChildActive]);

  const arsipGuruSubItems = [
    {
      id: 'list' as const,
      label: 'Adm Guru',
      sublabel: 'Perangkat Ajar & Silabus',
      icon: BookOpenCheck,
      badge: semesterDocsCount
    },
    {
      id: 'surat_izin' as const,
      label: 'Surat Izin',
      sublabel: 'Hanya untuk Guru',
      icon: MailCheck,
      badge: suratIzinCount
    },
    {
      id: 'lainnya' as const,
      label: 'Lainnya',
      sublabel: 'SK, Diklat & Non-Walas',
      icon: FolderArchive,
      badge: lainnyaCount
    }
  ];

  const arsipGuruTotalBadge = semesterDocsCount + suratIzinCount + lainnyaCount;

  const afterArsipMenuItems = [
    ...(showWalasMenu ? [
      {
        id: 'wali_kelas' as const,
        label: 'Arsip Wali Kelas',
        sublabel: isGuru ? `Kelas Binaan ${homeroomClass || ''}` : 'Monitoring & Validasi Kelas',
        icon: UserCheck,
        badge: walasDocsCount
      }
    ] : []),
    ...(isGuru ? [] : [
      {
        id: 'supervision' as const,
        label: 'Supervisi & Telaah',
        sublabel: 'Verifikasi & Pengesahan SK',
        icon: ShieldCheck,
        badge: pendingCount > 0 ? `${pendingCount} Baru` : null,
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/30'
      },
      {
        id: 'reports' as const,
        label: 'Rekapitulasi & Laporan',
        sublabel: 'Ekspor CSV & Cadangan Data',
        icon: FileSpreadsheet,
        badge: null
      },
      {
        id: 'teachers' as const,
        label: 'Data Guru & Waka',
        sublabel: 'Kelola Nama Guru & Pejabat',
        icon: Users,
        badge: teachers.length
      },
      {
        id: 'categories' as const,
        label: 'Kelola Kategori',
        sublabel: 'Perangkat Pembelajaran',
        icon: FolderKanban,
        badge: null
      },
      {
        id: 'profile' as const,
        label: 'Profil Sekolah & Logo',
        sublabel: 'Identitas Kop & Pejabat',
        icon: Building2,
        badge: null
      }
    ])
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-slate-100 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand & School Header */}
        <div className="px-4 py-4 border-b border-slate-800/90 bg-slate-950/35 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3.5 min-w-0">
            {profile.schoolLogoUrl ? (
              <SchoolLogoImg
                src={profile.schoolLogoUrl}
                alt="Logo Sekolah"
                className="w-16 h-16 object-contain shrink-0 drop-shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 text-indigo-300 flex items-center justify-center shrink-0">
                <Archive className="w-9 h-9" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-base font-bold text-white tracking-wide leading-none truncate">
                ArsipKurikulum
              </div>
              <div className="text-[11px] text-slate-300 font-medium mt-1.5 line-clamp-2 leading-snug">
                {profile.name}
              </div>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile Snapshot (Waka Kurikulum vs Guru Pengampu) */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-800/35">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${
              isGuru
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                : 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40'
            }`}>
              {isGuru
                ? ((currentTeacher?.name || currentUser.displayName)?.charAt(0) || 'G')
                : ((currentUser.displayName || profile.curriculumViceName)?.charAt(0) || 'W')}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white tracking-wide truncate">
                {isGuru ? (currentTeacher?.name || currentUser.displayName) : (currentUser.displayName || profile.curriculumViceName)}
              </div>
              <div className={`text-[11px] font-semibold truncate ${
                isGuru ? 'text-emerald-400' : 'text-indigo-300'
              }`}>
                {isGuru
                  ? `Guru ${currentTeacher?.subject || 'Mapel'}${isHomeroomGuru && homeroomClass ? ` · Walas ${homeroomClass}` : ''}`
                  : 'Waka Kurikulum & Supervisi'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                NIP. {isGuru ? (currentTeacher?.nip || '-') : profile.curriculumViceNip}
              </div>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="p-4">
          <button
            onClick={() => {
              onOpenUpload();
              if (isOpenMobile) onCloseMobile();
            }}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-indigo-400 cursor-pointer ${
              isGuru || activeView === 'wali_kelas'
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>
              {activeView === 'wali_kelas'
                ? 'Unggah Arsip Wali Kelas'
                : activeView === 'surat_izin'
                ? isGuru ? 'Ajukan Surat Izin Guru' : 'Catat Surat Izin Guru'
                : activeView === 'lainnya'
                ? 'Unggah Arsip Lainnya'
                : 'Unggah Dokumen Baru'}
            </span>
          </button>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-1 flex-1 overflow-y-auto space-y-1">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Menu Administrasi
          </div>

          {/* 1. Matriks Guru */}
          {(() => {
            const isActive = activeView === 'matrix';
            return (
              <button
                onClick={() => {
                  onViewChange('matrix');
                  if (isOpenMobile) onCloseMobile();
                }}
                className={`group w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? isGuru
                      ? 'bg-emerald-600/20 text-white font-semibold border border-emerald-500/35 shadow-xs'
                      : 'bg-indigo-600/25 text-white font-semibold border border-indigo-400/35 shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? isGuru
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold leading-snug tracking-wide truncate">
                      {isGuru ? 'Matriks Berkas Saya' : 'Matriks Guru'}
                    </div>
                    <div className={`text-[10px] leading-none truncate mt-0.5 ${
                      isActive
                        ? isGuru ? 'text-emerald-200/90' : 'text-indigo-200/90'
                        : 'text-slate-400'
                    }`}>
                      {isGuru ? 'Monitoring Kelengkapan Diri' : 'Monitoring Berkas Pokok'}
                    </div>
                  </div>
                </div>
              </button>
            );
          })()}

          {/* 2. Arsip Guru (Expandable Dropdown Sub Menu) */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setIsArsipGuruOpen(prev => !prev)}
              aria-expanded={isArsipGuruOpen}
              className={`group w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                isArsipGuruChildActive
                  ? isGuru
                    ? 'bg-emerald-600/15 text-white font-semibold border border-emerald-500/30'
                    : 'bg-indigo-600/20 text-white font-semibold border border-indigo-400/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isArsipGuruChildActive
                      ? isGuru
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                  }`}
                >
                  <ListFilter className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold leading-snug tracking-wide truncate">
                    Arsip Guru
                  </div>
                  <div className={`text-[10px] leading-none truncate mt-0.5 ${
                    isArsipGuruChildActive
                      ? isGuru ? 'text-emerald-200/90' : 'text-indigo-200/90'
                      : 'text-slate-400'
                  }`}>
                    Adm, Surat Izin &amp; Lainnya
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border tabular-nums bg-slate-800 text-slate-300 border-slate-700">
                  {arsipGuruTotalBadge}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    isArsipGuruOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {isArsipGuruOpen && (
              <div className="ml-4 pl-2.5 border-l border-slate-700/80 space-y-1 py-0.5">
                {arsipGuruSubItems.map((sub) => {
                  const isSubActive = activeView === sub.id;
                  const SubIcon = sub.icon;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        onViewChange(sub.id);
                        if (isOpenMobile) onCloseMobile();
                      }}
                      className={`group w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer ${
                        isSubActive
                          ? isGuru
                            ? 'bg-emerald-600/25 text-white font-semibold border border-emerald-500/40'
                            : 'bg-indigo-600/30 text-white font-semibold border border-indigo-400/40'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SubIcon
                          className={`w-4 h-4 shrink-0 ${
                            isSubActive
                              ? isGuru ? 'text-emerald-300' : 'text-indigo-300'
                              : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold leading-tight truncate">
                            {sub.label}
                          </div>
                          <div className="text-[10px] text-slate-400 leading-tight truncate mt-0.5">
                            {sub.sublabel}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border tabular-nums shrink-0 ${
                          isSubActive
                            ? isGuru
                              ? 'bg-emerald-500/30 text-emerald-100 border-emerald-400/40'
                              : 'bg-indigo-500/30 text-indigo-100 border-indigo-400/40'
                            : 'bg-slate-800/90 text-slate-300 border-slate-700'
                        }`}
                      >
                        {sub.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Remaining Menu Items */}
          {afterArsipMenuItems.map((item) => {
            const isActive = activeView === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id);
                  if (isOpenMobile) onCloseMobile();
                }}
                className={`group w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? isGuru
                      ? 'bg-emerald-600/20 text-white font-semibold border border-emerald-500/35 shadow-xs'
                      : 'bg-indigo-600/25 text-white font-semibold border border-indigo-400/35 shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? isGuru
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold leading-snug tracking-wide truncate">
                      {item.label}
                    </div>
                    <div className={`text-[10px] leading-none truncate mt-0.5 ${
                      isActive
                        ? isGuru ? 'text-emerald-200/90' : 'text-indigo-200/90'
                        : 'text-slate-400'
                    }`}>
                      {item.sublabel}
                    </div>
                  </div>
                </div>

                {item.badge !== null && (
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border tabular-nums shrink-0 ${
                      ('badgeColor' in item && item.badgeColor) || (isActive
                        ? isGuru
                          ? 'bg-emerald-500/30 text-emerald-100 border-emerald-400/40'
                          : 'bg-indigo-500/30 text-indigo-100 border-indigo-400/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700')
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Academic Scope Box inside Sidebar */}
          <div className="mt-4 pt-3 border-t border-slate-800/90 px-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Lingkup Akademik
            </div>

            {/* Academic Year select */}
            <div className="mb-2.5">
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Tahun Pelajaran:
              </label>
              <select
                value={academicYear}
                onChange={(e) => onAcademicYearChange(e.target.value)}
                className="w-full text-xs font-semibold bg-slate-800/90 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-indigo-400"
              >
                <option value="2026/2027" className="bg-slate-900 text-slate-100">2026/2027 (Tahun Aktif)</option>
                <option value="2025/2026" className="bg-slate-900 text-slate-100">2025/2026 (Arsip)</option>
                <option value="2024/2025" className="bg-slate-900 text-slate-100">2024/2025 (Arsip)</option>
                <option value="2023/2024" className="bg-slate-900 text-slate-100">2023/2024 (Arsip)</option>
              </select>
            </div>

            {/* Semester switch */}
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Semester Berjalan:
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-800/90 border border-slate-700/70 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => onSemesterChange('ganjil')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all text-center cursor-pointer ${
                    currentSemester === 'ganjil'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Ganjil
                </button>
                <button
                  type="button"
                  onClick={() => onSemesterChange('genap')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all text-center cursor-pointer ${
                    currentSemester === 'genap'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Genap
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Bottom Footer */}
        <div className="p-4 border-t border-slate-800/90 bg-slate-950/60 text-xs text-slate-400">
          <div className="flex items-center justify-between text-[11px] text-slate-300 mb-2 font-medium">
            <span>Total Arsip Terdata:</span>
            <span className="font-mono font-bold text-white tabular-nums">{totalDocumentsCount} Dokumen</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="font-mono tabular-nums">NPSN: {profile.npsn}</span>
            <span className="text-emerald-400 font-medium">Cloud Real-Time</span>
          </div>
        </div>
      </aside>
    </>
  );
};
