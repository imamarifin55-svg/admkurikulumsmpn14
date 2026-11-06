import React from 'react';
import { 
  Archive, ListFilter, LayoutGrid, ShieldCheck, FileSpreadsheet, 
  Plus, Calendar, Sparkles, Building2, ChevronRight, X, RotateCcw, 
  FolderKanban, Award 
} from 'lucide-react';
import { AppUser, SchoolProfile, SemesterType, Teacher } from '../types/curriculum';

interface SidebarProps {
  activeView: 'list' | 'matrix' | 'supervision' | 'reports' | 'profile' | 'categories';
  onViewChange: (view: 'list' | 'matrix' | 'supervision' | 'reports' | 'profile' | 'categories') => void;
  onOpenUpload: () => void;
  profile: SchoolProfile;
  academicYear: string;
  onAcademicYearChange: (year: string) => void;
  currentSemester: SemesterType;
  onSemesterChange: (semester: SemesterType) => void;
  totalDocumentsCount: number;
  semesterDocsCount: number;
  pendingCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onResetData: () => void;
  currentUser: AppUser;
  teachers: Teacher[];
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
  pendingCount,
  isOpenMobile,
  onCloseMobile,
  onResetData,
  currentUser,
  teachers
}) => {
  const currentTeacher = teachers.find(t => t.id === currentUser.teacherId);
  const isGuru = currentUser.role === 'guru';

  const menuItems = [
    {
      id: 'matrix' as const,
      label: isGuru ? 'Matriks Berkas Saya' : 'Matriks Guru',
      sublabel: isGuru ? 'Monitoring Kelengkapan Diri' : 'Monitoring Berkas Pokok',
      icon: LayoutGrid,
      badge: null
    },
    {
      id: 'list' as const,
      label: isGuru ? 'Dokumen & Perangkat Saya' : 'Daftar Arsip Dokumen',
      sublabel: isGuru ? 'Silabus, ATP & Modul Ajar' : 'Seluruh Berkas Guru',
      icon: ListFilter,
      badge: semesterDocsCount
    },
    ...(isGuru ? [] : [
      {
        id: 'supervision' as const,
        label: 'Supervisi & Telaah',
        sublabel: 'Verifikasi & Pengesahan SK',
        icon: ShieldCheck,
        badge: pendingCount > 0 ? `${pendingCount} Baru` : null,
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200'
      },
      {
        id: 'reports' as const,
        label: 'Rekapitulasi & Laporan',
        sublabel: 'Ekspor CSV & Cadangan Data',
        icon: FileSpreadsheet,
        badge: null
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
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand & School Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-700 text-white flex items-center justify-center font-bold shadow-xs overflow-hidden shrink-0">
              {profile.schoolLogoUrl ? (
                <img src={profile.schoolLogoUrl} alt="Logo Sekolah" className="w-full h-full object-contain p-0.5 bg-white" />
              ) : (
                <Archive className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-slate-900 tracking-tight leading-none truncate">
                ArsipKurikulum
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-1 truncate">
                {profile.name}
              </div>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile Snapshot (Waka Kurikulum vs Guru Pengampu) */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border-2 ${
              isGuru
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-indigo-100 text-indigo-800 border-indigo-300'
            }`}>
              {isGuru ? (currentTeacher?.name?.charAt(0) || 'G') : (profile.curriculumViceName?.charAt(0) || 'W')}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">
                {isGuru ? currentTeacher?.name : profile.curriculumViceName}
              </div>
              <div className={`text-[11px] font-semibold truncate ${
                isGuru ? 'text-emerald-700' : 'text-indigo-700'
              }`}>
                {isGuru ? `Guru ${currentTeacher?.subject || 'Mata Pelajaran'}` : 'Waka Kurikulum & Supervisi'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                NIP. {isGuru ? currentTeacher?.nip : profile.curriculumViceNip}
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
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Unggah Dokumen Baru</span>
          </button>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-1 flex-1 overflow-y-auto space-y-1">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Menu Administrasi
          </div>

          {menuItems.map((item) => {
            const isActive = activeView === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id);
                  if (isOpenMobile) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-indigo-700 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold leading-snug truncate">
                      {item.label}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-none truncate">
                      {item.sublabel}
                    </div>
                  </div>
                </div>

                {item.badge !== null && (
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border tabular-nums shrink-0 ${
                      item.badgeColor || (isActive ? 'bg-indigo-200 text-indigo-900 border-indigo-300' : 'bg-slate-100 text-slate-600 border-slate-200')
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Academic Scope Box inside Sidebar */}
          <div className="mt-4 pt-3 border-t border-slate-200 px-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Lingkup Akademik
            </div>

            {/* Academic Year select */}
            <div className="mb-2.5">
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Tahun Pelajaran:
              </label>
              <select
                value={academicYear}
                onChange={(e) => onAcademicYearChange(e.target.value)}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="2025/2026">2025/2026 (Tahun Aktif)</option>
                <option value="2024/2025">2024/2025 (Arsip)</option>
                <option value="2023/2024">2023/2024 (Arsip)</option>
              </select>
            </div>

            {/* Semester switch */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Semester Berjalan:
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => onSemesterChange('ganjil')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all text-center ${
                    currentSemester === 'ganjil'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ganjil
                </button>
                <button
                  type="button"
                  onClick={() => onSemesterChange('genap')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all text-center ${
                    currentSemester === 'genap'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Genap
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Bottom Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
          <div className="flex items-center justify-between text-[11px] text-slate-600 mb-2 font-medium">
            <span>Total Arsip Terdata:</span>
            <span className="font-mono font-bold text-slate-900">{totalDocumentsCount} Dokumen</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>NPSN: {profile.npsn}</span>
            <button
              onClick={onResetData}
              className="hover:text-rose-600 transition-colors flex items-center gap-1"
              title="Reset data ke kondisi awal"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
