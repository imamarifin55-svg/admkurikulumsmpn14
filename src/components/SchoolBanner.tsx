import React from 'react';
import { SchoolProfile, CurriculumDocument, SemesterType } from '../types/curriculum';
import { FileCheck, ShieldCheck, Sparkles, Building2 } from 'lucide-react';

interface SchoolBannerProps {
  profile: SchoolProfile;
  documents: CurriculumDocument[];
  currentSemester: SemesterType;
  onOpenUpload: () => void;
  onViewMatrix: () => void;
}

export const SchoolBanner: React.FC<SchoolBannerProps> = ({
  profile,
  documents,
  currentSemester,
  onOpenUpload,
  onViewMatrix
}) => {
  // Compute semester-specific stats
  const semesterDocs = documents.filter(d => d.semester === currentSemester);
  const totalInSemester = semesterDocs.length;
  const verifiedCount = semesterDocs.filter(d => d.status === 'disahkan' || d.status === 'diverifikasi').length;
  const atpCount = semesterDocs.filter(d => d.category === 'silabus_atp').length;
  const needsRevisionCount = semesterDocs.filter(d => d.status === 'perlu_revisi').length;

  // Completion calculation (benchmark: 8 mapel x 3 dokumen = 24 dokumen ideal per semester)
  const targetPerSemester = 24;
  const completionPercentage = Math.min(100, Math.round((totalInSemester / targetPerSemester) * 100));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm mb-6">
      {/* Background with measured contrast scrim */}
      <div className="absolute inset-0 z-0">
        <img
          src="/src/assets/images/school_header_banner_1793849402937.jpg"
          alt="Gedung SMP Negeri 1 Mentari Bangsa"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-25 filter saturate-75"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/75 to-slate-900/40" />
      </div>

      <div className="relative z-10 p-6 sm:p-8 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left: School Identity */}
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs text-indigo-300 font-medium mb-2">
              <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {profile.level}</span>
              <span aria-hidden="true">·</span>
              <span>NPSN: {profile.npsn}</span>
              <span aria-hidden="true">·</span>
              <span>{profile.accreditation}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2 text-balance">
              {profile.name}
            </h1>
            
            <p className="text-sm text-slate-300 leading-relaxed max-w-xl mb-4">
              Pusat Repositori Digital & Supervisi Administrasi Kurikulum Merdeka. Pengunggahan otomatis silabus, alur tujuan pembelajaran (ATP), dan perangkat ajar berbasis semester.
            </p>

            {/* School Officers info with avatar */}
            <div className="flex items-center gap-3 pt-2 border-t border-white/10">
              <img
                src="/src/assets/images/curriculum_director_avatar_1793849401508.jpg"
                alt="Waka Kurikulum"
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full border border-white/30 object-cover shrink-0"
              />
              <div className="text-xs">
                <div className="font-semibold text-white">{profile.curriculumViceName}</div>
                <div className="text-slate-300">
                  Waka Kurikulum & Supervisi <span aria-hidden="true">·</span> NIP. {profile.curriculumViceNip}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Semester Quick Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
              <div className="text-xs text-slate-300 font-medium mb-1">
                Dokumen Semester {currentSemester === 'ganjil' ? 'Ganjil' : 'Genap'}
              </div>
              <div className="text-2xl font-bold text-white font-mono tabular-nums">
                {totalInSemester}
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                {atpCount} Silabus/ATP terarsip
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
              <div className="text-xs text-slate-300 font-medium mb-1">
                Telah Diverifikasi
              </div>
              <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
                {verifiedCount}
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                {needsRevisionCount > 0 ? `${needsRevisionCount} perlu revisi` : '100% kelayakan valid'}
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10 flex flex-col justify-between">
              <div>
                <div className="text-xs text-slate-300 font-medium mb-1">
                  Kelengkapan Semester
                </div>
                <div className="text-2xl font-bold text-indigo-300 font-mono tabular-nums">
                  {completionPercentage}%
                </div>
              </div>
              <div className="w-full bg-white/20 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-indigo-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${completionPercentage}%` }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick action bar */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-300">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Pengesahan Resmi SK Kepala Sekolah
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <FileCheck className="w-4 h-4 text-indigo-300" /> Sesuai Standar BSNP &amp; PMM
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onViewMatrix}
              className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white font-medium transition-colors"
            >
              Lihat Matriks Guru
            </button>
            <button
              onClick={onOpenUpload}
              className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors flex items-center gap-1 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" /> Unggah Otomatis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
