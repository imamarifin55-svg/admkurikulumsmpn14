import React from 'react';
import { CurriculumDocument, DocumentCategory, Teacher, SemesterType, CategoryItem } from '../types/curriculum';
import { CATEGORY_LABELS } from '../utils/documentClassifier';
import { 
  CheckCircle2, Clock, AlertTriangle, ShieldCheck, Plus, 
  Pencil, Eye, Trash2, FileText 
} from 'lucide-react';

interface CurriculumMatrixProps {
  teachers: Teacher[];
  documents: CurriculumDocument[];
  currentSemester: SemesterType;
  academicYear: string;
  categories: CategoryItem[];
  onSelectDocument: (doc: CurriculumDocument) => void;
  onOpenUploadForTeacher: (teacher: Teacher, category: DocumentCategory) => void;
  onBatchApproveSemester: () => void;
  onEditDocument: (doc: CurriculumDocument) => void;
  onDeleteDocument: (docId: string) => void;
  currentTeacherId?: string | null;
}

export const CurriculumMatrix: React.FC<CurriculumMatrixProps> = ({
  teachers,
  documents,
  currentSemester,
  academicYear,
  categories,
  onSelectDocument,
  onOpenUploadForTeacher,
  onBatchApproveSemester,
  onEditDocument,
  onDeleteDocument,
  currentTeacherId
}) => {
  // If in Guru role, filter matrix only to this teacher
  const displayedTeachers = currentTeacherId 
    ? teachers.filter(t => t.id === currentTeacherId)
    : teachers;

  // Filter active monitored categories for matrix
  const activeCategories = categories.filter(c => c.isSupervisedInMatrix);

  // Filter docs by semester and year
  const semesterDocs = documents.filter(
    d => (d.semester === currentSemester || d.category === 'prota') && d.academicYear === academicYear
  );

  const getDocForTeacherAndCategory = (teacherName: string, category: DocumentCategory) => {
    return semesterDocs.find(
      d => (d.teacherName === teacherName || teacherName.includes(d.teacherName.split(' ')[0])) &&
           d.category === category
    );
  };

  // Calculate pending reviews
  const pendingDocs = semesterDocs.filter(d => d.status === 'diajukan');

  const getStatusBadge = (doc: CurriculumDocument) => {
    switch (doc.status) {
      case 'disahkan':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded truncate max-w-full">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="truncate">Disahkan</span>
          </span>
        );
      case 'diverifikasi':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded truncate max-w-full">
            <ShieldCheck className="w-3 h-3 text-blue-600 shrink-0" />
            <span className="truncate">Terverifikasi</span>
          </span>
        );
      case 'diajukan':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded truncate max-w-full">
            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
            <span className="truncate">Menunggu</span>
          </span>
        );
      case 'perlu_revisi':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded truncate max-w-full">
            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
            <span className="truncate">Revisi</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded truncate max-w-full">
            <FileText className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="truncate">Draft</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Matrix Header */}
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Matriks Kelengkapan Administrasi Kurikulum Guru
            </h2>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-2 py-0.5">
              Semester {currentSemester === 'ganjil' ? 'Ganjil' : 'Genap'} · TP {academicYear}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monitoring kelengkapan berkas perangkat ajar dengan kontrol cepat: tanda <strong>+</strong> untuk unggah, <strong>pensil</strong> untuk edit, <strong>mata</strong> untuk pratinjau, dan <strong>tong sampah</strong> untuk hapus.
          </p>
        </div>

        {/* Batch action */}
        {pendingDocs.length > 0 && (
          <button
            onClick={onBatchApproveSemester}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors shrink-0"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Sahkan {pendingDocs.length} Dokumen Menunggu Review</span>
          </button>
        )}
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-semibold">
              <th className="py-3 px-4 min-w-[210px]">Guru Pengampu &amp; Mata Pelajaran</th>
              {activeCategories.map(cat => (
                <th key={cat.id} className="py-3 px-3 text-center min-w-[155px]">
                  <div className="font-bold text-slate-900">{cat.code}</div>
                  <div className="text-[10px] text-slate-500 font-normal truncate max-w-[145px] mx-auto">
                    {cat.name.split(' ')[0]}
                  </div>
                </th>
              ))}
              <th className="py-3 px-4 text-center min-w-[100px]">Progres</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {displayedTeachers.map((teacher) => {
              // Calculate completion score
              let completedCount = 0;
              activeCategories.forEach(cat => {
                const doc = getDocForTeacherAndCategory(teacher.name, cat.id);
                if (doc && (doc.status === 'disahkan' || doc.status === 'diverifikasi')) {
                  completedCount++;
                }
              });
              const percentage = activeCategories.length > 0 
                ? Math.round((completedCount / activeCategories.length) * 100)
                : 0;

              return (
                <tr key={teacher.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Teacher & Subject */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{teacher.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {teacher.subject} <span aria-hidden="true">·</span> NIP. {teacher.nip}
                    </div>
                  </td>

                  {/* Active Category Cells */}
                  {activeCategories.map((cat) => {
                    const doc = getDocForTeacherAndCategory(teacher.name, cat.id);

                    // CASE 1: Belum Diunggah -> Tanda + untuk unggah
                    if (!doc) {
                      return (
                        <td key={cat.id} className="py-3 px-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => onOpenUploadForTeacher(teacher, cat.id)}
                            className="inline-flex items-center justify-center gap-1 w-full py-2 px-2 text-xs font-semibold text-slate-500 hover:text-indigo-700 bg-slate-50 hover:bg-indigo-50 border border-dashed border-slate-300 hover:border-indigo-400 rounded-lg transition-all shadow-2xs group"
                            title={`Tanda +: Unggah ${cat.name} untuk ${teacher.name}`}
                          >
                            <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:scale-110" />
                            <span className="text-[11px]">Unggah</span>
                          </button>
                        </td>
                      );
                    }

                    // CASE 2: Dokumen Tersedia -> Tampilkan Status + Tanda + (unggah ulang), Pensil (edit), Mata (preview), Tong Sampah (hapus)
                    return (
                      <td key={cat.id} className="py-2.5 px-2 text-center">
                        <div className="flex flex-col items-center gap-1.5 p-1.5 rounded-lg border border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-colors">
                          {/* Status Badge */}
                          <div className="w-full flex justify-center">
                            {getStatusBadge(doc)}
                          </div>

                          {/* 4 Interactive Buttons Cluster */}
                          <div className="flex items-center justify-center gap-1 pt-0.5 border-t border-slate-100 w-full">
                            {/* 1. Tanda + untuk unggah / re-upload */}
                            <button
                              type="button"
                              onClick={() => onOpenUploadForTeacher(teacher, cat.id)}
                              className="p-1 rounded text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                              title="Tanda +: Unggah versi baru / ganti berkas"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>

                            {/* 2. Tanda pensil untuk edit */}
                            <button
                              type="button"
                              onClick={() => onEditDocument(doc)}
                              className="p-1 rounded text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                              title="Tanda Pensil: Edit metadata dokumen & status"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* 3. Tanda mata untuk preview file unggahan */}
                            <button
                              type="button"
                              onClick={() => onSelectDocument(doc)}
                              className="p-1 rounded text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                              title="Tanda Mata: Pratinjau berkas & detail dokumen"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* 4. Tanda tong sampah untuk hapus */}
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Hapus berkas "${doc.title}" untuk guru ${teacher.name}?`)) {
                                  onDeleteDocument(doc.id);
                                }
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Tanda Tong Sampah: Hapus dokumen dari arsip"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>
                    );
                  })}

                  {/* Percentage Progress Column */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-bold font-mono tabular-nums text-slate-800">
                        {percentage}%
                      </span>
                      <div className="w-16 bg-slate-200 h-1.5 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            percentage === 100
                              ? 'bg-emerald-500'
                              : percentage >= 50
                              ? 'bg-indigo-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {completedCount}/{activeCategories.length} Dok
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Matrix Legend Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-700">Fungsi Tombol Matriks:</span>
          <span className="flex items-center gap-1 font-medium text-indigo-700">
            <Plus className="w-3.5 h-3.5" /> <strong>+</strong> Unggah Berkas
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="flex items-center gap-1 font-medium text-amber-700">
            <Pencil className="w-3.5 h-3.5" /> <strong>Pensil</strong> Edit Data
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="flex items-center gap-1 font-medium text-blue-700">
            <Eye className="w-3.5 h-3.5" /> <strong>Mata</strong> Pratinjau
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="flex items-center gap-1 font-medium text-rose-700">
            <Trash2 className="w-3.5 h-3.5" /> <strong>Tong Sampah</strong> Hapus
          </span>
        </div>

        <div className="text-[11px] text-slate-500">
          * Aksi langsung terintegrasi dengan database arsip semester
        </div>
      </div>
    </div>
  );
};
