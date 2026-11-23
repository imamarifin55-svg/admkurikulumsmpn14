import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Users, UserPlus, Search, Pencil, Trash2, Download, Upload,
  X, Save, CheckCircle2, AlertTriangle, Phone, MapPin, FileSpreadsheet, RefreshCw
} from 'lucide-react';
import {
  AppUserRole, StudentGender, StudentRecord, StudentStatus,
  Teacher, SCHOOL_CLASS_GROUPS, SCHOOL_CLASS_VALUES
} from '../types/curriculum';

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
}

interface StagedImportRow {
  tempId: string;
  sheetName: string;
  student: StudentRecord;
  matchedExisting: StudentRecord | null;
  classWasRecognized: boolean;
}

const STATUS_META: Record<StudentStatus, { label: string; className: string }> = {
  aktif: {
    label: 'Aktif',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200'
  },
  pindahan: {
    label: 'Pindahan',
    className: 'bg-indigo-50 text-indigo-800 border-indigo-200'
  },
  keluar: {
    label: 'Mutasi Keluar',
    className: 'bg-rose-50 text-rose-800 border-rose-200'
  },
  lulus: {
    label: 'Lulus',
    className: 'bg-slate-100 text-slate-700 border-slate-300'
  }
};

function parseClassCode(raw: unknown): string | null {
  let text = String(raw ?? '').trim().toUpperCase();
  if (!text) return null;

  // Strip common prefixes
  text = text.replace(/^(KELAS|KLS|ROMBEL)\s*/i, '').trim();

  // Convert Roman grade numerals (VII, VIII, IX) to Arabic (7, 8, 9)
  text = text
    .replace(/^VIII\b/i, '8')
    .replace(/^VII\b/i, '7')
    .replace(/^IX\b/i, '9');

  // Extract 7.1-9.4 pattern from strings like "7.1", "7-1", "7_1", "7 1", "7.1 IPA"
  const match = text.match(/([789])\s*[._\-\s]\s*([1-4])\b/);
  if (match) {
    const candidate = `${match[1]}.${match[2]}`;
    if (SCHOOL_CLASS_VALUES.includes(candidate as (typeof SCHOOL_CLASS_VALUES)[number])) {
      return candidate;
    }
  }

  return null;
}

function normalizeImportedGender(raw: unknown): StudentGender {
  const val = String(raw ?? '').trim().toUpperCase();
  if (val.startsWith('P') || val === 'PEREMPUAN' || val === 'WANITA' || val === 'F') {
    return 'P';
  }
  return 'L';
}

function normalizeImportedStatus(raw: unknown): StudentStatus {
  const val = String(raw ?? '').trim().toLowerCase();
  if (val.includes('pindah')) return 'pindahan';
  if (val.includes('keluar') || val.includes('mutasi')) return 'keluar';
  if (val.includes('lulus')) return 'lulus';
  return 'aktif';
}

function normalizeExcelDate(raw: unknown): string | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw === 'number' && raw > 15000 && raw < 75000) {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      const mm = String(parsed.m).padStart(2, '0');
      const dd = String(parsed.d).padStart(2, '0');
      return `${parsed.y}-${mm}-${dd}`;
    }
  }
  const str = String(raw).trim();
  if (!str) return undefined;
  // Convert DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD for <input type="date">
  const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  return str.slice(0, 30);
}

function cleanIdDigits(raw: unknown): string {
  const str = String(raw ?? '').trim();
  if (!str || str === '-') return '-';
  // Handle Excel scientific or trailing .0 on numeric IDs
  return str.replace(/\.0+$/, '').slice(0, 40) || '-';
}

function findMatchingExistingStudent(
  candidate: { name: string; nis: string; nisn: string; homeroomClass: string },
  existingList: StudentRecord[]
): StudentRecord | null {
  const cleanNisn = candidate.nisn && candidate.nisn !== '-' ? candidate.nisn.trim() : '';
  const cleanNis = candidate.nis && candidate.nis !== '-' ? candidate.nis.trim() : '';
  const cleanName = candidate.name.trim().toLowerCase();
  const cleanClass = candidate.homeroomClass.trim().toUpperCase();

  if (cleanNisn && cleanNisn.length >= 6) {
    const byNisn = existingList.find(s => (s.nisn || '').trim() === cleanNisn);
    if (byNisn) return byNisn;
  }

  if (cleanNis) {
    const byNisName = existingList.find(
      s => (s.nis || '').trim() === cleanNis && s.name.trim().toLowerCase() === cleanName
    );
    if (byNisName) return byNisName;
  }

  const byNameClass = existingList.find(
    s =>
      s.name.trim().toLowerCase() === cleanName &&
      (s.homeroomClass || '').trim().toUpperCase() === cleanClass
  );
  return byNameClass || null;
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
  onDeleteStudent
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
  const [importPreview, setImportPreview] = useState<{
    fileName: string;
    sheetNames: string[];
    rows: StagedImportRow[];
  } | null>(null);
  const [importDeduplicate, setImportDeduplicate] = useState<boolean>(true);
  const [isCommittingImport, setIsCommittingImport] = useState<boolean>(false);

  // Add / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [formName, setFormName] = useState('');
  const [formNis, setFormNis] = useState('');
  const [formNisn, setFormNisn] = useState('');
  const [formGender, setFormGender] = useState<StudentGender>('L');
  const [formClass, setFormClass] = useState<string>(defaultClass);
  const [formStatus, setFormStatus] = useState<StudentStatus>('aktif');
  const [formBirthPlace, setFormBirthPlace] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formParentName, setFormParentName] = useState('');
  const [formParentPhone, setFormParentPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
    setFormName('');
    setFormNis('');
    setFormNisn('');
    setFormGender('L');
    setFormClass(
      !isWaka && activeHomeroomClass
        ? activeHomeroomClass
        : filterClass !== 'all'
        ? filterClass
        : SCHOOL_CLASS_VALUES[0]
    );
    setFormStatus('aktif');
    setFormBirthPlace('');
    setFormBirthDate('');
    setFormParentName('');
    setFormParentPhone('');
    setFormAddress('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (student: StudentRecord) => {
    setEditingStudent(student);
    setFormName(student.name);
    setFormNis(student.nis === '-' ? '' : student.nis);
    setFormNisn(student.nisn === '-' ? '' : student.nisn);
    setFormGender(student.gender);
    setFormClass(student.homeroomClass);
    setFormStatus(student.status);
    setFormBirthPlace(student.birthPlace || '');
    setFormBirthDate(student.birthDate || '');
    setFormParentName(student.parentName || '');
    setFormParentPhone(student.parentPhone || '');
    setFormAddress(student.address || '');
    setFormNotes(student.notes || '');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !formName.trim()) return;
    const resolvedClass = !isWaka && activeHomeroomClass ? activeHomeroomClass : formClass;
    if (!resolvedClass) return;

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      if (editingStudent) {
        await onUpdateStudent({
          ...editingStudent,
          name: formName.trim().slice(0, 150),
          nis: formNis.trim().slice(0, 40) || '-',
          nisn: formNisn.trim().slice(0, 40) || '-',
          gender: formGender,
          homeroomClass: resolvedClass.toUpperCase(),
          status: formStatus,
          birthPlace: formBirthPlace.trim().slice(0, 100) || undefined,
          birthDate: formBirthDate.trim().slice(0, 30) || undefined,
          parentName: formParentName.trim().slice(0, 150) || undefined,
          parentPhone: formParentPhone.trim().slice(0, 40) || undefined,
          address: formAddress.trim().slice(0, 300) || undefined,
          notes: formNotes.trim().slice(0, 500) || undefined,
          updatedAt: now
        });
        setFeedbackBanner({
          type: 'success',
          text: `Data peserta didik "${formName.trim()}" berhasil diperbarui.`
        });
      } else {
        const newStudent: StudentRecord = {
          id: `std-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: formName.trim().slice(0, 150),
          nis: formNis.trim().slice(0, 40) || '-',
          nisn: formNisn.trim().slice(0, 40) || '-',
          gender: formGender,
          homeroomClass: resolvedClass.toUpperCase(),
          status: formStatus,
          birthPlace: formBirthPlace.trim().slice(0, 100) || undefined,
          birthDate: formBirthDate.trim().slice(0, 30) || undefined,
          parentName: formParentName.trim().slice(0, 150) || undefined,
          parentPhone: formParentPhone.trim().slice(0, 40) || undefined,
          address: formAddress.trim().slice(0, 300) || undefined,
          notes: formNotes.trim().slice(0, 500) || undefined,
          academicYear,
          createdAt: now,
          updatedAt: now
        };
        await onAddStudent(newStudent);
        setFeedbackBanner({
          type: 'success',
          text: `Peserta didik "${newStudent.name}" (Kelas ${newStudent.homeroomClass}) berhasil ditambahkan.`
        });
      }
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const buildTemplateRows = () => {
    if (!isWaka && activeHomeroomClass) {
      return [
        {
          No: 1,
          NIS: '24001',
          NISN: '0112345678',
          'Nama Peserta Didik': 'Contoh: Ahmad Fauzi',
          'L/P': 'L',
          Kelas: activeHomeroomClass,
          'Tempat Lahir': 'Bandar Lampung',
          'Tanggal Lahir': '2012-05-14',
          'Nama Orang Tua / Wali': 'Budi Santoso',
          'No HP / WA': '081234567890',
          Alamat: 'Jl. Pendidikan No. 1',
          Status: 'Aktif',
          'Catatan Wali Kelas': ''
        }
      ];
    }

    return [
      {
        No: 1,
        NIS: '24001',
        NISN: '0112345678',
        'Nama Peserta Didik': 'Contoh: Ahmad Fauzi (Kelas 7.1)',
        'L/P': 'L',
        Kelas: '7.1',
        'Tempat Lahir': 'Bandar Lampung',
        'Tanggal Lahir': '2012-05-14',
        'Nama Orang Tua / Wali': 'Budi Santoso',
        'No HP / WA': '081234567890',
        Alamat: 'Jl. Pendidikan No. 1',
        Status: 'Aktif',
        'Catatan Wali Kelas': ''
      },
      {
        No: 2,
        NIS: '24002',
        NISN: '0112345679',
        'Nama Peserta Didik': 'Contoh: Siti Aisyah (Kelas 8.2)',
        'L/P': 'P',
        Kelas: '8.2',
        'Tempat Lahir': 'Tulang Bawang Barat',
        'Tanggal Lahir': '2011-08-21',
        'Nama Orang Tua / Wali': 'Hendra Wijaya',
        'No HP / WA': '081345678901',
        Alamat: 'Jl. Merdeka No. 15',
        Status: 'Aktif',
        'Catatan Wali Kelas': ''
      },
      {
        No: 3,
        NIS: '24003',
        NISN: '0109876543',
        'Nama Peserta Didik': 'Contoh: Rizky Pratama (Kelas 9.4)',
        'L/P': 'L',
        Kelas: '9.4',
        'Tempat Lahir': 'Metro',
        'Tanggal Lahir': '2010-02-10',
        'Nama Orang Tua / Wali': 'Sulastri',
        'No HP / WA': '085267891234',
        Alamat: 'Jl. Kartini No. 8',
        Status: 'Aktif',
        'Catatan Wali Kelas': ''
      }
    ];
  };

  const handleExportExcel = (forceTemplate = false) => {
    const useTemplate = forceTemplate || filteredStudents.length === 0;
    const rows = !useTemplate
      ? filteredStudents.map((s, idx) => ({
          No: idx + 1,
          NIS: s.nis,
          NISN: s.nisn,
          'Nama Peserta Didik': s.name,
          'L/P': s.gender,
          Kelas: s.homeroomClass,
          'Tempat Lahir': s.birthPlace || '',
          'Tanggal Lahir': s.birthDate || '',
          'Nama Orang Tua / Wali': s.parentName || '',
          'No HP / WA': s.parentPhone || '',
          Alamat: s.address || '',
          Status: STATUS_META[s.status].label,
          'Catatan Wali Kelas': s.notes || ''
        }))
      : buildTemplateRows();

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Peserta Didik');
    const suffix = effectiveClassFilter !== 'all' ? `Kelas_${effectiveClassFilter}` : 'Semua_Kelas';
    XLSX.writeFile(
      workbook,
      !useTemplate
        ? `Data_Peserta_Didik_${suffix}.xlsx`
        : isWaka
        ? 'Template_Impor_Semua_Kelas.xlsx'
        : `Template_Impor_Peserta_Didik_${suffix}.xlsx`
    );
  };

  const handleImportExcel = async (file: File | null) => {
    if (!file) return;
    setFeedbackBanner(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      if (workbook.SheetNames.length === 0) {
        setFeedbackBanner({ type: 'error', text: 'File Excel/CSV kosong atau tidak memiliki lembar kerja.' });
        return;
      }

      const targetFallbackClass = !isWaka && activeHomeroomClass
        ? activeHomeroomClass
        : filterClass !== 'all'
        ? filterClass
        : SCHOOL_CLASS_VALUES[0];

      const now = new Date().toISOString();
      const stagedRows: StagedImportRow[] = [];
      const scannedSheets: string[] = [];

      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) return;

        // Read 2D array to auto-detect header row even when Dapodik/school titles occupy rows 1-4
        const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          defval: '',
          raw: true
        });
        if (matrix.length === 0) return;

        // Also obtain formatted string matrix so leading zeros on NISN/Phone aren't lost
        const formattedMatrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
          header: 1,
          defval: '',
          raw: false
        });

        let headerRowIdx = -1;
        const scanLimit = Math.min(matrix.length, 12);
        for (let r = 0; r < scanLimit; r++) {
          const rowLabels = (matrix[r] || []).map(cell => String(cell ?? '').trim().toLowerCase());
          const hasNameCol = rowLabels.some(
            lbl =>
              lbl === 'nama' ||
              lbl === 'nama lengkap' ||
              lbl === 'nama siswa' ||
              lbl === 'nama peserta didik' ||
              lbl.includes('nama peserta')
          );
          if (hasNameCol) {
            headerRowIdx = r;
            break;
          }
        }
        if (headerRowIdx === -1) return;

        scannedSheets.push(sheetName);
        const headers = (matrix[headerRowIdx] || []).map(h => String(h ?? '').trim().toLowerCase());
        const sheetClassCode = parseClassCode(sheetName);

        for (let r = headerRowIdx + 1; r < matrix.length; r++) {
          const rawRow = matrix[r] || [];
          const fmtRow = formattedMatrix[r] || [];
          const byHeader = new Map<string, { raw: unknown; fmt: string }>();

          headers.forEach((h, colIdx) => {
            if (h) {
              byHeader.set(h, {
                raw: rawRow[colIdx],
                fmt: String(fmtRow[colIdx] ?? rawRow[colIdx] ?? '').trim()
              });
            }
          });

          const getStr = (...keys: string[]): string => {
            for (const key of keys) {
              const found = byHeader.get(key);
              if (found && found.fmt !== '') {
                return found.fmt;
              }
            }
            return '';
          };

          const getRaw = (...keys: string[]): unknown => {
            for (const key of keys) {
              const found = byHeader.get(key);
              if (found && found.raw !== undefined && found.raw !== null && found.raw !== '') {
                return found.raw;
              }
            }
            return '';
          };

          const name = getStr('nama peserta didik', 'nama lengkap', 'nama siswa', 'nama');
          if (!name || name.toLowerCase().startsWith('contoh:')) continue;

          const colClassRaw = getStr('kelas', 'rombel', 'rombel saat ini', 'kelas binaan', 'tingkat/rombel');
          const parsedColClass = parseClassCode(colClassRaw);
          const resolvedClass = !isWaka && activeHomeroomClass
            ? activeHomeroomClass
            : parsedColClass || sheetClassCode || targetFallbackClass;
          const classWasRecognized = !isWaka
            ? true
            : Boolean(parsedColClass || sheetClassCode);

          const nis = cleanIdDigits(getStr('nis', 'nipd', 'no induk', 'nomor induk'));
          const nisn = cleanIdDigits(getStr('nisn'));
          const gender = normalizeImportedGender(getStr('l/p', 'jk', 'jenis kelamin', 'gender'));
          const birthPlace = getStr('tempat lahir', 'tmp lahir').slice(0, 100) || undefined;
          const birthDate = normalizeExcelDate(getRaw('tanggal lahir', 'tgl lahir'));
          const parentName =
            getStr('nama orang tua / wali', 'nama orang tua', 'orang tua', 'wali', 'nama ortu', 'nama ayah', 'nama ibu').slice(0, 150) ||
            undefined;
          const parentPhone = getStr('no hp / wa', 'no hp', 'no. hp', 'telepon', 'hp', 'wa').slice(0, 40) || undefined;
          const address = getStr('alamat', 'alamat jalan').slice(0, 300) || undefined;
          const status = normalizeImportedStatus(getStr('status'));
          const notes = getStr('catatan wali kelas', 'catatan', 'keterangan').slice(0, 500) || undefined;

          const existingMatch = findMatchingExistingStudent(
            { name, nis, nisn, homeroomClass: resolvedClass },
            scopedStudents
          );

          const tempId = `stg-${stagedRows.length}-${Math.random().toString(36).slice(2, 6)}`;
          const studentRecord: StudentRecord = {
            id: `std-${Date.now()}-${stagedRows.length}-${Math.random().toString(36).slice(2, 5)}`,
            name: name.slice(0, 150),
            nis,
            nisn,
            gender,
            homeroomClass: resolvedClass,
            birthPlace,
            birthDate,
            parentName,
            parentPhone,
            address,
            status,
            notes,
            academicYear,
            createdAt: now,
            updatedAt: now
          };

          stagedRows.push({
            tempId,
            sheetName,
            student: studentRecord,
            matchedExisting: existingMatch,
            classWasRecognized
          });
        }
      });

      if (stagedRows.length === 0) {
        setFeedbackBanner({
          type: 'error',
          text: 'Tidak ditemukan data siswa yang valid. Pastikan ada kolom "Nama Peserta Didik" atau "Nama".'
        });
        return;
      }

      setImportDeduplicate(true);
      setImportPreview({
        fileName: file.name,
        sheetNames: scannedSheets,
        rows: stagedRows
      });
    } catch (err) {
      console.error('Gagal mengimpor data peserta didik:', err);
      setFeedbackBanner({
        type: 'error',
        text: 'Gagal membaca berkas Excel/CSV. Gunakan format .xlsx, .xls, atau .csv yang valid.'
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

  const handleConfirmImport = async () => {
    if (!importPreview || isCommittingImport) return;
    setIsCommittingImport(true);
    try {
      const now = new Date().toISOString();
      const finalRecords: StudentRecord[] = importPreview.rows.map((row) => {
        if (importDeduplicate && row.matchedExisting) {
          const existing = row.matchedExisting;
          return {
            ...existing,
            name: row.student.name,
            nis: row.student.nis !== '-' ? row.student.nis : existing.nis,
            nisn: row.student.nisn !== '-' ? row.student.nisn : existing.nisn,
            gender: row.student.gender,
            homeroomClass: row.student.homeroomClass,
            birthPlace: row.student.birthPlace || existing.birthPlace,
            birthDate: row.student.birthDate || existing.birthDate,
            parentName: row.student.parentName || existing.parentName,
            parentPhone: row.student.parentPhone || existing.parentPhone,
            address: row.student.address || existing.address,
            status: row.student.status,
            notes: row.student.notes || existing.notes,
            academicYear,
            updatedAt: now
          };
        }
        return row.student;
      });

      const updatedCount = importDeduplicate
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
            : `Berhasil mengimpor ${insertedCount} data peserta didik ke Cloud Real-Time.`
      });
    } finally {
      setIsCommittingImport(false);
    }
  };

  // Summary breakdown by class for the Import Preview Modal
  const previewClassSummary = useMemo(() => {
    if (!importPreview) return [];
    const counts = new Map<string, number>();
    importPreview.rows.forEach((r) => {
      const cls = r.student.homeroomClass;
      counts.set(cls, (counts.get(cls) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { numeric: true })
    );
  }, [importPreview]);

  const previewDuplicateMatches = importPreview
    ? importPreview.rows.filter(r => Boolean(r.matchedExisting)).length
    : 0;
  const previewUnrecognizedCount = importPreview
    ? importPreview.rows.filter(r => !r.classWasRecognized).length
    : 0;

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
              onClick={() => handleExportExcel(false)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              title={filteredStudents.length > 0 ? 'Ekspor data siswa ke Excel' : 'Unduh template Excel impor siswa'}
            >
              {filteredStudents.length > 0 ? (
                <>
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ekspor Excel</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Template Excel</span>
                </>
              )}
            </button>

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Total Ditampilkan</div>
            <div className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              {filteredStudents.length} <span className="text-xs font-normal text-slate-500">siswa</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Laki-laki / Perempuan</div>
            <div className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              <span className="text-blue-700">{maleCount} L</span>
              <span className="text-slate-300 mx-1.5">/</span>
              <span className="text-rose-700">{femaleCount} P</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Status Aktif</div>
            <div className="text-lg font-bold text-emerald-700 font-mono tabular-nums mt-0.5">
              {activeCount} <span className="text-xs font-normal text-slate-500">siswa</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">
              {isWaka ? 'Kelas Terdata' : 'Kelas Binaan'}
            </div>
            <div className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5">
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
                  const statusMeta = STATUS_META[student.status] || STATUS_META.aktif;
                  const homeroomTeacherName = getHomeroomTeacherName(student.homeroomClass);

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
                            {[student.birthPlace, student.birthDate].filter(Boolean).join(', ')}
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
                          {student.parentName || <span className="text-slate-400">—</span>}
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
                        <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${statusMeta.className}`}>
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
      {importPreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Pratinjau Impor Massal Peserta Didik
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Berkas: <strong className="text-slate-700">{importPreview.fileName}</strong> ·{' '}
                  {importPreview.sheetNames.length} sheet terbaca ({importPreview.sheetNames.join(', ')})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportPreview(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">Total Terdeteksi</div>
                  <div className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                    {importPreview.rows.length} siswa
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[11px] text-emerald-700">Siswa Baru</div>
                  <div className="text-base font-bold text-emerald-900 font-mono tabular-nums mt-0.5">
                    {importDeduplicate ? importPreview.rows.length - previewDuplicateMatches : importPreview.rows.length} siswa
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                  <div className="text-[11px] text-indigo-700">Cocok / Diperbarui</div>
                  <div className="text-base font-bold text-indigo-900 font-mono tabular-nums mt-0.5">
                    {importDeduplicate ? previewDuplicateMatches : 0} siswa
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">Jumlah Kelas</div>
                  <div className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                    {previewClassSummary.length} kelas
                  </div>
                </div>
              </div>

              {/* Class Distribution Breakdown */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="font-bold text-slate-800">
                  Ringkasan Pembagian per Kelas:
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {previewClassSummary.map(([cls, count]) => (
                    <div
                      key={cls}
                      className="px-2.5 py-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between"
                    >
                      <span className="font-bold text-emerald-800">Kls {cls}</span>
                      <span className="font-mono font-semibold text-slate-700 tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {isWaka && previewUnrecognizedCount > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Ada <strong>{previewUnrecognizedCount} baris</strong> yang kolom kelasnya kosong atau tidak sesuai format (mis. 7.1–9.4) sehingga sementara diarahkan ke kelas bawaan. Anda dapat menyesuaikan kelasnya langsung pada tabel di bawah.
                  </span>
                </div>
              )}

              {/* Anti-Duplicate Toggle */}
              <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={importDeduplicate}
                  onChange={(e) => setImportDeduplicate(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-indigo-700 rounded border-slate-300 cursor-pointer"
                />
                <div>
                  <div className="font-bold text-indigo-950">
                    Perbarui Otomatis Jika NISN / Nama &amp; Kelas Sudah Ada (Anti-Duplikat)
                  </div>
                  <div className="text-[11px] text-indigo-800 mt-0.5">
                    {previewDuplicateMatches > 0
                      ? `${previewDuplicateMatches} data cocok dengan siswa yang sudah tersimpan dan akan diperbarui tanpa membuat baris ganda.`
                      : 'Aktifkan agar impor ulang file master sekolah tidak menggandakan siswa yang sudah ada.'}
                  </div>
                </div>
              </label>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold z-10">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">No</th>
                        <th className="py-2 px-3">Nama Peserta Didik</th>
                        <th className="py-2 px-3">NIS / NISN</th>
                        <th className="py-2 px-3 text-center">L/P</th>
                        <th className="py-2 px-3">Kelas</th>
                        <th className="py-2 px-3">Aksi Impor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {importPreview.rows.map((row, idx) => {
                        const isUpdate = importDeduplicate && Boolean(row.matchedExisting);
                        return (
                          <tr key={row.tempId} className={!row.classWasRecognized ? 'bg-amber-50/40' : ''}>
                            <td className="py-2 px-3 text-center font-mono text-slate-500 tabular-nums">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              {row.student.name}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                              {row.student.nis} / {row.student.nisn}
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-bold">
                              {row.student.gender}
                            </td>
                            <td className="py-2 px-3">
                              {isWaka ? (
                                <select
                                  value={row.student.homeroomClass}
                                  onChange={(e) => handlePreviewRowClassChange(row.tempId, e.target.value)}
                                  className="text-[11px] font-semibold bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:border-emerald-600"
                                >
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
                              ) : (
                                <span className="font-bold text-emerald-800">
                                  Kelas {row.student.homeroomClass}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {isUpdate ? (
                                <span className="inline-block px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-semibold">
                                  Perbarui Data
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">
                                  Siswa Baru
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleExportExcel(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:underline cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Unduh Template Master Multi-Kelas (.xlsx)</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setImportPreview(null)}
                  disabled={isCommittingImport}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isCommittingImport}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer disabled:opacity-60"
                >
                  {isCommittingImport ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simpan {importPreview.rows.length} Siswa ke Cloud</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingStudent ? 'Edit Data Peserta Didik' : 'Tambah Peserta Didik Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap Peserta Didik *
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Ahmad Fauzi Pratama"
                  className="w-full font-semibold text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NIS (Nomor Induk Siswa)
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={formNis}
                    onChange={(e) => setFormNis(e.target.value)}
                    placeholder="Contoh: 24001"
                    className="w-full font-mono text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NISN
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={formNisn}
                    onChange={(e) => setFormNisn(e.target.value)}
                    placeholder="Contoh: 0112345678"
                    className="w-full font-mono text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jenis Kelamin *
                  </label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as StudentGender)}
                    className="w-full font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg p-2.5 focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kelas *
                  </label>
                  {isWaka ? (
                    <select
                      required
                      value={formClass}
                      onChange={(e) => setFormClass(e.target.value)}
                      className="w-full font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg p-2.5 focus:border-emerald-600 focus:outline-none"
                    >
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
                  ) : (
                    <div className="w-full font-bold text-emerald-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                      Kelas {activeHomeroomClass || formClass}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status Siswa
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as StudentStatus)}
                    className="w-full font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg p-2.5 focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="pindahan">Pindahan</option>
                    <option value="keluar">Mutasi Keluar</option>
                    <option value="lulus">Lulus</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={formBirthPlace}
                    onChange={(e) => setFormBirthPlace(e.target.value)}
                    placeholder="Contoh: Tulang Bawang Barat"
                    className="w-full text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={formBirthDate}
                    onChange={(e) => setFormBirthDate(e.target.value)}
                    className="w-full font-mono text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Orang Tua / Wali
                  </label>
                  <input
                    type="text"
                    maxLength={150}
                    value={formParentName}
                    onChange={(e) => setFormParentName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    No. HP / WhatsApp Orang Tua
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={formParentPhone}
                    onChange={(e) => setFormParentPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full font-mono text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alamat Tempat Tinggal
                </label>
                <input
                  type="text"
                  maxLength={300}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Contoh: Jl. Pendidikan No. 12, Daya Murni"
                  className="w-full text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan Khusus Wali Kelas (Opsional)
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Contoh: Ketua kelas, penerima PIP, butuh pendampingan khusus, dll."
                  className="w-full text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : editingStudent ? 'Simpan Perubahan' : 'Tambahkan Siswa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
