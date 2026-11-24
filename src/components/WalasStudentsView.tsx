import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Users, UserPlus, Search, Pencil, Trash2, Download, Upload,
  CheckCircle2, AlertTriangle, Phone, MapPin, FileSpreadsheet
} from 'lucide-react';
import {
  AppUserRole, StudentGender, StudentRecord, StudentStatus,
  Teacher, SCHOOL_CLASS_GROUPS, SCHOOL_CLASS_VALUES
} from '../types/curriculum';
import {
  STUDENT_STATUS_META,
  exportUnifiedStudentsExcel,
  findMatchingExistingStudent,
  formatIndoDate,
  mergeImportedStudentRecord,
  parseUnifiedStudentExcel
} from '../utils/studentExcelHelper';
import { StudentFormModal } from './StudentFormModal';
import { StudentImportPreviewData, StudentImportPreviewModal } from './StudentImportPreviewModal';

interface WalasStudentsViewProps {
  userRole: AppUserRole;
  students: StudentRecord[];
  academicYear: string;
  activeHomeroomClass?: string | null;
  teachers: Teacher[];
  onAddStudent: (student: StudentRecord) => Promise<void> | void;
  onUpdateStudent: (student: StudentRecord) => Promise<void> | void;
  onImportStudents: (students: StudentRecord[]) => Promise<void> | void;
  onDeleteStudent: (studentId: string) => Promise<void> | void;
  externalAddTrigger?: number;
}

export const WalasStudentsView: React.FC<WalasStudentsViewProps> = ({
  userRole,
  students,
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
  const defaultClass = !isWaka && activeHomeroomClass
    ? activeHomeroomClass
    : SCHOOL_CLASS_VALUES[0];

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>(isWaka ? 'all' : defaultClass);
  const [filterGender, setFilterGender] = useState<'all' | StudentGender>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | StudentStatus>('all');

  // Inline feedback & delete confirm
  const [pendingDelete, setPendingDelete] = useState<StudentRecord | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Import staging preview modal state
  const [importPreview, setImportPreview] = useState<StudentImportPreviewData | null>(null);
  const [isCommittingImport, setIsCommittingImport] = useState<boolean>(false);

  // Unified Add / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);

  const effectiveClassFilter = isWaka ? filterClass : (activeHomeroomClass || defaultClass);

  // Role-scoped students
  const scopedStudents = useMemo(() => {
    if (isWaka) return students;
    const normalized = (activeHomeroomClass || '').trim().toUpperCase();
    return students.filter(s => (s.homeroomClass || '').trim().toUpperCase() === normalized);
  }, [students, isWaka, activeHomeroomClass]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedStudents.filter((s) => {
      if (effectiveClassFilter !== 'all' && s.homeroomClass.toUpperCase() !== effectiveClassFilter.toUpperCase()) {
        return false;
      }
      if (filterGender !== 'all' && s.gender !== filterGender) {
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
        (s.guardianName || '').toLowerCase().includes(q) ||
        (s.parentPhone || '').toLowerCase().includes(q) ||
        s.homeroomClass.toLowerCase().includes(q)
      );
    });
  }, [scopedStudents, effectiveClassFilter, filterGender, filterStatus, searchQuery]);

  // Metrics based on filtered view
  const maleCount = filteredStudents.filter(s => s.gender === 'L').length;
  const femaleCount = filteredStudents.filter(s => s.gender === 'P').length;
  const activeCount = filteredStudents.filter(s => s.status === 'aktif').length;
  const distinctClassCount = new Set(scopedStudents.map(s => s.homeroomClass)).size;

  const getHomeroomTeacherName = (classCode: string) => {
    const matched = teachers.find(
      t => t.isHomeroomTeacher && (t.homeroomClass || '').trim().toUpperCase() === classCode.toUpperCase()
    );
    return matched?.name || null;
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (externalAddTrigger > 0) {
      openAddModal();
    }
  }, [externalAddTrigger]);

  const openEditModal = (student: StudentRecord) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  const handleSaveStudent = async (payload: StudentRecord, isEdit: boolean) => {
    if (isEdit) {
      await onUpdateStudent(payload);
      setFeedbackBanner({
        type: 'success',
        text: `Data peserta didik "${payload.name}" berhasil diperbarui.`
      });
    } else {
      await onAddStudent(payload);
      setFeedbackBanner({
        type: 'success',
        text: `Peserta didik "${payload.name}" (Kelas ${payload.homeroomClass}) berhasil ditambahkan dan tersinkron ke Buku Induk.`
      });
    }
  };

  const handleExportExcel = (forceTemplate = false) => {
    exportUnifiedStudentsExcel({
      students: filteredStudents,
      isWaka,
      activeHomeroomClass,
      filterClass: effectiveClassFilter,
      academicYear,
      forceTemplate,
      filePrefix: 'Data_Peserta_Didik'
    });
  };

  const handleImportExcel = async (file: File | null) => {
    if (!file) return;
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
      console.error('Gagal mengimpor data peserta didik:', err);
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
    if (!importPreview || isCommittingImport) return;
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
            ? `Impor selesai: ${insertedCount} siswa baru ditambahkan dan ${updatedCount} data siswa diperbarui (anti-duplikat).`
            : `Berhasil mengimpor ${insertedCount} data peserta didik & Buku Induk ke Cloud Real-Time.`
      });
    } finally {
      setIsCommittingImport(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Strip & Action Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {isWaka
                ? 'Daftar Peserta Didik Seluruh Kelas (12 Rombel)'
                : `Daftar Peserta Didik Kelas ${activeHomeroomClass || '-'}`}
            </h3>
            <p className="text-slate-500 mt-0.5">
              {isWaka
                ? 'Dapat mengimpor 1 file master Excel sekaligus untuk seluruh 12 kelas (1 sheet atau multi-sheet) dengan pratinjau dan deteksi anti-duplikat otomatis.'
                : 'Kelola biodata siswa, NIS/NISN, kontak orang tua/wali, serta status keaktifan peserta didik kelas binaan Anda.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
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
              title={
                isWaka
                  ? 'Impor sekaligus seluruh siswa 12 kelas dari Excel/CSV (dengan pratinjau)'
                  : 'Impor data siswa sekaligus dari file Excel atau CSV'
              }
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isWaka ? 'Impor Master Excel' : 'Impor Excel'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportExcel(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              title="Unduh template Excel seragam Peserta Didik & Buku Induk (30 kolom)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Template Excel</span>
            </button>

            {filteredStudents.length > 0 && (
              <button
                type="button"
                onClick={() => handleExportExcel(false)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                title="Ekspor data siswa ke Excel"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ekspor Excel</span>
              </button>
            )}

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Peserta Didik</span>
            </button>
          </div>
        </div>

        {/* Summary Numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 rounded-xl bg-gradient-to-r from-[#062448] via-[#0b4b7a] to-[#0e7490] border border-sky-300/25 p-4 text-white shadow-xs">
          <div>
            <div className="text-[11px] text-sky-100/85 font-medium">Total Ditampilkan</div>
            <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
              {filteredStudents.length} <span className="text-xs font-normal text-sky-200/85">siswa</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-sky-100/85 font-medium">Laki-laki / Perempuan</div>
            <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
              <span className="text-sky-200">{maleCount} L</span>
              <span className="text-sky-300/50 mx-1.5">/</span>
              <span className="text-cyan-200">{femaleCount} P</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-sky-100/85 font-medium">Status Aktif</div>
            <div className="text-lg font-bold text-emerald-300 font-mono tabular-nums mt-0.5">
              {activeCount} <span className="text-xs font-normal text-sky-200/85">siswa</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-sky-100/85 font-medium">
              {isWaka ? 'Kelas Terdata' : 'Kelas Binaan'}
            </div>
            <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
              {isWaka ? `${distinctClassCount} / 12` : `Kelas ${activeHomeroomClass || '-'}`}
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
              Hapus data peserta didik <strong>&ldquo;{pendingDelete.name}&rdquo;</strong> (Kelas {pendingDelete.homeroomClass})?
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
              Ya, Hapus Siswa
            </button>
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Search & Filter Row */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[210px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa, NIS, NISN, nama orang tua, atau no. HP..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {isWaka && (
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-600"
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
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value as 'all' | StudentGender)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none"
          >
            <option value="all">Semua L/P</option>
            <option value="L">Laki-laki (L)</option>
            <option value="P">Perempuan (P)</option>
          </select>

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

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-3 min-w-[130px]">NIS / NISN</th>
                <th className="py-3 px-4 min-w-[220px]">Nama Peserta Didik</th>
                <th className="py-3 px-3 text-center w-16">L/P</th>
                <th className="py-3 px-3 min-w-[120px]">Kelas</th>
                <th className="py-3 px-4 min-w-[190px]">Orang Tua / Wali</th>
                <th className="py-3 px-3 min-w-[110px]">Status</th>
                <th className="py-3 px-4 text-right min-w-[90px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="font-semibold text-slate-700">
                      Belum ada data peserta didik yang cocok
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                      {isWaka
                        ? 'Klik Tambah Peserta Didik untuk input satuan, atau gunakan Impor Master Excel untuk mengunggah seluruh siswa 12 kelas sekaligus dalam 1 file.'
                        : 'Klik Tambah Peserta Didik untuk input satuan atau gunakan Impor Excel untuk mengunggah daftar siswa sekaligus.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const statusMeta = STUDENT_STATUS_META[student.status] || STUDENT_STATUS_META.aktif;
                  const homeroomTeacherName = getHomeroomTeacherName(student.homeroomClass);
                  const parentDisplay =
                    student.parentName ||
                    [student.fatherName, student.motherName].filter(Boolean).join(' / ') ||
                    student.guardianName;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-slate-500 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] tabular-nums">
                        <div className="font-semibold text-slate-800">{student.nis || '-'}</div>
                        <div className="text-slate-400">NISN: {student.nisn || '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{student.name}</div>
                        {(student.birthPlace || student.birthDate) && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {[student.birthPlace, formatIndoDate(student.birthDate)].filter(v => v && v !== '-').join(', ')}
                          </div>
                        )}
                        {student.notes && (
                          <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 mt-1 inline-block">
                            {student.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            student.gender === 'L'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {student.gender}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-emerald-800">
                          Kelas {student.homeroomClass}
                        </div>
                        {homeroomTeacherName && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[140px]" title={homeroomTeacherName}>
                            {homeroomTeacherName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">
                          {parentDisplay || <span className="text-slate-400">—</span>}
                        </div>
                        {student.parentPhone && (
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{student.parentPhone}</span>
                          </div>
                        )}
                        {student.address && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate max-w-[200px]" title={student.address}>
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{student.address}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${statusMeta.badgeClass}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(student)}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                            title={`Edit ${student.name}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(student)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title={`Hapus ${student.name}`}
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

      {/* Import Staging & Class Summary Preview Modal */}
      <StudentImportPreviewModal
        preview={importPreview}
        isWaka={isWaka}
        isCommitting={isCommittingImport}
        onClose={() => setImportPreview(null)}
        onChangeRowClass={handlePreviewRowClassChange}
        onDownloadTemplate={() => handleExportExcel(true)}
        onConfirm={handleConfirmImport}
      />

      {/* Unified Add / Edit Student Modal (Identical to Buku Induk) */}
      <StudentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingStudent={editingStudent}
        isWaka={isWaka}
        activeHomeroomClass={activeHomeroomClass}
        defaultClassFilter={filterClass}
        academicYear={academicYear}
        onSave={handleSaveStudent}
      />
    </div>
  );
};
