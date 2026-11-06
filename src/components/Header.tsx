import React from 'react';
import { Menu, Plus, ChevronRight } from 'lucide-react';
import { AppUser, AppUserRole, SemesterType, Teacher } from '../types/curriculum';
import { RoleSwitcher } from './RoleSwitcher';

interface HeaderProps {
  activeView: 'list' | 'matrix' | 'supervision' | 'reports' | 'profile' | 'categories';
  currentSemester: SemesterType;
  academicYear: string;
  onOpenUpload: () => void;
  onToggleMobileSidebar: () => void;
  pendingCount: number;
  currentUser: AppUser;
  onRoleChange: (role: AppUserRole, teacherId?: string) => void;
  teachers: Teacher[];
  isCloudSynced: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  currentSemester,
  academicYear,
  onOpenUpload,
  onToggleMobileSidebar,
  pendingCount,
  currentUser,
  onRoleChange,
  teachers,
  isCloudSynced
}) => {
  const getViewTitle = () => {
    switch (activeView) {
      case 'matrix':
        return currentUser.role === 'guru' ? 'Matriks Berkas Saya' : 'Matriks Kelengkapan Supervisi Guru';
      case 'list':
        return currentUser.role === 'guru' ? 'Daftar Berkas Perangkat Ajar Saya' : 'Daftar Dokumen & Silabus';
      case 'supervision':
        return 'Panel Supervisi & Validasi';
      case 'reports':
        return 'Rekapitulasi & Laporan Kurikulum';
      case 'categories':
        return 'Kelola Kategori Perangkat Pembelajaran';
      case 'profile':
        return 'Profil Satuan Pendidikan & Identitas Kop';
      default:
        return 'Administrasi Kurikulum';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 h-16">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Buka Menu Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb Trail */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
            <span className="font-medium text-slate-400 hidden sm:inline">Arsip</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline shrink-0" />
            <span className="font-semibold text-slate-900 truncate">
              {getViewTitle()}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span className="text-indigo-700 font-semibold shrink-0">
              Sem. {currentSemester === 'ganjil' ? 'Ganjil' : 'Genap'} ({academicYear})
            </span>
          </nav>
        </div>

        {/* Right: Role Switcher & Primary CTA */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Role Switcher (Waka vs Guru) */}
          <RoleSwitcher
            currentUser={currentUser}
            onRoleChange={onRoleChange}
            teachers={teachers}
            isCloudSynced={isCloudSynced}
          />

          {currentUser.role === 'waka_kurikulum' && pendingCount > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>{pendingCount} Telaah Menunggu</span>
            </div>
          )}

          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Unggah Dokumen</span>
            <span className="sm:hidden">Unggah</span>
          </button>
        </div>
      </div>
    </header>
  );
};
