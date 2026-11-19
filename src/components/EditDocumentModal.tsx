import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Edit3, UploadCloud, FileText, CheckCircle2, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { 
  CurriculumDocument, DocumentCategory, GradeLevel, SemesterType, 
  CurriculumType, Teacher, VerificationStatus, CategoryItem, AppUserRole, DocumentFile 
} from '../types/curriculum';
import { SUBJECT_DICTIONARY } from '../utils/documentClassifier';

const MAX_CLOUD_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

interface EditDocumentModalProps {
  document: CurriculumDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedDoc: CurriculumDocument, newAttachedFile?: DocumentFile) => Promise<void> | void;
  teachers: Teacher[];
  categories: CategoryItem[];
  userRole?: AppUserRole;
  wakaTeacher?: Teacher | null;
}

export const EditDocumentModal: React.FC<EditDocumentModalProps> = ({
  document,
  isOpen,
  onClose,
  onSave,
  teachers,
  categories,
  userRole = 'waka_kurikulum',
  wakaTeacher
}) => {
  const [title, setTitle] = useState(document?.title || '');
  const [category, setCategory] = useState<DocumentCategory>(document?.category || 'silabus_atp');
  const [subject, setSubject] = useState(document?.subject || 'Matematika');
  const [grade, setGrade] = useState<GradeLevel>(document?.grade || '7');
  const [semester, setSemester] = useState<SemesterType>(document?.semester || 'ganjil');
  const [academicYear, setAcademicYear] = useState(document?.academicYear || '2026/2027');
  const [teacherId, setTeacherId] = useState(document?.teacherId || '');
  const [teacherName, setTeacherName] = useState(document?.teacherName || '');
  const [teacherNip, setTeacherNip] = useState(document?.teacherNip || '');
  const [teacherEmail, setTeacherEmail] = useState(document?.teacherEmail || '');
  const [alokasiJp, setAlokasiJp] = useState<number>(document?.alokasiJp || 36);
  const [status, setStatus] = useState<VerificationStatus>(document?.status || 'draft');
  const [supervisorNotes, setSupervisorNotes] = useState(document?.supervisorNotes || '');
  const [curriculumType, setCurriculumType] = useState<CurriculumType>(document?.curriculumType || 'Kurikulum Merdeka');

  // Real file upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setCategory(document.category);
      setSubject(document.subject);
      setGrade(document.grade);
      setSemester(document.semester);
      setAcademicYear(document.academicYear);
      setTeacherId(document.teacherId || '');
      setTeacherName(document.teacherName);
      setTeacherNip(document.teacherNip);
      setTeacherEmail(document.teacherEmail || '');
      setAlokasiJp(document.alokasiJp || 36);
      setStatus(document.status);
      setSupervisorNotes(document.supervisorNotes || '');
      setCurriculumType(document.curriculumType);
      setSelectedFile(null);
      setUploadError(null);
      setIsSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [document]);

  if (!isOpen || !document) return null;

  const handleTeacherSelect = (selectedId: string) => {
    const t =
      (wakaTeacher && selectedId === wakaTeacher.id ? wakaTeacher : undefined) ||
      teachers.find(item => item.id === selectedId);
    if (t) {
      setTeacherId(t.id);
      setTeacherName(t.name);
      setTeacherNip(t.nip);
      setTeacherEmail(t.email);
    }
  };

  const handlePickFile = (file: File | null) => {
    setUploadError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.size === 0) {
      setUploadError('File kosong (0 byte). Silakan pilih file lain yang valid.');
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_CLOUD_FILE_BYTES) {
      setUploadError('Ukuran file melebihi batas maksimal 10 MB untuk penyimpanan Cloud.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const isWaka = userRole === 'waka_kurikulum';

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (selectedFile && selectedFile.size > MAX_CLOUD_FILE_BYTES) {
      setUploadError('Ukuran file melebihi batas maksimal 10 MB.');
      return;
    }

    setIsSaving(true);
    setUploadError(null);
    try {
      let newFilePayload: DocumentFile | undefined;
      if (selectedFile) {
        const dataUrl = await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(selectedFile);
        });
        if (!dataUrl) {
          setUploadError('Gagal membaca file dari perangkat. Silakan coba lagi.');
          setIsSaving(false);
          return;
        }
        newFilePayload = {
          id: document.id,
          documentId: document.id,
          fileName: selectedFile.name.slice(0, 255),
          mimeType: (selectedFile.type || 'application/octet-stream').slice(0, 120),
          fileSize: selectedFile.size,
          dataUrl,
          uploadedAt: new Date().toISOString()
        };
      }

      const updated: CurriculumDocument = {
        ...document,
        title,
        category,
        subject,
        grade,
        semester,
        academicYear,
        teacherId: teacherId || document.teacherId,
        teacherName,
        teacherNip,
        teacherEmail: teacherEmail || document.teacherEmail,
        alokasiJp: Number(alokasiJp),
        status: isWaka ? status : document.status,
        supervisorNotes: isWaka ? supervisorNotes : document.supervisorNotes,
        curriculumType,
        originalFileName: selectedFile ? selectedFile.name.slice(0, 255) : document.originalFileName,
        fileSize: selectedFile ? selectedFile.size : document.fileSize,
        fileType: selectedFile
          ? (selectedFile.name.split('.').pop()?.toLowerCase() || 'file').slice(0, 20)
          : document.fileType,
        hasStoredFile: newFilePayload ? true : document.hasStoredFile,
        externalFileUrl: newFilePayload ? undefined : document.externalFileUrl,
        lastModified: new Date().toISOString()
      };

      await onSave(updated, newFilePayload);
      onClose();
    } finally {
      setIsSaving(false);
    }
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
                {subject && !Object.values(SUBJECT_DICTIONARY).some(s => s.standardName === subject) && (
                  <option value={subject}>{subject}</option>
                )}
                {Object.values(SUBJECT_DICTIONARY).map((sub) => (
                  <option key={sub.standardName} value={sub.standardName}>
                    {sub.standardName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grade, Semester, Academic Year, Alokasi JP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                Tahun Pelajaran
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 bg-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="2026/2027">2026/2027</option>
                <option value="2025/2026">2025/2026</option>
                <option value="2024/2025">2024/2025</option>
                <option value="2023/2024">2023/2024</option>
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
                {isWaka && wakaTeacher && (
                  <option value={wakaTeacher.id}>
                    Waka Kurikulum — {wakaTeacher.name}
                  </option>
                )}
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

          {/* Real Cloud File Upload & Status */}
          <div className="pt-2 border-t border-slate-200 space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Unggah / Ganti Berkas File (Semua Format, Maks. 10 MB)
              </label>

              {/* Current Stored File Info */}
              <div className="mb-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-800 truncate">
                      Berkas saat ini: {document.originalFileName}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {(document.fileSize / 1024 / 1024).toFixed(2)} MB ·{' '}
                      {document.hasStoredFile ? (
                        <span className="text-emerald-700 font-semibold">Tersimpan di Cloud</span>
                      ) : (
                        <span className="text-amber-700 font-semibold">Belum ada file fisik di Cloud</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dropzone / File Picker */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  const dropped = e.dataTransfer.files?.[0] || null;
                  handlePickFile(dropped);
                }}
                className={`rounded-xl border-2 border-dashed p-3.5 transition-all ${
                  isDraggingFile
                    ? 'border-indigo-500 bg-indigo-50/70'
                    : selectedFile
                    ? 'border-emerald-300 bg-emerald-50/50'
                    : 'border-slate-300 bg-slate-50/50 hover:border-indigo-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => handlePickFile(e.target.files?.[0] || null)}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate text-xs">
                          File Baru Siap Diunggah: {selectedFile.name}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-mono">
                          {(selectedFile.size / 1024).toFixed(1)} KB ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB) · Akan disimpan langsung ke Cloud
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-lg cursor-pointer"
                      >
                        Ganti
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setUploadError(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        title="Batalkan pilihan file baru"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-1 text-center py-1 cursor-pointer"
                  >
                    <UploadCloud className="w-5 h-5 text-indigo-600" />
                    <span className="text-xs font-semibold text-slate-800">
                      Klik untuk Memilih File atau Tarik File ke Sini
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Mendukung semua jenis file: JPG, JPEG, PNG, PDF, Word (DOCX/DOC), Excel (XLSX/XLS), PowerPoint, dll.
                    </span>
                  </button>
                )}
              </div>

              {uploadError && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>

            {isWaka ? (
              <>
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
              </>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
                <div className="font-semibold text-slate-800 mb-0.5">
                  Status Validasi Saat Ini: <span className="uppercase">{document.status.replace('_', ' ')}</span>
                </div>
                <p className="text-[11px]">
                  Perubahan status pengesahan dan catatan supervisi hanya dapat dilakukan oleh Waka Kurikulum.
                </p>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{selectedFile ? 'Mengunggah & Menyimpan...' : 'Menyimpan...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
