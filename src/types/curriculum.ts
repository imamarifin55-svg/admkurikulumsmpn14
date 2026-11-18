/**
 * Types for School Curriculum Archival & Syllabus Management System
 */

export type SemesterType = 'ganjil' | 'genap';

export type GradeLevel = '7' | '8' | '9' | '10' | '11' | '12';

export type CurriculumType = 'Kurikulum Merdeka' | 'Kurikulum 2013';

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
  | string;            // Custom categories added by school admin

export interface CategoryItem {
  id: string;
  code: string; // e.g. "ATP", "MA", "PROMES"
  name: string; // e.g. "Silabus / ATP (Alur Tujuan Pembelajaran)"
  defaultJp: number; // default Jam Pelajaran
  description?: string;
  isSupervisedInMatrix: boolean; // whether this appears as a monitored column in the teacher matrix
  isSystemDefault?: boolean;
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
