/**
 * Types for School Curriculum Archival & Syllabus Management System
 */

export type SemesterType = 'ganjil' | 'genap';

export type SchoolClassCode =
  | '7.1' | '7.2' | '7.3' | '7.4'
  | '8.1' | '8.2' | '8.3' | '8.4'
  | '9.1' | '9.2' | '9.3' | '9.4';

export type GradeLevel = SchoolClassCode | '7' | '8' | '9' | '10' | '11' | '12';

export interface SchoolClassOption {
  value: SchoolClassCode;
  label: string;
  level: '7' | '8' | '9';
}

export const SCHOOL_CLASS_GROUPS: { level: '7' | '8' | '9'; groupLabel: string; classes: SchoolClassOption[] }[] = [
  {
    level: '7',
    groupLabel: 'Kelas 7',
    classes: [
      { value: '7.1', label: 'Kelas 7.1', level: '7' },
      { value: '7.2', label: 'Kelas 7.2', level: '7' },
      { value: '7.3', label: 'Kelas 7.3', level: '7' },
      { value: '7.4', label: 'Kelas 7.4', level: '7' }
    ]
  },
  {
    level: '8',
    groupLabel: 'Kelas 8',
    classes: [
      { value: '8.1', label: 'Kelas 8.1', level: '8' },
      { value: '8.2', label: 'Kelas 8.2', level: '8' },
      { value: '8.3', label: 'Kelas 8.3', level: '8' },
      { value: '8.4', label: 'Kelas 8.4', level: '8' }
    ]
  },
  {
    level: '9',
    groupLabel: 'Kelas 9',
    classes: [
      { value: '9.1', label: 'Kelas 9.1', level: '9' },
      { value: '9.2', label: 'Kelas 9.2', level: '9' },
      { value: '9.3', label: 'Kelas 9.3', level: '9' },
      { value: '9.4', label: 'Kelas 9.4', level: '9' }
    ]
  }
];

export const SCHOOL_CLASSES: SchoolClassOption[] = SCHOOL_CLASS_GROUPS.flatMap(g => g.classes);

export const SCHOOL_CLASS_VALUES: SchoolClassCode[] = SCHOOL_CLASSES.map(c => c.value);

export type CurriculumType = 'Kurikulum Merdeka' | 'Kurikulum 2013';

export type CategoryScope = 'kurikulum' | 'wali_kelas';

// Category identifier can be standard or custom user-defined
export type DocumentCategory = 
  | 'silabus_atp'      // Silabus / Alur Tujuan Pembelajaran (ATP)
  | 'modul_ajar'       // Modul Ajar / RPP Diferensiasi
  | 'promes'           // Program Semester
  | 'prota'            // Program Tahunan
  | 'capaian_pemb'     // Capaian Pembelajaran & Pemetaan TP
  | 'kisi_soal'        // Kisi-Kisi & Bank Soal Asesmen (STS/SAS)
  | 'kosp'             // Dokumen Kurikulum Operasional Satuan Pendidikan
  | 'modul_p5'         // Modul Projek P5
  | 'wl_presensi'      // Daftar Hadir / Rekap Presensi Siswa
  | 'wl_jurnal'        // Jurnal Kelas & Agenda Harian
  | 'wl_leger'         // Leger Nilai & Catatan Rapor
  | 'wl_bk'            // Catatan Bimbingan / Konseling & Home Visit
  | 'wl_siswa'         // Biodata Siswa, Orang Tua & Denah Kelas
  | 'wl_rapat'         // Administrasi Rapat & Berita Acara Pengambilan Rapor
  | string;            // Custom categories added by school admin

export interface CategoryItem {
  id: string;
  code: string; // e.g. "ATP", "MA", "PROMES"
  name: string; // e.g. "Silabus / ATP (Alur Tujuan Pembelajaran)"
  defaultJp: number; // default Jam Pelajaran
  description?: string;
  isSupervisedInMatrix: boolean; // whether this appears as a monitored column in the teacher/walas matrix
  isSystemDefault?: boolean;
  scope?: CategoryScope; // defaults to 'kurikulum' when omitted for backward compatibility
}

export type VerificationStatus = 
  | 'draft'            // Konsep oleh Guru
  | 'diajukan'         // Menunggu Verifikasi Waka Kurikulum
  | 'diverifikasi'     // Diverifikasi Waka Kurikulum
  | 'disahkan'         // Disahkan Kepala Sekolah
  | 'perlu_revisi';    // Catatan Revisi dari Supervisor

export interface CurriculumDocument {
  id: string;
  title: string;
  originalFileName: string;
  fileSize: number; // in bytes
  fileType: string; // pdf, docx, xlsx
  category: DocumentCategory;
  archiveScope?: CategoryScope; // 'kurikulum' (default) | 'wali_kelas'
  homeroomClass?: string; // e.g. "7.1", "8.2", "9.4" for Wali Kelas archives
  subject: string;
  grade: GradeLevel;
  semester: SemesterType;
  academicYear: string; // e.g. "2025/2026"
  curriculumType: CurriculumType;
  teacherId?: string;
  teacherName: string;
  teacherNip: string;
  teacherEmail?: string;
  alokasiJp?: number; // Jam Pelajaran
  competencies?: string[]; // TP / Materi Pokok
  uploadDate: string; // ISO String
  lastModified: string;
  status: VerificationStatus;
  supervisorNotes?: string;
  verificationDate?: string;
  verifiedBy?: string;
  approvalNumber?: string; // Nomor Registrasi Pengesahan
  contentPreview?: string;
  externalFileUrl?: string; // Link opsional bila berkas sangat besar (> 10 MB)
  hasStoredFile?: boolean; // Penanda berkas fisik tersimpan utuh di Cloud Firestore
  tags: string[];
}

export interface DocumentFile {
  id: string;
  documentId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  dataUrl: string;
  isChunked?: boolean;
  chunkCount?: number;
  uploadedAt: string;
}

export interface DocumentFileChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  totalChunks: number;
  data: string;
}

export type ActivityAction =
  | 'LOGIN'
  | 'UPLOAD'
  | 'UPDATE_DOC'
  | 'RESUBMIT'
  | 'VERIFY'
  | 'APPROVE'
  | 'REVISION'
  | 'DELETE'
  | 'CONFIG'
  | 'RESTORE';

export interface ActivityLog {
  id: string;
  action: ActivityAction;
  actorName: string;
  actorRole: AppUserRole;
  targetTitle?: string;
  details: string;
  timestamp: string;
}

export type AppUserRole = 'waka_kurikulum' | 'guru';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: AppUserRole;
  baseRole?: AppUserRole;
  teacherId?: string;
  nip?: string;
  subject?: string;
  photoUrl?: string;
}

export interface Teacher {
  id: string;
  name: string;
  nip: string;
  subject: string;
  avatarUrl?: string;
  email: string;
  isHomeroomTeacher?: boolean;
  homeroomClass?: string;
}

export interface SchoolAnnouncement {
  id: string;
  title: string;
  content: string;
  date: string;
  category?: 'penting' | 'jadwal' | 'panduan' | 'edaran';
}

export interface SchoolProfile {
  name: string;
  npsn: string;
  accreditation: string;
  level: string; // SMP / SMA / SMK / SD
  regionalGovernment: string; // e.g. "PEMERINTAH DAERAH KHUSUS IBUKOTA JAKARTA"
  educationDepartment: string; // e.g. "DINAS PENDIDIKAN"
  address: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  headmasterName: string;
  headmasterNip: string;
  curriculumViceName: string; // Waka Kurikulum
  curriculumViceNip: string;
  curriculumViceSubject?: string; // Mata pelajaran yang diampu Waka Kurikulum (opsional)
  currentAcademicYear: string;
  currentSemester: SemesterType;
  wakaPin?: string; // PIN keamanan khusus Waka Kurikulum (default: 123456)
  schoolLogoUrl?: string; // Base64 data URL or external asset
  pemdaLogoUrl?: string; // Base64 data URL or external asset
  wakaSignatureUrl?: string; // Tanda tangan / paraf Waka Kurikulum
  headmasterSignatureUrl?: string; // Tanda tangan & stempel Kepala Sekolah
  schoolVision?: string; // Visi sekolah yang tampil di landing page login
  schoolMission?: string[]; // Daftar poin misi sekolah di landing page login
  announcements?: SchoolAnnouncement[]; // Informasi & pengumuman kurikulum untuk guru
}

export interface AutoExtractionResult {
  fileName: string;
  fileSize: number;
  detectedTitle: string;
  detectedCategory: DocumentCategory;
  detectedSubject: string;
  detectedGrade: GradeLevel;
  detectedSemester: SemesterType;
  detectedCurriculum: CurriculumType;
  detectedJp: number;
  detectedCompetencies: string[];
  confidenceScore: number; // 0 to 100
  sampleSnippet?: string;
  rawText?: string;
}
