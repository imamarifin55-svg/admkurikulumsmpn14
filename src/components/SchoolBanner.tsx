import React from 'react';
import { SchoolProfile, CurriculumDocument, SemesterType, Teacher, CategoryItem } from '../types/curriculum';
import { FileCheck, ShieldCheck, Sparkles, Building2 } from 'lucide-react';

interface SchoolBannerProps {
  profile: SchoolProfile;
  documents: CurriculumDocument[];
  currentSemester: SemesterType;
  academicYear: string;
  teachers: Teacher[];
  categories: CategoryItem[];
  onOpenUpload: () => void;
  onViewMatrix: () => void;
}

export const SchoolBanner: React.FC<SchoolBannerProps> = ({
  profile,
  documents,
  currentSemester,
  academicYear,
  teachers,
  categories,
  onOpenUpload,
  onViewMatrix
}) => {
  // Compute semester + academicYear specific stats
  const semesterDocs = documents.filter(
    d => d.semester === currentSemester && d.academicYear === academicYear
  );
  const totalInSemester = semesterDocs.length;
  const verifiedCount = semesterDocs.filter(d => d.status === 'disahkan' || d.status === 'diverifikasi').length;
  const atpCount = semesterDocs.filter(d => d.category === 'silabus_atp').length;
  const needsRevisionCount = semesterDocs.filter(d => d.status === 'perlu_revisi').length;

  // Dynamic target based on registered teachers x supervised matrix categories
  const supervisedCatCount = Math.max(1, categories.filter(c => c.isSupervisedInMatrix).length);
  const teacherCount = Math.max(1, teachers.length);
  const targetPerSemester = teacherCount * supervisedCatCount;
  const completionPercentage = Math.min(100, Math.round((totalInSemester / targetPerSemester) * 100));

  return (
    <div className="rounded-2xl border border-teal-300/70 bg-[linear-gradient(135deg,#2dd4bf_0%,#99f6e4_34%,#e6fffa_68%,#ffffff_100%)] shadow-sm mb-6 p-6 sm:p-8 text-slate-950">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left: School Identity */}
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-teal-950/85 font-semibold mb-2">
            <span className="flex items-center gap-1.5 text-teal-950 font-bold">
              <Building2 className="w-3.5 h-3.5 text-teal-900" /> {profile.level}
            </span>
            <span aria-hidden="true">·</span>
            <span>NPSN: {profile.npsn}</span>
            <span aria-hidden="true">·</span>
            <span>{profile.accreditation}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 mb-2 text-balance">
            {profile.name}
          </h1>
          
          <p className="text-sm text-slate-800 leading-relaxed max-w-xl mb-4">
            Pusat Repositori Digital &amp; Supervisi Administrasi Kurikulum Merdeka. Pengunggahan otomatis silabus, alur tujuan pembelajaran (ATP), dan perangkat ajar berbasis semester.
          </p>

          {/* School Officers info */}
          <div className="flex items-center pt-3 border-t border-teal-900/15">
            <div className="text-xs">
              <div className="font-semibold text-slate-950">{profile.curriculumViceName}</div>
              <div className="text-teal-950/80 font-medium">
                Waka Kurikulum &amp; Supervisi <span aria-hidden="true">·</span> NIP. {profile.curriculumViceNip}
              </div>
            </div>
          </div>
        </div>

        {/* Right: 3 Gradient Metric Cards (Hijau, Oranye, Ungu) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
          {/* Card 1: Hijau Gradasi */}
          <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 rounded-xl p-3.5 border border-emerald-400/40 text-white shadow-sm">
            <div className="text-xs text-emerald-50 font-medium mb-1">
              {currentSemester === 'ganjil' ? 'Ganjil' : 'Genap'} · TP {academicYear}
            </div>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">
              {totalInSemester}
            </div>
            <div className="text-[11px] text-emerald-100/90 mt-0.5">
              {atpCount} Silabus/ATP terarsip
            </div>
          </div>

          {/* Card 2: Oranye Gradasi */}
          <div className="bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600 rounded-xl p-3.5 border border-orange-300/45 text-white shadow-sm">
            <div className="text-xs text-orange-50 font-medium mb-1">
              Telah Diverifikasi
            </div>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">
              {verifiedCount}
            </div>
            <div className="text-[11px] text-orange-50/90 mt-0.5">
              {needsRevisionCount > 0 ? `${needsRevisionCount} perlu revisi` : '100% kelayakan valid'}
            </div>
          </div>

          {/* Card 3: Ungu Gradasi */}
          <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-700 rounded-xl p-3.5 border border-purple-300/40 text-white shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-xs text-purple-50 font-medium mb-1">
                Kelengkapan Semester
              </div>
              <div className="text-2xl font-bold text-white font-mono tabular-nums">
                {completionPercentage}%
              </div>
            </div>
            <div className="w-full bg-purple-950/35 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-200 to-white h-full rounded-full transition-all duration-500" 
                style={{ width: `${completionPercentage}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick action bar */}
      <div className="mt-6 pt-4 border-t border-teal-900/15 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 text-slate-800 font-medium">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-teal-800" /> Pengesahan Resmi SK Kepala Sekolah
          </span>
          <span aria-hidden="true" className="text-teal-900/30">·</span>
          <span className="flex items-center gap-1">
            <FileCheck className="w-4 h-4 text-sky-800" /> Sesuai Standar BSNP &amp; PMM
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onViewMatrix}
            className="px-3.5 py-1.5 rounded-lg bg-white/90 hover:bg-white border border-teal-700/20 text-teal-950 font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            Lihat Matriks Guru
          </button>
          <button
            onClick={onOpenUpload}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#0a4b78] to-[#0e7490] hover:from-[#083c61] hover:to-[#0c627a] text-white font-semibold transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" /> Unggah Otomatis
          </button>
        </div>
      </div>
    </div>
  );
};
