import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, Trash2, Calendar, BookOpen, User } from 'lucide-react';
import { 
  CurriculumDocument, DocumentCategory, GradeLevel, SemesterType, 
  CurriculumType, Teacher, VerificationStatus, CategoryItem 
} from '../types/curriculum';
import { CATEGORY_LABELS, SUBJECT_DICTIONARY } from '../utils/documentClassifier';

interface EditDocumentModalProps {
  document: CurriculumDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedDoc: CurriculumDocument) => void;
  teachers: Teacher[];
  categories: CategoryItem[];
}

export const EditDocumentModal: React.FC<EditDocumentModalProps> = ({
  document,
  isOpen,
  onClose,
  onSave,
  teachers,
  categories
}) => {
  const [title, setTitle] = useState(document?.title || '');
  const [category, setCategory] = useState<DocumentCategory>(document?.category || 'silabus_atp');
  const [subject, setSubject] = useState(document?.subject || 'Matematika');
  const [grade, setGrade] = useState<GradeLevel>(document?.grade || '7');
  const [semester, setSemester] = useState<SemesterType>(document?.semester || 'ganjil');
  const [academicYear, setAcademicYear] = useState(document?.academicYear || '2025/2026');
  const [teacherName, setTeacherName] = useState(document?.teacherName || '');
  const [teacherNip, setTeacherNip] = useState(document?.teacherNip || '');
  const [alokasiJp, setAlokasiJp] = useState<number>(document?.alokasiJp || 36);
  const [status, setStatus] = useState<VerificationStatus>(document?.status || 'draft');
  const [supervisorNotes, setSupervisorNotes] = useState(document?.supervisorNotes || '');
  const [curriculumType, setCurriculumType] = useState<CurriculumType>(document?.curriculumType || 'Kurikulum Merdeka');

  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setCategory(document.category);
      setSubject(document.subject);
      setGrade(document.grade);
      setSemester(document.semester);
      setAcademicYear(document.academicYear);
      setTeacherName(document.teacherName);
      setTeacherNip(document.teacherNip);
      setAlokasiJp(document.alokasiJp || 36);
      setStatus(document.status);
      setSupervisorNotes(document.supervisorNotes || '');
      setCurriculumType(document.curriculumType);
    }
  }, [document]);

  if (!isOpen || !document) return null;

  const handleTeacherSelect = (teacherId: string) => {
    const t = teachers.find(item => item.id === teacherId);
    if (t) {
      setTeacherName(t.name);
      setTeacherNip(t.nip);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CurriculumDocument = {
      ...document,
      title,
      category,
      subject,
      grade,
      semester,
      academicYear,
      teacherName,
      teacherNip,
      alokasiJp: Number(alokasiJp),
      status,
      supervisorNotes,
      curriculumType,
      lastModified: new Date().toISOString()
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Edit Metadata Dokumen Kurikulum
              </h2>
              <p className="text-xs text-slate-500">
                Perbarui rincian, alokasi jam pelajaran, guru pengampu, atau status validasi dokumen.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Title */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Judul Dokumen Kurikulum
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Category & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Kategori Dokumen
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const newCat = e.target.value;
                  setCategory(newCat);
                  const matched = categories.find(c => c.id === newCat);
                  if (matched && matched.defaultJp) {
                    setAlokasiJp(matched.defaultJp);
                  }
                }}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:border-indigo-500 focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mata Pelajaran
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:border-indigo-500 focus:outline-none"
              >
                {Object.values(SUBJECT_DICTIONARY).map((sub) => (
                  <option key={sub.standardName} value={sub.standardName}>
                    {sub.standardName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grade, Semester, Academic Year */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tingkat Kelas
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as GradeLevel)}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="7">Kelas 7 (Fase D)</option>
                <option value="8">Kelas 8 (Fase D)</option>
                <option value="9">Kelas 9 (Fase D)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value as SemesterType)}
                className="w-full text-xs font-semibold border border-indigo-200 bg-indigo-50/40 text-indigo-800 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ganjil">Semester Ganjil</option>
                <option value="genap">Semester Genap</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Alokasi JP
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={alokasiJp}
                onChange={(e) => setAlokasiJp(Number(e.target.value))}
                className="w-full text-xs font-mono font-semibold border border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Teacher Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Pilih Guru Pengampu
              </label>
              <select
                onChange={(e) => handleTeacherSelect(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">-- Tetapkan Guru Terdaftar --</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.subject})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nama Guru Penyusun &amp; NIP
              </label>
              <input
                type="text"
                value={`${teacherName} - NIP. ${teacherNip}`}
                readOnly
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Status & Supervisor Notes */}
          <div className="pt-2 border-t border-slate-200 space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Status Verifikasi &amp; Pengesahan
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as VerificationStatus)}
                className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="draft">Draft (Konsep)</option>
                <option value="diajukan">Diajukan (Menunggu Review)</option>
                <option value="diverifikasi">Diverifikasi Waka Kurikulum</option>
                <option value="disahkan">Disahkan Kepala Sekolah</option>
                <option value="perlu_revisi">Perlu Revisi Guru</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Catatan Supervisi Waka Kurikulum
              </label>
              <textarea
                rows={2}
                value={supervisorNotes}
                onChange={(e) => setSupervisorNotes(e.target.value)}
                placeholder="Catatan telaah atau instruksi revisi..."
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
