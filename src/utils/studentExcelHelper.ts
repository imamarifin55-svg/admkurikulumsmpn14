import * as XLSX from 'xlsx';
import {
  SCHOOL_CLASS_VALUES,
  SchoolProfile,
  StudentGender,
  StudentRecord,
  StudentStatus
} from '../types/curriculum';

export const STUDENT_STATUS_META: Record<StudentStatus, { label: string; badgeClass: string }> = {
  aktif: {
    label: 'Aktif',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200'
  },
  pindahan: {
    label: 'Pindahan',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200'
  },
  keluar: {
    label: 'Mutasi Keluar',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200'
  },
  lulus: {
    label: 'Lulus',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300'
  }
};

export const RELIGION_OPTIONS = [
  'Islam',
  'Kristen',
  'Katolik',
  'Hindu',
  'Buddha',
  'Konghucu'
];

export const FAMILY_STATUS_OPTIONS = [
  'Anak Kandung',
  'Anak Tiri',
  'Anak Angkat'
];

export interface StagedImportRow {
  tempId: string;
  sheetName: string;
  student: StudentRecord;
  matchedExisting: StudentRecord | null;
  classWasRecognized: boolean;
}

export function formatIndoDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function inferCityFromProfile(profile: SchoolProfile): string {
  const reg = (profile.regionalGovernment || '').trim();
  if (reg) {
    const cleaned = reg
      .replace(/^PEMERINTAH\s+(KABUPATEN|KOTA|DAERAH\s+KHUSUS\s+IBUKOTA|DAERAH)\s+/i, '')
      .trim();
    if (cleaned) return toTitleCase(cleaned);
  }
  const schoolName = (profile.name || '').trim();
  const kabMatch = schoolName.match(/(?:Kabupaten|Kota)\s+([A-Za-z\s]+)/i);
  if (kabMatch?.[1]) return toTitleCase(kabMatch[1].trim());
  return 'Kota Sekolah';
}

export function formatClassWithPhase(classCode: string): string {
  const clean = (classCode || '').trim();
  if (!clean) return '-';
  const grade = Number(clean.split('.')[0]);
  let fase = 'Fase D';
  if (grade >= 1 && grade <= 2) fase = 'Fase A';
  else if (grade >= 3 && grade <= 4) fase = 'Fase B';
  else if (grade >= 5 && grade <= 6) fase = 'Fase C';
  else if (grade >= 7 && grade <= 9) fase = 'Fase D';
  else if (grade === 10) fase = 'Fase E';
  else if (grade >= 11 && grade <= 12) fase = 'Fase F';
  return `Kelas ${clean} (${fase})`;
}

export async function compressStudentPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const targetW = 240;
        const targetH = 320;
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);

        const srcRatio = img.width / img.height;
        const dstRatio = targetW / targetH;
        let sx = 0;
        let sy = 0;
        let sw = img.width;
        let sh = img.height;
        if (srcRatio > dstRatio) {
          sw = img.height * dstRatio;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / dstRatio;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('Gagal memproses file foto.'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Gagal membaca file foto.'));
    reader.readAsDataURL(file);
  });
}

function parseClassCode(raw: unknown): string | null {
  let text = String(raw ?? '').trim().toUpperCase();
  if (!text) return null;

  text = text.replace(/^(KELAS|KLS|ROMBEL)\s*/i, '').trim();
  text = text
    .replace(/^VIII\b/i, '8')
    .replace(/^VII\b/i, '7')
    .replace(/^IX\b/i, '9');

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
  if (!str || str === '-') return undefined;
  const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  return str.slice(0, 30);
}

function cleanIdDigits(raw: unknown): string {
  const str = String(raw ?? '').trim();
  if (!str || str === '-') return '-';
  return str.replace(/\.0+$/, '').slice(0, 40) || '-';
}

function cleanOptionalText(raw: string, maxLen: number): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-') return undefined;
  return trimmed.slice(0, maxLen);
}

export function findMatchingExistingStudent(
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

export function mergeImportedStudentRecord(
  incoming: StudentRecord,
  existing: StudentRecord,
  academicYear: string,
  nowIso: string
): StudentRecord {
  const resolvedParentName =
    incoming.parentName ||
    existing.parentName ||
    incoming.fatherName ||
    existing.fatherName ||
    incoming.motherName ||
    existing.motherName ||
    incoming.guardianName ||
    existing.guardianName;

  return {
    ...existing,
    name: incoming.name,
    nis: incoming.nis !== '-' ? incoming.nis : existing.nis,
    nisn: incoming.nisn !== '-' ? incoming.nisn : existing.nisn,
    gender: incoming.gender,
    religion: incoming.religion || existing.religion,
    familyStatus: incoming.familyStatus || existing.familyStatus,
    childOrder: incoming.childOrder || existing.childOrder,
    homeroomClass: incoming.homeroomClass,
    birthPlace: incoming.birthPlace || existing.birthPlace,
    birthDate: incoming.birthDate || existing.birthDate,
    fatherName: incoming.fatherName || existing.fatherName,
    motherName: incoming.motherName || existing.motherName,
    guardianName: incoming.guardianName || existing.guardianName,
    guardianJob: incoming.guardianJob || existing.guardianJob,
    guardianAddress: incoming.guardianAddress || existing.guardianAddress,
    parentName: resolvedParentName,
    parentJob: incoming.parentJob || existing.parentJob,
    parentPhone: incoming.parentPhone || existing.parentPhone,
    parentAddress: incoming.parentAddress || existing.parentAddress,
    address: incoming.address || existing.address,
    previousSchool: incoming.previousSchool || existing.previousSchool,
    entryDate: incoming.entryDate || existing.entryDate,
    entryClass: incoming.entryClass || existing.entryClass,
    leaveDate: incoming.leaveDate || existing.leaveDate,
    leaveReason: incoming.leaveReason || existing.leaveReason,
    graduationDate: incoming.graduationDate || existing.graduationDate,
    certificateNumber: incoming.certificateNumber || existing.certificateNumber,
    status: incoming.status,
    notes: incoming.notes || existing.notes,
    academicYear,
    updatedAt: nowIso
  };
}

const UNIFIED_STUDENT_EXCEL_COL_WIDTHS = [
  { wch: 5 },  // No
  { wch: 12 }, // NIS
  { wch: 14 }, // NISN
  { wch: 28 }, // Nama Lengkap Siswa
  { wch: 6 },  // L/P
  { wch: 10 }, // Kelas
  { wch: 18 }, // Tempat Lahir
  { wch: 14 }, // Tanggal Lahir
  { wch: 12 }, // Agama
  { wch: 18 }, // Status dalam Keluarga
  { wch: 9 },  // Anak Ke
  { wch: 24 }, // Asal Sekolah (SD/MI)
  { wch: 14 }, // Tanggal Masuk
  { wch: 15 }, // Diterima di Kelas
  { wch: 30 }, // Alamat Peserta Didik
  { wch: 16 }, // No HP / WA
  { wch: 22 }, // Nama Ayah
  { wch: 22 }, // Nama Ibu
  { wch: 22 }, // Kontak Utama Orang Tua
  { wch: 18 }, // Pekerjaan Orang Tua
  { wch: 28 }, // Alamat Orang Tua
  { wch: 20 }, // Nama Wali
  { wch: 18 }, // Pekerjaan Wali
  { wch: 28 }, // Alamat Wali
  { wch: 14 }, // Status
  { wch: 15 }, // Tanggal Mutasi Keluar
  { wch: 24 }, // Alasan / Tujuan Mutasi
  { wch: 14 }, // Tanggal Lulus
  { wch: 18 }, // Nomor Ijazah / SKL
  { wch: 26 }  // Catatan
];

function mapStudentToUnifiedExcelRow(s: StudentRecord, idx: number) {
  return {
    No: idx + 1,
    NIS: s.nis || '-',
    NISN: s.nisn || '-',
    'Nama Lengkap Siswa': s.name,
    'L/P': s.gender,
    Kelas: s.homeroomClass,
    'Tempat Lahir': s.birthPlace || '',
    'Tanggal Lahir': s.birthDate || '',
    Agama: s.religion || 'Islam',
    'Status dalam Keluarga': s.familyStatus || 'Anak Kandung',
    'Anak Ke': s.childOrder || '',
    'Asal Sekolah (SD/MI)': s.previousSchool || '',
    'Tanggal Masuk': s.entryDate || '',
    'Diterima di Kelas': s.entryClass || '',
    'Alamat Peserta Didik': s.address || '',
    'No HP / WA': s.parentPhone || '',
    'Nama Ayah': s.fatherName || '',
    'Nama Ibu': s.motherName || '',
    'Kontak Utama Orang Tua': s.parentName || s.fatherName || s.motherName || '',
    'Pekerjaan Orang Tua': s.parentJob || '',
    'Alamat Orang Tua': s.parentAddress || '',
    'Nama Wali': s.guardianName || '',
    'Pekerjaan Wali': s.guardianJob || '',
    'Alamat Wali': s.guardianAddress || '',
    Status: STUDENT_STATUS_META[s.status]?.label || s.status,
    'Tanggal Mutasi Keluar': s.leaveDate || '',
    'Alasan / Tujuan Mutasi': s.leaveReason || '',
    'Tanggal Lulus': s.graduationDate || '',
    'Nomor Ijazah / SKL': s.certificateNumber || '',
    Catatan: s.notes || ''
  };
}

function buildUnifiedTemplateRows(isWaka: boolean, activeHomeroomClass?: string | null) {
  const sampleBase = (
    idx: number,
    nis: string,
    nisn: string,
    name: string,
    gender: StudentGender,
    cls: string,
    birthPlace: string,
    birthDate: string,
    fatherName: string,
    motherName: string,
    address: string
  ) =>
    mapStudentToUnifiedExcelRow(
      {
        id: `tpl-${idx}`,
        nis,
        nisn,
        name,
        gender,
        religion: 'Islam',
        familyStatus: 'Anak Kandung',
        childOrder: '1',
        homeroomClass: cls,
        birthPlace,
        birthDate,
        fatherName,
        motherName,
        parentName: fatherName,
        parentJob: 'Wiraswasta',
        parentPhone: '081234567890',
        parentAddress: address,
        address,
        previousSchool: 'Sekolah Dasar (SD / MI)',
        entryDate: '2026-07-13',
        entryClass: cls,
        status: 'aktif',
        notes: '',
        academicYear: '2026/2027',
        createdAt: '',
        updatedAt: ''
      },
      idx
    );

  if (!isWaka && activeHomeroomClass) {
    return [
      sampleBase(
        0,
        '2290',
        '0131856168',
        'Contoh: Abizar Kansa Al-Habsy',
        'L',
        activeHomeroomClass,
        'Toto Mulyo',
        '2013-06-06',
        'Supardi',
        'Sri Widiarti',
        'Mulyo Jadi'
      )
    ];
  }

  return [
    sampleBase(
      0,
      '2290',
      '0131856168',
      'Contoh: Abizar Kansa Al-Habsy (Kelas 7.1)',
      'L',
      '7.1',
      'Toto Mulyo',
      '2013-06-06',
      'Supardi',
      'Sri Widiarti',
      'Mulyo Jadi'
    ),
    sampleBase(
      1,
      '2291',
      '0123456789',
      'Contoh: Siti Aisyah (Kelas 8.2)',
      'P',
      '8.2',
      'Tulang Bawang Barat',
      '2012-08-21',
      'Hendra Wijaya',
      'Siti Aminah',
      'Daya Murni'
    ),
    sampleBase(
      2,
      '2292',
      '0119876543',
      'Contoh: Rizky Pratama (Kelas 9.4)',
      'L',
      '9.4',
      'Metro',
      '2011-02-10',
      'Budi Santoso',
      'Sulastri',
      'Panaragan Jaya'
    )
  ];
}

export function exportUnifiedStudentsExcel(options: {
  students: StudentRecord[];
  isWaka: boolean;
  activeHomeroomClass?: string | null;
  filterClass?: string;
  academicYear: string;
  forceTemplate?: boolean;
  filePrefix?: string;
}) {
  const {
    students,
    isWaka,
    activeHomeroomClass,
    filterClass = 'all',
    academicYear,
    forceTemplate = false,
    filePrefix = 'Data_Siswa_Buku_Induk'
  } = options;

  const useTemplate = forceTemplate || students.length === 0;
  const rows = !useTemplate
    ? students.map((s, idx) => mapStudentToUnifiedExcelRow(s, idx))
    : buildUnifiedTemplateRows(isWaka, activeHomeroomClass);

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = UNIFIED_STUDENT_EXCEL_COL_WIDTHS;
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Buku Induk & Peserta Didik');

  const classSuffix = !isWaka && activeHomeroomClass
    ? `Kelas_${activeHomeroomClass}`
    : filterClass !== 'all'
    ? `Kelas_${filterClass}`
    : 'Semua_Kelas';

  const fileName = useTemplate
    ? isWaka
      ? 'Template_Impor_Siswa_Buku_Induk_MultiKelas.xlsx'
      : `Template_Impor_Siswa_Buku_Induk_${classSuffix}.xlsx`
    : `${filePrefix}_${classSuffix}_${academicYear.replace('/', '-')}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}

export async function parseUnifiedStudentExcel(options: {
  file: File;
  isWaka: boolean;
  activeHomeroomClass?: string | null;
  filterClass?: string;
  academicYear: string;
  scopedStudents: StudentRecord[];
}): Promise<{ sheetNames: string[]; rows: StagedImportRow[] }> {
  const {
    file,
    isWaka,
    activeHomeroomClass,
    filterClass = 'all',
    academicYear,
    scopedStudents
  } = options;

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  if (workbook.SheetNames.length === 0) {
    throw new Error('EMPTY_WORKBOOK');
  }

  const targetFallbackClass =
    !isWaka && activeHomeroomClass
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

    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      raw: true
    });
    if (matrix.length === 0) return;

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
          lbl === 'nama lengkap siswa' ||
          lbl === 'nama siswa' ||
          lbl === 'nama peserta didik' ||
          lbl.includes('nama peserta') ||
          lbl.includes('nama lengkap')
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

      const name = getStr('nama lengkap siswa', 'nama peserta didik', 'nama lengkap', 'nama siswa', 'nama');
      if (!name || name.toLowerCase().startsWith('contoh:')) continue;

      const colClassRaw = getStr('kelas', 'kelas saat ini', 'rombel', 'rombel saat ini', 'kelas binaan', 'tingkat/rombel');
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
      const birthPlace = cleanOptionalText(getStr('tempat lahir', 'tmp lahir'), 100);
      const birthDate = normalizeExcelDate(getRaw('tanggal lahir', 'tgl lahir'));
      const religion = cleanOptionalText(getStr('agama', 'agama & kepercayaan'), 40);
      const familyStatus = cleanOptionalText(getStr('status dalam keluarga', 'status keluarga'), 50);
      const childOrder = cleanOptionalText(getStr('anak ke', 'anak ke-'), 20);
      const previousSchool = cleanOptionalText(getStr('asal sekolah (sd/mi)', 'asal sekolah', 'sekolah asal'), 150);
      const entryDate = normalizeExcelDate(getRaw('tanggal masuk', 'tanggal diterima', 'tgl masuk'));
      const entryClass = cleanOptionalText(getStr('diterima di kelas', 'kelas masuk'), 20);
      const address = cleanOptionalText(getStr('alamat peserta didik', 'alamat', 'alamat jalan'), 300);
      const parentPhone = cleanOptionalText(getStr('no hp / wa', 'no. hp orang tua', 'no hp', 'no. hp', 'telepon', 'hp', 'wa'), 40);
      const fatherName = cleanOptionalText(getStr('nama ayah', 'ayah'), 150);
      const motherName = cleanOptionalText(getStr('nama ibu', 'ibu'), 150);
      const explicitParentName = cleanOptionalText(
        getStr('kontak utama orang tua', 'nama orang tua / wali', 'nama orang tua', 'nama ortu', 'orang tua'),
        150
      );
      const parentJob = cleanOptionalText(getStr('pekerjaan orang tua', 'pekerjaan ortu/wali', 'pekerjaan ortu'), 100);
      const parentAddress = cleanOptionalText(getStr('alamat orang tua', 'alamat ortu'), 300);
      const guardianName = cleanOptionalText(getStr('nama wali', 'wali', 'nama wali / kontak utama'), 150);
      const guardianJob = cleanOptionalText(getStr('pekerjaan wali'), 100);
      const guardianAddress = cleanOptionalText(getStr('alamat wali'), 300);
      const status = normalizeImportedStatus(getStr('status', 'status siswa'));
      const leaveDate = normalizeExcelDate(getRaw('tanggal mutasi keluar', 'tanggal keluar/mutasi'));
      const leaveReason = cleanOptionalText(getStr('alasan / tujuan mutasi', 'alasan mutasi'), 250);
      const graduationDate = normalizeExcelDate(getRaw('tanggal lulus'));
      const certificateNumber = cleanOptionalText(getStr('nomor ijazah / skl', 'nomor ijazah', 'no ijazah'), 80);
      const notes = cleanOptionalText(getStr('catatan', 'catatan wali kelas', 'catatan buku induk', 'keterangan'), 500);

      const parentName = explicitParentName || fatherName || motherName || guardianName;

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
        religion,
        familyStatus,
        childOrder,
        homeroomClass: resolvedClass,
        birthPlace,
        birthDate,
        fatherName,
        motherName,
        guardianName,
        guardianJob,
        guardianAddress,
        parentName,
        parentJob,
        parentPhone,
        parentAddress,
        address,
        previousSchool,
        entryDate,
        entryClass,
        leaveDate,
        leaveReason,
        graduationDate,
        certificateNumber,
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

  return { sheetNames: scannedSheets, rows: stagedRows };
}
