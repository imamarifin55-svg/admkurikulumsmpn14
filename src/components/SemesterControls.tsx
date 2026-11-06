import React from 'react';
import { SemesterType } from '../types/curriculum';
import { Calendar, LayoutGrid, ListFilter, ClipboardCheck, FileText } from 'lucide-react';

interface SemesterControlsProps {
  currentSemester: SemesterType;
  onSemesterChange: (semester: SemesterType) => void;
  academicYear: string;
  onAcademicYearChange: (year: string) => void;
  activeView: 'list' | 'matrix' | 'supervision' | 'reports' | 'profile' | 'categories';
  onViewChange: (view: 'list' | 'matrix' | 'supervision' | 'reports' | 'profile' | 'categories') => void;
  ganjilCount: number;
  genapCount: number;
}

export const SemesterControls: React.FC<SemesterControlsProps> = ({
  currentSemester,
  onSemesterChange,
  academicYear,
  onAcademicYearChange,
  activeView,
  onViewChange,
  ganjilCount,
  genapCount
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      {/* Left: Academic Year & Semester Segmented Control */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Academic Year select */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-500 font-medium">Tahun Ajaran:</span>
          <select
            value={academicYear}
            onChange={(e) => onAcademicYearChange(e.target.value)}
            className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="2025/2026">2025/2026 (Aktif)</option>
            <option value="2024/2025">2024/2025 (Arsip)</option>
            <option value="2023/2024">2023/2024 (Arsip)</option>
          </select>
        </div>

        {/* Semester Segmented Controls */}
        <div className="inline-flex p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => onSemesterChange('ganjil')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              currentSemester === 'ganjil'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Semester Ganjil</span>
            <span className="text-[11px] font-mono tabular-nums px-1.5 py-0.2 bg-slate-100 rounded text-slate-600">
              {ganjilCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSemesterChange('genap')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              currentSemester === 'genap'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Semester Genap</span>
            <span className="text-[11px] font-mono tabular-nums px-1.5 py-0.2 bg-slate-100 rounded text-slate-600">
              {genapCount}
            </span>
          </button>
        </div>
      </div>

      {/* Right: Functional Navigation Modes */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
        <button
          type="button"
          onClick={() => onViewChange('list')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeView === 'list'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>Daftar Dokumen</span>
        </button>

        <button
          type="button"
          onClick={() => onViewChange('matrix')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeView === 'matrix'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Matriks Kelengkapan Guru</span>
        </button>

        <button
          type="button"
          onClick={() => onViewChange('supervision')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeView === 'supervision'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClipboardCheck className="w-3.5 h-3.5" />
          <span>Supervisi &amp; Pengesahan</span>
        </button>

        <button
          type="button"
          onClick={() => onViewChange('reports')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeView === 'reports'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Rekapitulasi</span>
        </button>
      </div>
    </div>
  );
};
