import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  BookUser, Search, Plus, Pencil, Printer, Download, Upload, FileSpreadsheet, X,
  CheckCircle2, AlertTriangle, ArrowLeft, Eye, Trash2, GraduationCap, Users, Camera
} from 'lucide-react';
import {
  AppUserRole, SchoolProfile, StudentRecord, StudentStatus,
  Teacher, SCHOOL_CLASS_GROUPS
} from '../types/curriculum';
import { SchoolLogoImg } from './SchoolLogoImg';
import {
  STUDENT_STATUS_META,
  compressStudentPhoto,
  exportUnifiedStudentsExcel,
  findMatchingExistingStudent,
  formatClassWithPhase,
  formatIndoDate,
  inferCityFromProfile,
  mergeImportedStudentRecord,
  parseUnifiedStudentExcel
} from '../utils/studentExcelHelper';
import { StudentFormModal } from './StudentFormModal';
import { StudentImportPreviewData, StudentImportPreviewModal } from './StudentImportPreviewModal';

interface BukuIndukViewProps {
  userRole: AppUserRole;
  students: StudentRecord[];
  profile: SchoolProfile;
  academicYear: string;
  activeHomeroomClass?: string | null;
  teachers: Teacher[];
  onAddStudent: (student: StudentRecord) => Promise<void> | void;
  onUpdateStudent: (student: StudentRecord) => Promise<void> | void;
  onImportStudents?: (students: StudentRecord[]) => Promise<void> | void;
  onDeleteStudent: (studentId: string) => Promise<void> | void;
  externalAddTrigger?: number;
}

function calculateIndukCompleteness(student: StudentRecord): { filled: number; total: number; percent: number } {
  const checks = [
    Boolean(student.nis && student.nis !== '-'),
    Boolean(student.nisn && student.nisn !== '-'),
    Boolean(student.birthPlace && student.birthPlace.trim()),
    Boolean(student.birthDate && student.birthDate.trim()),
    Boolean(student.religion && student.religion.trim()),
    Boolean((student.fatherName || student.motherName || student.parentName)?.trim()),
    Boolean(student.address && student.address.trim()),
    Boolean(student.previousSchool && student.previousSchool.trim()),
    Boolean(student.entryDate && student.entryDate.trim())
  ];
  const filled = checks.filter(Boolean).length;
  return {
    filled,
    total: checks.length,
    percent: Math.round((filled / checks.length) * 100)
  };
}

export const BukuIndukView: React.FC<BukuIndukViewProps> = ({
  userRole,
  students,
  profile,
  academicYear,
  activeHomeroomClass,
  teachers,
  onAddStudent,
  onUpdateStudent,
  onImportStudents,
  onDeleteStudent,
  externalAddTrigger = 0
}) => {
  const isWaka = userRole === 'waka_kurikulum';
  const normalizedActiveClass = (activeHomeroomClass || '').trim().toUpperCase();

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | StudentStatus>('all');
  const [pendingDelete, setPendingDelete] = useState<StudentRecord | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal & import states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [detailStudent, setDetailStudent] = useState<StudentRecord | null>(null);
  const [printMode, setPrintMode] = useState<
    | { kind: 'individual'; student: StudentRecord }
    | { kind: 'register'; studentsList: StudentRecord[]; titleLabel: string }
    | null
  >(null);

  const importInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<StudentImportPreviewData | null>(null);
  const [isCommittingImport, setIsCommittingImport] = useState(false);

  // Print header / sign-off customization state
  const [printCity, setPrintCity] = useState(() => inferCityFromProfile(profile));
  const [printDateText, setPrintDateText] = useState(() =>
    formatIndoDate(new Date().toISOString().split('T')[0])
  );
  const printPhotoInputRef = useRef<HTMLInputElement>(null);

  const getHomeroomTeacher = (cls: string): Teacher | undefined => {
    const norm = cls.trim().toUpperCase();
    return teachers.find(
      t => t.isHomeroomTeacher && (t.homeroomClass || '').trim().toUpperCase() === norm
    );
  };

  const scopedStudents = useMemo(() => {
    if (isWaka) return students;
    return students.filter(
      s => (s.homeroomClass || '').trim().toUpperCase() === normalizedActiveClass
    );
  }, [students, isWaka, normalizedActiveClass]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedStudents.filter((s) => {
      if (isWaka && filterClass !== 'all' && (s.homeroomClass || '').toUpperCase() !== filterClass) {
        return false;
      }
      if (filterStatus !== 'all' && s.status !== filterStatus) {
        return false;
      }
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.nis || '').toLowerCase().includes(q) ||
        (s.nisn || '').toLowerCase().includes(q) ||
        (s.parentName || '').toLowerCase().includes(q) ||
        (s.fatherName || '').toLowerCase().includes(q) ||
        (s.motherName || '').toLowerCase().includes(q) ||
        (s.previousSchool || '').toLowerCase().includes(q)
      );
    });
  }, [scopedStudents, isWaka, filterClass, filterStatus, searchQuery]);

  const maleCount = filteredStudents.filter(s => s.gender === 'L').length;
  const femaleCount = filteredStudents.filter(s => s.gender === 'P').length;
  const avgCompleteness = useMemo(() => {
    if (filteredStudents.length === 0) return 0;
    const sum = filteredStudents.reduce(
      (acc, st) => acc + calculateIndukCompleteness(st).percent,
      0
    );
    return Math.round(sum / filteredStudents.length);
  }, [filteredStudents]);
  const graduatedOrMovedCount = filteredStudents.filter(
    s => s.status === 'keluar' || s.status === 'lulus'
  ).length;

  const openAddModal = () => {
    setEditingStudent(null);
    setIsFormOpen(true);
  };

  useEffect(() => {
    if (externalAddTrigger > 0) {
      openAddModal();
    }
  }, [externalAddTrigger]);

  const openEditModal = (student: StudentRecord) => {
    setEditingStudent(student);
    setIsFormOpen(true);
  };

  const handleQuickPhotoUploadInPrint = async (file: File | null) => {
    if (!file || printMode?.kind !== 'individual') return;
    try {
      const compressed = await compressStudentPhoto(file);
      const updated: StudentRecord = {
        ...printMode.student,
        photoUrl: compressed,
        updatedAt: new Date().toISOString()
      };
      setPrintMode({ kind: 'individual', student: updated });
      await onUpdateStudent(updated);
    } catch (err) {
      console.error(err);
    } finally {
      if (printPhotoInputRef.current) printPhotoInputRef.current.value = '';
    }
  };

  const handleSaveStudent = async (payload: StudentRecord, isEdit: boolean) => {
    if (isEdit) {
      await onUpdateStudent(payload);
      setFeedbackBanner({
        type: 'success',
        text: `Buku Induk "${payload.name}" (Kelas ${payload.homeroomClass}) berhasil diperbarui.`
      });
    } else {
      await onAddStudent(payload);
      setFeedbackBanner({
        type: 'success',
        text: `Data induk siswa "${payload.name}" berhasil ditambahkan dan tersinkron ke daftar Peserta Didik.`
      });
    }
  };

  const handleExportBukuIndukExcel = (forceTemplate = false) => {
    exportUnifiedStudentsExcel({
      students: filteredStudents,
      isWaka,
      activeHomeroomClass,
      filterClass,
      academicYear,
      forceTemplate,
      filePrefix: 'Buku_Induk_Siswa'
    });
  };

  const handleImportExcel = async (file: File | null) => {
    if (!file || !onImportStudents) return;
    setFeedbackBanner(null);
    try {
      const parsed = await parseUnifiedStudentExcel({
        file,
        isWaka,
        activeHomeroomClass,
        filterClass,
        academicYear,
        scopedStudents
      });

      if (parsed.rows.length === 0) {
        setFeedbackBanner({
          type: 'error',
          text: 'Tidak ditemukan data siswa yang valid. Pastikan ada kolom "Nama Lengkap Siswa" atau "Nama Peserta Didik".'
        });
        return;
      }

      setImportPreview({
        fileName: file.name,
        sheetNames: parsed.sheetNames,
        rows: parsed.rows
      });
    } catch (err) {
      console.error('Gagal mengimpor data Buku Induk:', err);
      const isEmpty = err instanceof Error && err.message === 'EMPTY_WORKBOOK';
      setFeedbackBanner({
        type: 'error',
        text: isEmpty
          ? 'File Excel/CSV kosong atau tidak memiliki lembar kerja.'
          : 'Gagal membaca berkas Excel/CSV. Gunakan format .xlsx, .xls, atau .csv yang valid.'
      });
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const handlePreviewRowClassChange = (tempId: string, nextClass: string) => {
    setImportPreview(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.map(r => {
          if (r.tempId !== tempId) return r;
          const updatedStudent = { ...r.student, homeroomClass: nextClass };
          const rematched = findMatchingExistingStudent(
            {
              name: updatedStudent.name,
              nis: updatedStudent.nis,
              nisn: updatedStudent.nisn,
              homeroomClass: nextClass
            },
            scopedStudents
          );
          return {
            ...r,
            student: updatedStudent,
            matchedExisting: rematched,
            classWasRecognized: true
          };
        })
      };
    });
  };

  const handleConfirmImport = async (deduplicate: boolean) => {
    if (!importPreview || isCommittingImport || !onImportStudents) return;
    setIsCommittingImport(true);
    try {
      const now = new Date().toISOString();
      const finalRecords: StudentRecord[] = importPreview.rows.map((row) => {
        if (deduplicate && row.matchedExisting) {
          return mergeImportedStudentRecord(row.student, row.matchedExisting, academicYear, now);
        }
        return row.student;
      });

      const updatedCount = deduplicate
        ? importPreview.rows.filter(r => Boolean(r.matchedExisting)).length
        : 0;
      const insertedCount = finalRecords.length - updatedCount;

      await onImportStudents(finalRecords);
      setImportPreview(null);
      setFeedbackBanner({
        type: 'success',
        text:
          updatedCount > 0
            ? `Impor selesai: ${insertedCount} data induk baru ditambahkan dan ${updatedCount} data diperbarui (anti-duplikat).`
            : `Berhasil mengimpor ${insertedCount} data siswa ke Buku Induk & Peserta Didik.`
      });
    } finally {
      setIsCommittingImport(false);
    }
  };

  useEffect(() => {
    if (!printMode) return;
    document.body.classList.add('is-printing-portal');
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPrintMode(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('is-printing-portal');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [printMode]);

  const registerTitleLabel = useMemo(() => {
    if (!isWaka) return `Kelas ${normalizedActiveClass || '-'}`;
    return filterClass === 'all' ? 'Seluruh Rombel (Kelas 7.1 – 9.4)' : `Kelas ${filterClass}`;
  }, [isWaka, normalizedActiveClass, filterClass]);

  return (
    <div className="space-y-6 mb-8 text-xs">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-teal-700">Sub Menu Arsip Wali Kelas</span>
              <span aria-hidden="true">·</span>
              <span>
                {isWaka
                  ? 'Register Induk Peserta Didik Lintas Kelas'
                  : `Register Induk Kelas ${normalizedActiveClass || '-'}`}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">TP {academicYear}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
              <BookUser className="w-5 h-5 text-teal-700" />
              <span>
                {isWaka
                  ? 'Buku Induk Peserta Didik'
                  : `Buku Induk Siswa · Kelas ${normalizedActiveClass || ''}`}
              </span>
            </h1>
            <p className="text-slate-500 mt-1 max-w-2xl">
              Register resmi biodata peserta didik (NIS, NISN, orang tua/wali, sekolah asal, riwayat masuk, mutasi &amp; kelulusan) yang tersinkron langsung dengan daftar Peserta Didik dan siap cetak format A4.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onImportStudents && (
              <>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => handleImportExcel(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                  title="Impor data siswa & Buku Induk dari Excel/CSV"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isWaka ? 'Impor Master Excel' : 'Impor Excel'}</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => handleExportBukuIndukExcel(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              title="Unduh template Excel seragam Peserta Didik & Buku Induk (30 kolom)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Template Excel</span>
            </button>

            {filteredStudents.length > 0 && (
              <button
                type="button"
                onClick={() => handleExportBukuIndukExcel(false)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ekspor Excel</span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setPrintMode({
                  kind: 'register',
                  studentsList: filteredStudents,
                  titleLabel: registerTitleLabel
                })
              }
              disabled={filteredStudents.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-sky-700" />
              <span>Cetak Register A4</span>
            </button>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Data Induk</span>
            </button>
          </div>
        </div>

        {/* Ocean-Blue Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 rounded-xl bg-gradient-to-r from-[#062448] via-[#0b4b7a] to-[#0e7490] border border-sky-300/25 p-4 text-white shadow-xs">
          <div>
            <div className="text-[11px] text-sky-100/85 font-medium">Terdaftar di Buku Induk</div>
            <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
              {filteredStudents.length} <span className="text-xs font-normal text-sky-200/85">siswa</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-sky-100/85 font-medium">Komposisi L / P</div>
            <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
              <span className="text-sky-200">{maleCount} L</span>
              <span className="text-sky-300/50 mx-1.5">/</span>
              <span className="text-cyan-200">{femaleCount} P</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-sky-100/85 font-medium">Kelengkapan Biodata Induk</div>
            <div className="text-lg font-bold text-emerald-300 font-mono tabular-nums mt-0.5">
              {avgCompleteness}%
            </div>
          </div>
          <div>
            <div className="text-[11px] text-sky-100/85 font-medium">Mutasi Keluar / Lulus</div>
            <div className="text-lg font-bold text-amber-300 font-mono tabular-nums mt-0.5">
              {graduatedOrMovedCount} <span className="text-xs font-normal text-sky-200/85">siswa</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div
          className={`px-4 py-3 rounded-xl border flex items-center justify-between gap-3 ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{feedbackBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-xs underline opacity-80 hover:opacity-100 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Inline Delete Confirmation */}
      {pendingDelete && (
        <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              Hapus data induk siswa <strong>&ldquo;{pendingDelete.name}&rdquo;</strong> (Kelas {pendingDelete.homeroomClass}) dari Buku Induk?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                onDeleteStudent(pendingDelete.id);
                setPendingDelete(null);
              }}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold cursor-pointer"
            >
              Ya, Hapus Data
            </button>
          </div>
        </div>
      )}

      {/* Register Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa, NIS, NISN, orang tua, atau sekolah asal..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-teal-600 focus:outline-none"
            />
          </div>

          {isWaka && (
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-teal-600"
            >
              <option value="all">Semua Kelas (12 Rombel)</option>
              {SCHOOL_CLASS_GROUPS.map((group) => (
                <optgroup key={group.level} label={group.groupLabel}>
                  {group.classes.map((cls) => (
                    <option key={cls.value} value={cls.value}>
                      {cls.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | StudentStatus)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="pindahan">Pindahan</option>
            <option value="keluar">Mutasi Keluar</option>
            <option value="lulus">Lulus</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3 min-w-[130px]">NIS / NISN</th>
                <th className="py-3 px-4 min-w-[200px]">Nama &amp; Tempat Tgl Lahir</th>
                <th className="py-3 px-3 min-w-[95px]">L/P &amp; Agama</th>
                <th className="py-3 px-3 min-w-[115px]">Kelas &amp; Walas</th>
                <th className="py-3 px-4 min-w-[180px]">Orang Tua / Wali</th>
                <th className="py-3 px-3 min-w-[155px]">Sekolah Asal &amp; Masuk</th>
                <th className="py-3 px-3 min-w-[115px]">Status &amp; Isian</th>
                <th className="py-3 px-4 text-right min-w-[125px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="font-semibold text-slate-700">
                      Belum ada data siswa pada Buku Induk
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                      Tambahkan siswa melalui tombol <strong>Tambah Data Induk</strong> atau impor massal dari menu <strong>Peserta Didik</strong> — seluruh data langsung tersinkron di sini.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const statusMeta = STUDENT_STATUS_META[student.status] || STUDENT_STATUS_META.aktif;
                  const walas = getHomeroomTeacher(student.homeroomClass);
                  const completeness = calculateIndukCompleteness(student);
                  const parentLine =
                    student.fatherName || student.motherName
                      ? [student.fatherName, student.motherName].filter(Boolean).join(' / ')
                      : student.parentName || student.guardianName || '—';

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 text-center font-mono text-slate-500 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] tabular-nums">
                        <div className="font-bold text-slate-900">NIS: {student.nis || '-'}</div>
                        <div className="text-slate-500">NISN: {student.nisn || '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{student.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {student.birthPlace || student.birthDate
                            ? [student.birthPlace, formatIndoDate(student.birthDate)].filter(v => v && v !== '-').join(', ')
                            : 'TTL belum dilengkapi'}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                            student.gender === 'L'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {student.religion || 'Belum diisi'}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-teal-800">Kelas {student.homeroomClass}</div>
                        {walas && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[130px]" title={walas.name}>
                            {walas.name}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 truncate max-w-[180px]" title={parentLine}>
                          {parentLine}
                        </div>
                        {student.parentPhone && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            HP: {student.parentPhone}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800 truncate max-w-[155px]" title={student.previousSchool || ''}>
                          {student.previousSchool || <span className="text-slate-400">Belum diisi</span>}
                        </div>
                        {student.entryDate && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Masuk: {formatIndoDate(student.entryDate)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold ${statusMeta.badgeClass}`}>
                          {statusMeta.label}
                        </span>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                completeness.percent >= 80
                                  ? 'bg-emerald-600'
                                  : completeness.percent >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${completeness.percent}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                            {completeness.percent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailStudent(student)}
                            className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg cursor-pointer"
                            title="Lihat Lembar Buku Induk"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(student)}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                            title="Lengkapi / Edit Buku Induk"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPrintMode({ kind: 'individual', student })}
                            className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg cursor-pointer"
                            title="Cetak Lembar Buku Induk Siswa (A4)"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(student)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Hapus Data Siswa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Lembar Buku Induk */}
      {detailStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                  Lembar Buku Induk Peserta Didik
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {detailStudent.name} · Kelas {detailStudent.homeroomClass}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = detailStudent;
                    setDetailStudent(null);
                    openEditModal(target);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Lengkapi Data</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = detailStudent;
                    setDetailStudent(null);
                    setPrintMode({ kind: 'individual', student: target });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak A4</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailStudent(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Section A: Identitas Pribadi */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <BookUser className="w-4 h-4 text-teal-700" />
                  <span>A. Keterangan Pribadi Peserta Didik</span>
                </h4>
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 flex flex-col sm:flex-row gap-4">
                  {detailStudent.photoUrl && (
                    <div className="w-20 h-28 border border-slate-300 rounded-lg bg-white p-1 shrink-0 overflow-hidden self-start">
                      <img
                        src={detailStudent.photoUrl}
                        alt={`Pas Foto ${detailStudent.name}`}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  )}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                    <div><span className="text-slate-500">NIS / NISN:</span> <strong className="font-mono text-slate-900">{detailStudent.nis || '-'} / {detailStudent.nisn || '-'}</strong></div>
                    <div><span className="text-slate-500">Nama Lengkap:</span> <strong className="text-slate-900">{detailStudent.name}</strong></div>
                    <div><span className="text-slate-500">Jenis Kelamin:</span> <strong className="text-slate-900">{detailStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</strong></div>
                    <div><span className="text-slate-500">Tempat, Tgl Lahir:</span> <strong className="text-slate-900">{[detailStudent.birthPlace, formatIndoDate(detailStudent.birthDate)].filter(v => v && v !== '-').join(', ') || '-'}</strong></div>
                    <div><span className="text-slate-500">Agama / Status Keluarga:</span> <strong className="text-slate-900">{detailStudent.religion || '-'} · {detailStudent.familyStatus || 'Anak Kandung'}{detailStudent.childOrder ? ` · Anak ke-${detailStudent.childOrder}` : ''}</strong></div>
                    <div className="sm:col-span-2"><span className="text-slate-500">Alamat Siswa:</span> <strong className="text-slate-900">{detailStudent.address || '-'}</strong></div>
                  </div>
                </div>
              </div>

              {/* Section B: Orang Tua / Wali */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-teal-700" />
                  <span>B. Keterangan Orang Tua / Wali</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                  <div><span className="text-slate-500">Nama Ayah:</span> <strong className="text-slate-900">{detailStudent.fatherName || '-'}</strong></div>
                  <div><span className="text-slate-500">Nama Ibu:</span> <strong className="text-slate-900">{detailStudent.motherName || '-'}</strong></div>
                  <div><span className="text-slate-500">Kontak Utama Ortu:</span> <strong className="text-slate-900">{detailStudent.parentName || '-'}</strong></div>
                  <div><span className="text-slate-500">Pekerjaan Ortu:</span> <strong className="text-slate-900">{detailStudent.parentJob || '-'}</strong></div>
                  <div><span className="text-slate-500">No. HP / WhatsApp:</span> <strong className="font-mono text-slate-900">{detailStudent.parentPhone || '-'}</strong></div>
                  <div><span className="text-slate-500">Alamat Orang Tua:</span> <strong className="text-slate-900">{detailStudent.parentAddress || detailStudent.address || '-'}</strong></div>
                  {(detailStudent.guardianName || detailStudent.guardianJob || detailStudent.guardianAddress) && (
                    <>
                      <div><span className="text-slate-500">Nama Wali:</span> <strong className="text-slate-900">{detailStudent.guardianName || '-'}</strong></div>
                      <div><span className="text-slate-500">Pekerjaan Wali:</span> <strong className="text-slate-900">{detailStudent.guardianJob || '-'}</strong></div>
                      <div className="sm:col-span-2"><span className="text-slate-500">Alamat Wali:</span> <strong className="text-slate-900">{detailStudent.guardianAddress || '-'}</strong></div>
                    </>
                  )}
                </div>
              </div>

              {/* Section C: Perkembangan Pendidikan */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-teal-700" />
                  <span>C. Riwayat Masuk, Mutasi &amp; Kelulusan</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                  <div><span className="text-slate-500">Sekolah Asal (SD/MI):</span> <strong className="text-slate-900">{detailStudent.previousSchool || '-'}</strong></div>
                  <div><span className="text-slate-500">Diterima Tanggal / Kelas:</span> <strong className="text-slate-900">{formatIndoDate(detailStudent.entryDate)}{detailStudent.entryClass ? ` (Kelas ${detailStudent.entryClass})` : ''}</strong></div>
                  <div><span className="text-slate-500">Kelas &amp; Status Terkini:</span> <strong className="text-slate-900">Kelas {detailStudent.homeroomClass} · {STUDENT_STATUS_META[detailStudent.status]?.label}</strong></div>
                  <div><span className="text-slate-500">Wali Kelas:</span> <strong className="text-slate-900">{getHomeroomTeacher(detailStudent.homeroomClass)?.name || '-'}</strong></div>
                  <div><span className="text-slate-500">Tanggal Mutasi Keluar:</span> <strong className="text-slate-900">{formatIndoDate(detailStudent.leaveDate)}</strong></div>
                  <div><span className="text-slate-500">Alasan / Tujuan Mutasi:</span> <strong className="text-slate-900">{detailStudent.leaveReason || '-'}</strong></div>
                  <div><span className="text-slate-500">Tanggal Lulus:</span> <strong className="text-slate-900">{formatIndoDate(detailStudent.graduationDate)}</strong></div>
                  <div><span className="text-slate-500">Nomor Ijazah / SKL:</span> <strong className="font-mono text-slate-900">{detailStudent.certificateNumber || '-'}</strong></div>
                  {detailStudent.notes && (
                    <div className="sm:col-span-2"><span className="text-slate-500">Catatan:</span> <strong className="text-slate-900">{detailStudent.notes}</strong></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Staging & Class Summary Preview Modal */}
      <StudentImportPreviewModal
        preview={importPreview}
        isWaka={isWaka}
        isCommitting={isCommittingImport}
        onClose={() => setImportPreview(null)}
        onChangeRowClass={handlePreviewRowClassChange}
        onDownloadTemplate={() => handleExportBukuIndukExcel(true)}
        onConfirm={handleConfirmImport}
      />

      {/* Unified Form Modal (Identical to Peserta Didik) */}
      <StudentFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        editingStudent={editingStudent}
        isWaka={isWaka}
        activeHomeroomClass={activeHomeroomClass}
        defaultClassFilter={filterClass}
        academicYear={academicYear}
        onSave={handleSaveStudent}
      />

      {/* A4 Print Preview Portal */}
      {printMode &&
        createPortal(
          <div className="print-portal-sheet fixed inset-0 z-50 bg-slate-900/75 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-5xl mx-auto">
              {/* Screen-only toolbar */}
              <div className="print:hidden sticky top-0 z-10 mb-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-lg space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPrintMode(null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Kembali</span>
                    </button>
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {printMode.kind === 'individual'
                          ? `Pratinjau Cetak Buku Induk Siswa · ${printMode.student.name}`
                          : `Pratinjau Cetak Register Buku Induk · ${printMode.titleLabel}`}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Format cetak A4 resmi sesuai standar Buku Induk Siswa sekolah.
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {printMode.kind === 'individual' && (
                      <>
                        <input
                          ref={printPhotoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleQuickPhotoUploadInPrint(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => printPhotoInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
                        >
                          <Camera className="w-4 h-4 text-teal-700" />
                          <span>{printMode.student.photoUrl ? 'Ganti Pas Foto' : 'Pasang Pas Foto 3x4'}</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Cetak Sekarang (A4)</span>
                    </button>
                  </div>
                </div>

                {/* Quick Edit Kota & Tanggal TTD */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-600">Tempat TTD:</span>
                    <input
                      type="text"
                      value={printCity}
                      onChange={(e) => setPrintCity(e.target.value)}
                      className="border border-slate-300 rounded-md px-2 py-1 text-slate-900 font-medium w-44 focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-600">Tanggal TTD:</span>
                    <input
                      type="text"
                      value={printDateText}
                      onChange={(e) => setPrintDateText(e.target.value)}
                      className="border border-slate-300 rounded-md px-2 py-1 text-slate-900 font-medium w-40 focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Printable Sheet */}
              <div className="print-portal-card bg-white rounded-2xl shadow-xl border border-slate-200 px-10 py-10 sm:px-14 sm:py-12 text-slate-950 text-[12px] leading-relaxed">
                {printMode.kind === 'individual' ? (
                  (() => {
                    const st = printMode.student;
                    const birthText = [
                      st.birthPlace ? st.birthPlace.toUpperCase() : '',
                      st.birthDate || ''
                    ]
                      .filter(Boolean)
                      .join(', ') || '-';
                    const entryYearText = st.entryDate
                      ? st.entryDate.slice(0, 4)
                      : st.academicYear
                      ? st.academicYear.split('/')[0]
                      : String(new Date().getFullYear());
                    const entryDateOrYear = st.entryDate && st.entryDate.length >= 8
                      ? st.entryDate
                      : entryYearText;
                    const registeredAs =
                      st.status === 'pindahan' ? 'Peserta Didik Pindahan' : 'Peserta Didik Baru';

                    return (
                      <div>
                        {/* Title + Solid Black Divider matching attached PDF */}
                        <div className="text-center pb-3 mb-6 border-b-[2.5px] border-slate-950">
                          <h2 className="text-[17px] font-extrabold uppercase tracking-wide text-slate-950">
                            BUKU INDUK SISWA
                          </h2>
                        </div>

                        {/* Numbered 1–16 Official Register Table */}
                        <table className="w-full border-collapse text-[12px] text-slate-950">
                          <tbody>
                            <tr>
                              <td className="py-1.5 w-7 align-top">1.</td>
                              <td className="py-1.5 w-[265px] align-top">Nama Lengkap Siswa</td>
                              <td className="py-1.5 w-4 align-top">:</td>
                              <td className="py-1.5 font-bold uppercase align-top">{st.name}</td>
                            </tr>
                            <tr>
                              <td className="py-1.5 align-top">2.</td>
                              <td className="py-1.5 align-top">Nomor Induk Siswa (NIS)</td>
                              <td className="py-1.5 align-top">:</td>
                              <td className="py-1.5 align-top">{st.nis || '-'}</td>
                            </tr>
                            <tr>
                              <td className="py-1.5 align-top">3.</td>
                              <td className="py-1.5 align-top">Nomor Induk Siswa Nasional (NISN)</td>
                              <td className="py-1.5 align-top">:</td>
                              <td className="py-1.5 font-bold align-top">{st.nisn || '-'}</td>
                            </tr>
                            <tr>
                              <td className="py-1.5 align-top">4.</td>
                              <td className="py-1.5 align-top">Tempat, Tanggal Lahir</td>
                              <td className="py-1.5 align-top">:</td>
                              <td className="py-1.5 align-top">{birthText}</td>
                            </tr>
                            <tr>
                              <td className="py-1.5 align-top">5.</td>
                              <td className="py-1.5 align-top">Jenis Kelamin</td>
                              <td className="py-1.5 align-top">:</td>
                              <td className="py-1.5 align-top">
                                {st.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 align-top">6.</td>
                              <td className="py-1.5 align-top">Agama &amp; Kepercayaan</td>
                              <td className="py-1.5 align-top">:</td>
                              <td className="py-1.5 align-top">{st.religion || 'Islam'}</td>
                            </tr>
                            <tr>
                              <td className="py-1.5 align-top">7.</td>
                              <td className="py-1.5 align-top">Status dalam Keluarga</td>
                              <td className="py-1.5 align-top">:</td>
                              <td className="py-1.5 align-top">{st.familyStatus || 'Anak Kandung'}</td>
                            </tr>
                            <tr>
                              <td className="py-1.5 align-top">8.</td>
                              <td className="py-1.5 align-top">Anak Ke</td>
                              <td className="py-1.5 align-top">:</td>
                              <td className="py-1.5 align-top">{st.childOrder || '-'}</td>
                            </tr>
                            <tr>
                              <td className="py-1.5 align-top">9.</td>
                              <td className="py-1.5 align-top">Sekolah Asal (Pendidikan Sebelumnya)</td>
                              <td className="py-1.5 align-top">:</td>
                              <td className="py-1.5 align-top">
                                {st.previousSchool || 'Sekolah Dasar (SD / MI)'}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 align-top">10.</td>
                              <td className="py-1.5 align-top">Diterima di Sekolah Ini</td>
                              <td className="py-1.5 align-top">:</td>
                              <td className="py-1.5 align-top space-y-1">
                                <div>
                                  a. Di Kelas / Rombel :{' '}
                                  <strong>{formatClassWithPhase(st.entryClass || st.homeroomClass)}</strong>
                                </div>
                                <div>
                                  b. Pada Tanggal / Tahun Masuk : <strong>{entryDateOrYear}</strong>
                                </div>
                                <div>
                                  c. Terdaftar Sebagai : <strong>{registeredAs}</strong>
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 align-top">11.</td>
                              <td className="py-1.5 align-top">Alamat Peserta Didik</td>
                              <td className="py-1.5 align-top">:</td>
                              <td className="py-1.5 align-top uppercase">{st.address || '-'}</td>
                            </tr>
                            <tr>
                              <td className="py-1.5 align-top">12.</td>
                              <td className="py-1.5 align-top">Nomor Telepon / HP</td>
                              <td className="py-1.5 align-top">:</td>
                              <td className="py-1.5 align-top">{st.parentPhone || '-'}</td>
                            </tr>
                            <tr>
                              <td className="py-1.5 align-top">13.</td>
                              <td className="py-1.5 align-top">Nama Orang Tua Kandung</td>
                              <td className="py-1.5 align-top">:</td>
                              <td className="py-1.5 align-top space-y-1">
                                <div>
                                  a. Ayah : <strong className="uppercase">{st.fatherName || '-'}</strong>
                                </div>
                                <div>
                                  b. Ibu : <strong className="uppercase">{st.motherName || '-'}</strong>
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 align-top">14.</td>
                              <td className="py-1.5 align-top">Pekerjaan Orang Tua</td>
                              <td className="py-1.5 align-top">:</td>
                              <td className="py-1.5 align-top">{st.parentJob || '-'}</td>
                            </tr>
                            <tr>
                              <td className="py-1.5 align-top">15.</td>
                              <td className="py-1.5 align-top">Alamat Orang Tua</td>
                              <td className="py-1.5 align-top">:</td>
                              <td className="py-1.5 align-top uppercase">
                                {st.parentAddress || st.address || '-'}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 align-top">16.</td>
                              <td className="py-1.5 align-top">Wali Peserta Didik (jika ada)</td>
                              <td className="py-1.5 align-top">:</td>
                              <td className="py-1.5 align-top space-y-1">
                                <div>a. Nama Wali : {st.guardianName || '-'}</div>
                                <div>b. Pekerjaan Wali : {st.guardianJob || '-'}</div>
                                <div>c. Alamat Wali : {st.guardianAddress || '-'}</div>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Footer: Pas Foto 3x4 (Left) + Kepala Sekolah Signature (Right) */}
                        <div className="print-avoid-break mt-12 flex items-end justify-between gap-8">
                          {/* Pas Foto 3x4 Box */}
                          <div className="w-[114px] h-[152px] border border-slate-950 p-1 bg-white flex items-center justify-center shrink-0">
                            {st.photoUrl ? (
                              <img
                                src={st.photoUrl}
                                alt={`Pas Foto ${st.name}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full border border-dashed border-slate-300 flex flex-col items-center justify-center text-center text-[10px] text-slate-400 px-2">
                                <span>Pas Foto</span>
                                <span className="font-mono mt-0.5">3 x 4</span>
                              </div>
                            )}
                          </div>

                          {/* Kepala Sekolah Signature Block */}
                          <div className="text-center min-w-[240px] pr-2">
                            <div>
                              {printCity}, {printDateText}
                            </div>
                            <div className="font-bold mt-0.5">
                              Kepala {profile.name},
                            </div>
                            <div className="h-16 flex items-center justify-center">
                              {profile.headmasterSignatureUrl && (
                                <img
                                  src={profile.headmasterSignatureUrl}
                                  alt="Tanda Tangan Kepala Sekolah"
                                  className="max-h-14 object-contain"
                                />
                              )}
                            </div>
                            <div className="font-bold underline underline-offset-2 uppercase">
                              {profile.headmasterName}
                            </div>
                            <div className="font-mono text-[11px] tracking-wider mt-0.5">
                              NIP. {profile.headmasterNip}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div>
                    {/* Kop Surat Resmi untuk Register Multi-Siswa */}
                    <div className="flex items-center gap-4 border-b-4 border-double border-slate-900 pb-4 mb-6">
                      {profile.schoolLogoUrl && (
                        <SchoolLogoImg
                          src={profile.schoolLogoUrl}
                          alt="Logo Sekolah"
                          className="w-16 h-16 object-contain shrink-0"
                        />
                      )}
                      <div className="flex-1 text-center">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                          {[profile.regionalGovernment, profile.educationDepartment].filter(Boolean).join(' · ') || 'Pemerintah Daerah · Dinas Pendidikan'}
                        </div>
                        <div className="text-lg font-extrabold uppercase tracking-wide text-slate-900 mt-0.5">
                          {profile.name}
                        </div>
                        <div className="text-[11px] text-slate-700 mt-0.5">
                          {profile.address} · NPSN: {profile.npsn} · Akreditasi {profile.accreditation}
                        </div>
                      </div>
                    </div>

                    <div className="text-center mb-5">
                      <h2 className="text-sm font-extrabold uppercase tracking-wider underline underline-offset-4">
                        DAFTAR BUKU INDUK PESERTA DIDIK
                      </h2>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Lingkup: <strong>{printMode.titleLabel}</strong> · Tahun Pelajaran {academicYear} · Total: {printMode.studentsList.length} Siswa ({maleCount} L / {femaleCount} P)
                      </p>
                    </div>

                    <table className="print-table w-full border-collapse border border-slate-400 text-[10px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-900">
                          <th className="border border-slate-400 px-2 py-1.5 text-center w-8">No</th>
                          <th className="border border-slate-400 px-2 py-1.5">NIS / NISN</th>
                          <th className="border border-slate-400 px-2 py-1.5">Nama Lengkap &amp; TTL</th>
                          <th className="border border-slate-400 px-2 py-1.5 text-center w-10">L/P</th>
                          <th className="border border-slate-400 px-2 py-1.5">Agama</th>
                          <th className="border border-slate-400 px-2 py-1.5 text-center">Kelas</th>
                          <th className="border border-slate-400 px-2 py-1.5">Orang Tua / Wali</th>
                          <th className="border border-slate-400 px-2 py-1.5">Sekolah Asal</th>
                          <th className="border border-slate-400 px-2 py-1.5">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {printMode.studentsList.map((st, idx) => (
                          <tr key={st.id}>
                            <td className="border border-slate-300 px-2 py-1.5 text-center font-mono">{idx + 1}</td>
                            <td className="border border-slate-300 px-2 py-1.5 font-mono">
                              <div>{st.nis || '-'}</div>
                              <div className="text-slate-500">{st.nisn || '-'}</div>
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5">
                              <div className="font-bold">{st.name}</div>
                              {(st.birthPlace || st.birthDate) && (
                                <div className="text-slate-600">
                                  {[st.birthPlace, formatIndoDate(st.birthDate)].filter(v => v && v !== '-').join(', ')}
                                </div>
                              )}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-center font-mono font-bold">{st.gender}</td>
                            <td className="border border-slate-300 px-2 py-1.5">{st.religion || '-'}</td>
                            <td className="border border-slate-300 px-2 py-1.5 text-center font-bold">{st.homeroomClass}</td>
                            <td className="border border-slate-300 px-2 py-1.5">
                              {st.fatherName || st.motherName
                                ? [st.fatherName, st.motherName].filter(Boolean).join(' / ')
                                : st.parentName || st.guardianName || '-'}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5">{st.previousSchool || '-'}</td>
                            <td className="border border-slate-300 px-2 py-1.5">{STUDENT_STATUS_META[st.status]?.label || st.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="print-avoid-break grid grid-cols-2 gap-8 mt-8 text-xs">
                      <div className="text-center">
                        <div>Mengetahui,</div>
                        <div className="font-semibold">Kepala Sekolah</div>
                        <div className="h-16 flex items-center justify-center">
                          {profile.headmasterSignatureUrl && (
                            <img
                              src={profile.headmasterSignatureUrl}
                              alt="Tanda Tangan Kepala Sekolah"
                              className="max-h-14 object-contain"
                            />
                          )}
                        </div>
                        <div className="font-bold underline">{profile.headmasterName}</div>
                        <div className="font-mono text-[11px]">NIP. {profile.headmasterNip}</div>
                      </div>
                      <div className="text-center">
                        <div>Dicetak pada {formatIndoDate(new Date().toISOString().split('T')[0])}</div>
                        <div className="font-semibold">
                          {isWaka ? 'Waka Kurikulum' : `Wali Kelas ${normalizedActiveClass || ''}`}
                        </div>
                        <div className="h-16" />
                        <div className="font-bold underline">
                          {isWaka
                            ? profile.curriculumViceName
                            : getHomeroomTeacher(normalizedActiveClass)?.name || profile.curriculumViceName}
                        </div>
                        <div className="font-mono text-[11px]">
                          NIP. {isWaka
                            ? profile.curriculumViceNip
                            : getHomeroomTeacher(normalizedActiveClass)?.nip || profile.curriculumViceNip}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
