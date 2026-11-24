import React, { useState, useEffect } from 'react';
import { 
  Archive, ListFilter, LayoutGrid, ShieldCheck, FileSpreadsheet, 
  Plus, Building2, X, FolderKanban, Users, UserCheck, ChevronDown,
  BookOpenCheck, MailCheck, FolderArchive, BookUser, GraduationCap
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
  | 'wali_kelas'
  | 'walas_students'
  | 'buku_induk'
  | 'walas_categories';

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
  walasStudentsCount?: number;
  walasCategoriesCount?: number;
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
  walasDocsCount = 0,
  walasStudentsCount = 0,
  walasCategoriesCount = 0
}) => {
  const currentTeacher = teachers.find(t => t.id === currentUser.teacherId);
  const isGuru = currentUser.role === 'guru';
  const showWalasMenu = !isGuru || isHomeroomGuru;
  const isArsipGuruChildActive =
    activeView === 'list' || activeView === 'surat_izin' || activeView === 'lainnya';
  const isArsipWalasChildActive =
    activeView === 'wali_kelas' ||
    activeView === 'walas_students' ||
    activeView === 'buku_induk' ||
    activeView === 'walas_categories';

  const [isArsipGuruOpen, setIsArsipGuruOpen] = useState<boolean>(true);
  const [isArsipWalasOpen, setIsArsipWalasOpen] = useState<boolean>(true);

  useEffect(() => {
    if (isArsipGuruChildActive) {
      setIsArsipGuruOpen(true);
    }
  }, [isArsipGuruChildActive]);

  useEffect(() => {
    if (isArsipWalasChildActive) {
      setIsArsipWalasOpen(true);
    }
  }, [isArsipWalasChildActive]);

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

  const arsipWalasSubItems = [
    {
      id: 'wali_kelas' as const,
      label: 'Adm Wali Kelas',
      sublabel: isGuru ? `Matriks & Arsip ${homeroomClass || ''}` : 'Matriks & Validasi Kelas',
      icon: UserCheck,
      badge: walasDocsCount
    },
    {
      id: 'walas_students' as const,
      label: 'Peserta Didik',
      sublabel: isGuru ? `Siswa Kelas ${homeroomClass || ''}` : 'Daftar & Impor Siswa',
      icon: GraduationCap,
      badge: walasStudentsCount
    },
    {
      id: 'buku_induk' as const,
      label: 'Buku Induk',
      sublabel: 'Register Induk & Cetak A4',
      icon: BookUser,
      badge: walasStudentsCount
    },
    ...(!isGuru ? [
      {
        id: 'walas_categories' as const,
        label: 'Kategori Walas',
        sublabel: 'Atur Dokumen Wali Kelas',
        icon: FolderKanban,
        badge: walasCategoriesCount
      }
    ] : [])
  ];

  const arsipGuruTotalBadge = semesterDocsCount + suratIzinCount + lainnyaCount;

  const afterArsipMenuItems = isGuru
    ? []
    : [
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
      ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-[#04152c]/65 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-gradient-to-b from-[#061e3d] via-[#0a3d6b] to-[#0e688f] text-sky-50 border-r border-sky-300/20 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand & School Header */}
        <div className="px-4 py-4 border-b border-sky-200/15 bg-[#04152c]/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3.5 min-w-0">
            {profile.schoolLogoUrl ? (
              <SchoolLogoImg
                src={profile.schoolLogoUrl}
                alt="Logo Sekolah"
                className="w-16 h-16 object-contain shrink-0 drop-shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 text-sky-200 flex items-center justify-center shrink-0">
                <Archive className="w-9 h-9" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-base font-bold text-white tracking-wide leading-none truncate">
                ArsipKurikulum
              </div>
              <div className="text-[11px] text-sky-100/85 font-medium mt-1.5 line-clamp-2 leading-snug">
                {profile.name}
              </div>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-sky-200 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile Snapshot (Waka Kurikulum vs Guru Pengampu) */}
        <div className="p-4 border-b border-sky-200/15 bg-white/5">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${
              isGuru
                ? 'bg-teal-400/20 text-teal-100 border-teal-300/40'
                : 'bg-sky-400/20 text-sky-100 border-sky-300/40'
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
                isGuru ? 'text-teal-200' : 'text-sky-200'
              }`}>
                {isGuru
                  ? `Guru ${currentTeacher?.subject || 'Mapel'}${isHomeroomGuru && homeroomClass ? ` · Walas ${homeroomClass}` : ''}`
                  : 'Waka Kurikulum & Supervisi'}
              </div>
              <div className="text-[10px] text-sky-200/70 font-mono truncate">
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
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-all active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-sky-300 cursor-pointer ${
              isGuru || isArsipWalasChildActive
                ? 'bg-gradient-to-r from-teal-300 to-cyan-300 hover:from-teal-200 hover:to-cyan-200'
                : 'bg-gradient-to-r from-sky-300 to-cyan-300 hover:from-sky-200 hover:to-cyan-200'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>
              {activeView === 'wali_kelas' || activeView === 'walas_categories'
                ? 'Unggah Arsip Wali Kelas'
                : activeView === 'walas_students'
                ? 'Tambah Peserta Didik'
                : activeView === 'buku_induk'
                ? 'Tambah Data Induk'
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
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-200/75">
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
                      ? 'bg-gradient-to-r from-teal-400/25 to-cyan-400/15 text-white font-semibold border border-teal-200/35 shadow-xs'
                      : 'bg-gradient-to-r from-sky-400/25 to-cyan-400/15 text-white font-semibold border border-sky-200/35 shadow-xs'
                    : 'text-sky-100/85 hover:bg-white/10 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? isGuru
                          ? 'bg-gradient-to-br from-teal-300 to-cyan-300 text-slate-950 shadow-xs'
                          : 'bg-gradient-to-br from-sky-300 to-cyan-300 text-slate-950 shadow-xs'
                        : 'bg-white/10 text-sky-200 group-hover:bg-white/15 group-hover:text-white'
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
                        ? isGuru ? 'text-teal-100' : 'text-sky-100'
                        : 'text-sky-200/70'
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
                    ? 'bg-gradient-to-r from-teal-400/20 to-cyan-400/10 text-white font-semibold border border-teal-200/30'
                    : 'bg-gradient-to-r from-sky-400/20 to-cyan-400/10 text-white font-semibold border border-sky-200/30'
                  : 'text-sky-100/85 hover:bg-white/10 hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isArsipGuruChildActive
                      ? isGuru
                        ? 'bg-gradient-to-br from-teal-300 to-cyan-300 text-slate-950 shadow-xs'
                        : 'bg-gradient-to-br from-sky-300 to-cyan-300 text-slate-950 shadow-xs'
                      : 'bg-white/10 text-sky-200 group-hover:bg-white/15 group-hover:text-white'
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
                      ? isGuru ? 'text-teal-100' : 'text-sky-100'
                      : 'text-sky-200/70'
                  }`}>
                    Adm, Surat Izin &amp; Lainnya
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border tabular-nums bg-[#052344]/75 text-sky-100 border-sky-300/25">
                  {arsipGuruTotalBadge}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-sky-200 transition-transform duration-200 ${
                    isArsipGuruOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {isArsipGuruOpen && (
              <div className="ml-4 pl-2.5 border-l border-sky-300/25 space-y-1 py-0.5">
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
                            ? 'bg-teal-400/25 text-white font-semibold border border-teal-200/40'
                            : 'bg-sky-400/25 text-white font-semibold border border-sky-200/40'
                          : 'text-sky-100/85 hover:bg-white/10 hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SubIcon
                          className={`w-4 h-4 shrink-0 ${
                            isSubActive
                              ? isGuru ? 'text-teal-200' : 'text-sky-200'
                              : 'text-sky-200/75 group-hover:text-white'
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold leading-tight truncate">
                            {sub.label}
                          </div>
                          <div className="text-[10px] text-sky-200/75 leading-tight truncate mt-0.5">
                            {sub.sublabel}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border tabular-nums shrink-0 ${
                          isSubActive
                            ? isGuru
                              ? 'bg-teal-300/25 text-white border-teal-200/45'
                              : 'bg-sky-300/25 text-white border-sky-200/45'
                            : 'bg-[#052344]/75 text-sky-100 border-sky-300/20'
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

          {/* 3. Arsip Wali Kelas (Expandable Dropdown Sub Menu) */}
          {showWalasMenu && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setIsArsipWalasOpen(prev => !prev)}
                aria-expanded={isArsipWalasOpen}
                className={`group w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isArsipWalasChildActive
                    ? isGuru
                      ? 'bg-gradient-to-r from-teal-400/20 to-cyan-400/10 text-white font-semibold border border-teal-200/30'
                      : 'bg-gradient-to-r from-sky-400/20 to-cyan-400/10 text-white font-semibold border border-sky-200/30'
                    : 'text-sky-100/85 hover:bg-white/10 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isArsipWalasChildActive
                        ? isGuru
                          ? 'bg-gradient-to-br from-teal-300 to-cyan-300 text-slate-950 shadow-xs'
                          : 'bg-gradient-to-br from-sky-300 to-cyan-300 text-slate-950 shadow-xs'
                        : 'bg-white/10 text-sky-200 group-hover:bg-white/15 group-hover:text-white'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold leading-snug tracking-wide truncate">
                      Arsip Wali Kelas
                    </div>
                    <div className={`text-[10px] leading-none truncate mt-0.5 ${
                      isArsipWalasChildActive
                        ? isGuru ? 'text-teal-100' : 'text-sky-100'
                        : 'text-sky-200/70'
                    }`}>
                      {isGuru ? `Kelas Binaan ${homeroomClass || ''}` : 'Walas, Siswa & Buku Induk'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border tabular-nums bg-[#052344]/75 text-sky-100 border-sky-300/25">
                    {walasDocsCount}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-sky-200 transition-transform duration-200 ${
                      isArsipWalasOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {isArsipWalasOpen && (
                <div className="ml-4 pl-2.5 border-l border-sky-300/25 space-y-1 py-0.5">
                  {arsipWalasSubItems.map((sub) => {
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
                              ? 'bg-teal-400/25 text-white font-semibold border border-teal-200/40'
                              : 'bg-sky-400/25 text-white font-semibold border border-sky-200/40'
                            : 'text-sky-100/85 hover:bg-white/10 hover:text-white border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <SubIcon
                            className={`w-4 h-4 shrink-0 ${
                              isSubActive
                                ? isGuru ? 'text-teal-200' : 'text-sky-200'
                                : 'text-sky-200/75 group-hover:text-white'
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold leading-tight truncate">
                              {sub.label}
                            </div>
                            <div className="text-[10px] text-sky-200/75 leading-tight truncate mt-0.5">
                              {sub.sublabel}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border tabular-nums shrink-0 ${
                            isSubActive
                              ? isGuru
                                ? 'bg-teal-300/25 text-white border-teal-200/45'
                                : 'bg-sky-300/25 text-white border-sky-200/45'
                              : 'bg-[#052344]/75 text-sky-100 border-sky-300/20'
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
          )}

          {/* 4. Remaining Menu Items (Waka Only) */}
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
                      ? 'bg-gradient-to-r from-teal-400/25 to-cyan-400/15 text-white font-semibold border border-teal-200/35 shadow-xs'
                      : 'bg-gradient-to-r from-sky-400/25 to-cyan-400/15 text-white font-semibold border border-sky-200/35 shadow-xs'
                    : 'text-sky-100/85 hover:bg-white/10 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? isGuru
                          ? 'bg-gradient-to-br from-teal-300 to-cyan-300 text-slate-950 shadow-xs'
                          : 'bg-gradient-to-br from-sky-300 to-cyan-300 text-slate-950 shadow-xs'
                        : 'bg-white/10 text-sky-200 group-hover:bg-white/15 group-hover:text-white'
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
                        ? isGuru ? 'text-teal-100' : 'text-sky-100'
                        : 'text-sky-200/70'
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
                          ? 'bg-teal-300/25 text-white border-teal-200/45'
                          : 'bg-sky-300/25 text-white border-sky-200/45'
                        : 'bg-[#052344]/75 text-sky-100 border-sky-300/25')
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Academic Scope Box inside Sidebar */}
          <div className="mt-4 pt-3 border-t border-sky-200/15 px-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-sky-200/75 mb-2">
              Lingkup Akademik
            </div>

            {/* Academic Year select */}
            <div className="mb-2.5">
              <label className="block text-[11px] font-medium text-sky-100/90 mb-1">
                Tahun Pelajaran:
              </label>
              <select
                value={academicYear}
                onChange={(e) => onAcademicYearChange(e.target.value)}
                className="w-full text-xs font-semibold bg-[#052344]/75 border border-sky-300/25 rounded-lg p-2 text-white focus:outline-none focus:border-sky-300"
              >
                <option value="2026/2027" className="bg-[#062142] text-white">2026/2027 (Tahun Aktif)</option>
                <option value="2025/2026" className="bg-[#062142] text-white">2025/2026 (Arsip)</option>
                <option value="2024/2025" className="bg-[#062142] text-white">2024/2025 (Arsip)</option>
                <option value="2023/2024" className="bg-[#062142] text-white">2023/2024 (Arsip)</option>
              </select>
            </div>

            {/* Semester switch */}
            <div>
              <label className="block text-[11px] font-medium text-sky-100/90 mb-1">
                Semester Berjalan:
              </label>
              <div className="grid grid-cols-2 gap-1 bg-[#052344]/75 border border-sky-300/25 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => onSemesterChange('ganjil')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all text-center cursor-pointer ${
                    currentSemester === 'ganjil'
                      ? 'bg-gradient-to-r from-sky-300 to-cyan-300 text-slate-950 font-bold shadow-xs'
                      : 'text-sky-100/80 hover:text-white'
                  }`}
                >
                  Ganjil
                </button>
                <button
                  type="button"
                  onClick={() => onSemesterChange('genap')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all text-center cursor-pointer ${
                    currentSemester === 'genap'
                      ? 'bg-gradient-to-r from-sky-300 to-cyan-300 text-slate-950 font-bold shadow-xs'
                      : 'text-sky-100/80 hover:text-white'
                  }`}
                >
                  Genap
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Bottom Footer */}
        <div className="p-4 border-t border-sky-200/15 bg-[#04152c]/60 text-xs text-sky-200/80">
          <div className="flex items-center justify-between text-[11px] text-sky-100 mb-2 font-medium">
            <span>Total Arsip Terdata:</span>
            <span className="font-mono font-bold text-white tabular-nums">{totalDocumentsCount} Dokumen</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-sky-200/75">
            <span className="font-mono tabular-nums">NPSN: {profile.npsn}</span>
            <span className="text-cyan-300 font-medium">Cloud Real-Time</span>
          </div>
        </div>
      </aside>
    </>
  );
};
