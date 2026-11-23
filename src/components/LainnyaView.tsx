import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  CurriculumDocument, SemesterType, Teacher, CategoryItem, VerificationStatus,
  AppUser, AppUserRole, DocumentFile, SchoolProfile
} from '../types/curriculum';
import { CategoryManagementView } from './CategoryManagementView';
import {
  Plus, Search, Calendar, CheckCircle2, ShieldCheck, Clock, AlertTriangle,
  Eye, Pencil, Printer, Trash2, UploadCloud, FolderArchive, X, FolderKanban, ListFilter
} from 'lucide-react';

const MAX_CLOUD_FILE_BYTES = 10 * 1024 * 1024;
const SCHOOL_GENERAL_OWNER_ID = 'umum-sekolah';

function readFileDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (file.size === 0 || file.size > MAX_CLOUD_FILE_BYTES) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

interface LainnyaViewProps {
  userRole: AppUserRole;
  currentUser: AppUser;
  teachers: Teacher[];
  documents: CurriculumDocument[];
  categories: CategoryItem[];
  profile: SchoolProfile;
  currentSemester: SemesterType;
  academicYear: string;
  onSemesterChange: (sem: SemesterType) => void;
  onAcademicYearChange: (year: string) => void;
  onSaveDocuments: (newDocs: CurriculumDocument[], attachedFiles?: DocumentFile[]) => Promise<void> | void;
  onSelectDocument: (doc: CurriculumDocument) => void;
  onEditDocument: (doc: CurriculumDocument) => void;
  onDeleteDocument: (docId: string) => void;
  onPrintValidationSheet: (doc: CurriculumDocument) => void;
  onUpdateDocumentStatus: (docId: string, status: VerificationStatus, notes: string) => void;
  onAddCategory: (cat: CategoryItem) => void;
  onUpdateCategory: (cat: CategoryItem) => void;
  onDeleteCategory: (catId: string) => void;
  externalUploadTrigger?: number;
}

export const LainnyaView: React.FC<LainnyaViewProps> = ({
  userRole,
  currentUser,
  teachers,
  documents,
  categories,
  profile,
  currentSemester,
  academicYear,
  onSemesterChange,
  onAcademicYearChange,
  onSaveDocuments,
  onSelectDocument,
  onEditDocument,
  onDeleteDocument,
  onPrintValidationSheet,
  onUpdateDocumentStatus,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  externalUploadTrigger = 0
}) => {
  const isGuru = userRole === 'guru';
  const [subTab, setSubTab] = useState<'list' | 'categories'>('list');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<{ id: string; title: string } | null>(null);

  // Upload modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formCategory, setFormCategory] = useState<string>(categories[0]?.id || 'lain_sk_tugas');
  const [formOwnerId, setFormOwnerId] = useState<string>(
    isGuru ? currentUser.teacherId || '' : SCHOOL_GENERAL_OWNER_ID
  );
  const [formTitle, setFormTitle] = useState<string>('');
  const [formReferenceNo, setFormReferenceNo] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (externalUploadTrigger > 0) {
      openUploadModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalUploadTrigger]);

  const openUploadModal = () => {
    setFormCategory(categories[0]?.id || 'lain_sk_tugas');
    setFormOwnerId(isGuru ? currentUser.teacherId || teachers[0]?.id || '' : SCHOOL_GENERAL_OWNER_ID);
    setFormTitle('');
    setFormReferenceNo('');
    setFormDescription('');
    setFormFile(null);
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsModalOpen(true);
  };

  const uniqueTeachers = useMemo(() => {
    const map = new Map<string, Teacher>();
    teachers.forEach((t) => {
      const key = `${t.name.toLowerCase()}__${t.nip}`;
      if (!map.has(key)) map.set(key, t);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }, [teachers]);

  const periodDocs = useMemo(() => {
    return documents.filter(
      (d) => d.academicYear === academicYear && d.semester === currentSemester
    );
  }, [documents, academicYear, currentSemester]);

  const filteredDocs = useMemo(() => {
    return periodDocs
      .filter((doc) => {
        if (selectedCategory !== 'all' && doc.category !== selectedCategory) return false;
        if (!isGuru && selectedOwnerFilter !== 'all') {
          if (selectedOwnerFilter === SCHOOL_GENERAL_OWNER_ID) {
            if (doc.teacherId !== SCHOOL_GENERAL_OWNER_ID) return false;
          } else {
            const target = uniqueTeachers.find((t) => t.id === selectedOwnerFilter);
            const matchesId = doc.teacherId === selectedOwnerFilter;
            const matchesName =
              target && doc.teacherName.toLowerCase() === target.name.toLowerCase();
            if (!matchesId && !matchesName) return false;
          }
        }
        if (selectedStatus !== 'all' && doc.status !== selectedStatus) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            doc.title.toLowerCase().includes(q) ||
            doc.teacherName.toLowerCase().includes(q) ||
            doc.originalFileName.toLowerCase().includes(q) ||
            (doc.contentPreview || '').toLowerCase().includes(q) ||
            doc.tags.some((t) => t.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => (b.uploadDate || '').localeCompare(a.uploadDate || ''));
  }, [periodDocs, selectedCategory, selectedOwnerFilter, selectedStatus, searchQuery, isGuru, uniqueTeachers]);

  const stats = useMemo(() => {
    const total = periodDocs.length;
    const usedCategories = new Set(periodDocs.map((d) => d.category)).size;
    const pending = periodDocs.filter((d) => d.status === 'diajukan').length;
    const approved = periodDocs.filter(
      (d) => d.status === 'diverifikasi' || d.status === 'disahkan'
    ).length;
    return { total, usedCategories, pending, approved };
  }, [periodDocs]);

  const handleSaveUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setFormError(null);

    if (!formTitle.trim() && !formFile) {
      setFormError('Masukkan judul dokumen atau pilih berkas yang akan diarsipkan.');
      return;
    }

    if (formFile && formFile.size === 0) {
      setFormError(`Berkas "${formFile.name}" kosong (0 byte).`);
      return;
    }

    if (formFile && formFile.size > MAX_CLOUD_FILE_BYTES) {
      setFormError(`Berkas "${formFile.name}" melebihi batas maksimal 10 MB.`);
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const cat = categories.find((c) => c.id === formCategory);
      const catCode = cat?.code || 'LAINNYA';
      const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
      const docId = `lain-${Date.now()}-${suffix.toLowerCase()}`;
      const regNumber =
        formReferenceNo.trim() ||
        `REG-LAIN/${academicYear.substring(0, 4)}/${catCode}-${suffix}`;

      const isSchoolGeneral = !isGuru && formOwnerId === SCHOOL_GENERAL_OWNER_ID;
      const chosenTeacher = isSchoolGeneral
        ? null
        : (isGuru && currentUser.teacherId
            ? teachers.find((t) => t.id === currentUser.teacherId)
            : teachers.find((t) => t.id === formOwnerId)) ||
          (isGuru
            ? {
                id: currentUser.teacherId || currentUser.uid,
                name: currentUser.displayName,
                nip: currentUser.nip || '-',
                subject: currentUser.subject || 'Guru Mapel',
                email: currentUser.email
              }
            : null);

      const ownerId = isSchoolGeneral
        ? SCHOOL_GENERAL_OWNER_ID
        : chosenTeacher?.id || currentUser.uid;
      const ownerName = isSchoolGeneral
        ? `${profile.curriculumViceName} (Arsip Umum Sekolah)`
        : chosenTeacher?.name || currentUser.displayName;
      const ownerNip = isSchoolGeneral
        ? profile.curriculumViceNip || '-'
        : chosenTeacher?.nip || '-';
      const ownerEmail = isSchoolGeneral ? profile.email : chosenTeacher?.email;

      let hasStoredFile = false;
      const attachedFiles: DocumentFile[] = [];
      if (formFile) {
        const dataUrl = await readFileDataUrl(formFile);
        if (dataUrl) {
          hasStoredFile = true;
          attachedFiles.push({
            id: docId,
            documentId: docId,
            fileName: formFile.name.slice(0, 255),
            mimeType: (formFile.type || 'application/octet-stream').slice(0, 120),
            fileSize: formFile.size,
            dataUrl,
            uploadedAt: now
          });
        }
      }

      const cleanTitle =
        formTitle.trim() ||
        (formFile
          ? formFile.name.replace(/\.[^.]+$/, '')
          : `${cat?.name || 'Arsip Lainnya'} - ${ownerName}`);

      const newDoc: CurriculumDocument = {
        id: docId,
        title: cleanTitle,
        originalFileName: formFile ? formFile.name.slice(0, 255) : `${cleanTitle.slice(0, 80)}.pdf`,
        fileSize: formFile ? formFile.size : 0,
        fileType: formFile
          ? (formFile.name.split('.').pop()?.toLowerCase() || 'file').slice(0, 20)
          : 'arsip',
        category: formCategory,
        archiveScope: 'lainnya',
        subject: cat?.name || 'Arsip Lainnya',
        grade: '7.1',
        semester: currentSemester,
        academicYear,
        curriculumType: 'Kurikulum Merdeka',
        teacherId: ownerId,
        teacherName: ownerName,
        teacherNip: ownerNip,
        teacherEmail: ownerEmail,
        alokasiJp: 0,
        uploadDate: now,
        lastModified: now,
        status: isGuru ? 'diajukan' : 'disahkan',
        supervisorNotes:
          formDescription.trim() ||
          (isGuru
            ? 'Diarsipkan pada menu Lainnya (di luar Adm Guru, Surat Izin, dan Arsip Wali Kelas).'
            : 'Diarsipkan oleh Waka Kurikulum pada menu Arsip Lainnya.'),
        approvalNumber: regNumber,
        contentPreview:
          formDescription.trim() ||
          `Arsip ${cat?.name || 'Lainnya'} (${ownerName}) untuk Semester ${
            currentSemester === 'ganjil' ? 'Ganjil' : 'Genap'
          } TP ${academicYear}.`,
        hasStoredFile,
        tags: ['Arsip Lainnya', catCode, isSchoolGeneral ? 'Umum Sekolah' : 'Guru']
      };

      await onSaveDocuments([newDoc], attachedFiles);
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const renderStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'disahkan':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Disahkan Kepsek
          </span>
        );
      case 'diverifikasi':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Terverifikasi Waka
          </span>
        );
      case 'diajukan':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Menunggu Telaah
          </span>
        );
      case 'perlu_revisi':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Perlu Revisi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-indigo-700">
            <span>Arsip Guru</span>
            <span aria-hidden="true">/</span>
            <span>Arsip di Luar Adm Guru, Surat Izin &amp; Wali Kelas</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Arsip Lainnya
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Simpan dokumen pendukung guru dan sekolah di luar perangkat ajar, surat izin, maupun administrasi wali kelas—seperti SK Tugas, Sertifikat Diklat/PMM, PKG/SKP, Ekstrakurikuler, dan Notulen Rapat.
          </p>
        </div>

        <button
          type="button"
          onClick={openUploadModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Unggah Arsip Lainnya</span>
        </button>
      </div>

      {/* Sub-Tabs (List vs Manage Categories for Waka) */}
      {!isGuru && (
        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setSubTab('list')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
              subTab === 'list'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Daftar Arsip ({periodDocs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('categories')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
              subTab === 'categories'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Kelola Kategori Lainnya ({categories.length})</span>
          </button>
        </div>
      )}

      {!isGuru && subTab === 'categories' ? (
        <CategoryManagementView
          scope="lainnya"
          categories={categories}
          onAddCategory={onAddCategory}
          onUpdateCategory={onUpdateCategory}
          onDeleteCategory={onDeleteCategory}
        />
      ) : (
        <>
          {/* Stats Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-medium text-slate-500">Total Arsip Lainnya</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {stats.total}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Sem. {currentSemester === 'ganjil' ? 'Ganjil' : 'Genap'} · {academicYear}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-medium text-indigo-700">Jenis Kategori Terisi</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-indigo-700 mt-1">
                {stats.usedCategories} / {categories.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Klasifikasi dokumen</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-medium text-amber-700">Menunggu Telaah</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1">
                {stats.pending}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Perlu verifikasi</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-medium text-emerald-700">Terverifikasi / Sah</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                {stats.approved}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Arsip tervalidasi</div>
            </div>
          </div>

          {/* Search, Filter & List Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari judul SK, sertifikat, kegiatan, atau nama guru..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={academicYear}
                      onChange={(e) => onAcademicYearChange(e.target.value)}
                      className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="2026/2027">2026/2027</option>
                      <option value="2025/2026">2025/2026</option>
                      <option value="2024/2025">2024/2025</option>
                      <option value="2023/2024">2023/2024</option>
                    </select>
                  </div>

                  <div className="inline-flex p-0.5 bg-slate-200/70 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => onSemesterChange('ganjil')}
                      className={`px-3 py-1 font-semibold rounded-md transition-colors cursor-pointer ${
                        currentSemester === 'ganjil'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Ganjil
                    </button>
                    <button
                      type="button"
                      onClick={() => onSemesterChange('genap')}
                      className={`px-3 py-1 font-semibold rounded-md transition-colors cursor-pointer ${
                        currentSemester === 'genap'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Genap
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">Semua Kategori Lainnya</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.code})
                    </option>
                  ))}
                </select>

                {!isGuru && (
                  <select
                    value={selectedOwnerFilter}
                    onChange={(e) => setSelectedOwnerFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">Semua Pemilik / Guru</option>
                    <option value={SCHOOL_GENERAL_OWNER_ID}>Arsip Umum Sekolah</option>
                    {uniqueTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">Semua Status</option>
                  <option value="diajukan">Menunggu Telaah</option>
                  <option value="diverifikasi">Terverifikasi Waka</option>
                  <option value="disahkan">Disahkan Kepsek</option>
                  <option value="perlu_revisi">Perlu Revisi</option>
                </select>
              </div>
            </div>

            {filteredDocs.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FolderArchive className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-800">
                  Belum ada dokumen Arsip Lainnya pada periode ini
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Arsipkan SK Tugas, Sertifikat Diklat/PMM, SKP/PKG, program ekstrakurikuler, notulen rapat, atau dokumen penting lainnya di sini.
                </p>
                <button
                  type="button"
                  onClick={openUploadModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Unggah Arsip Lainnya</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Kategori &amp; Judul Dokumen</th>
                      <th className="py-3 px-4">Pemilik / Penanggung Jawab</th>
                      <th className="py-3 px-4">No. Registrasi / Berkas</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDocs.map((doc) => {
                      const cat = categories.find((c) => c.id === doc.category);
                      return (
                        <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 align-top max-w-md">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 mb-0.5">
                              <span className="font-mono">{cat?.code || 'LAINNYA'}</span>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{cat?.name || doc.category}</span>
                            </div>
                            <div className="font-bold text-slate-900">{doc.title}</div>
                            {doc.contentPreview && (
                              <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {doc.contentPreview}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 align-top">
                            <div className="font-semibold text-slate-900">{doc.teacherName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              NIP. {doc.teacherNip || '-'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 align-top">
                            <div className="font-mono text-[11px] text-slate-700 font-semibold">
                              {doc.approvalNumber || '-'}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[200px]">
                              {doc.hasStoredFile ? doc.originalFileName : 'Tanpa lampiran fisik'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 align-top whitespace-nowrap">
                            {renderStatusBadge(doc.status)}
                          </td>

                          <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1">
                              {!isGuru && doc.status === 'diajukan' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateDocumentStatus(
                                      doc.id,
                                      'disahkan',
                                      'Arsip lainnya terverifikasi dan disahkan.'
                                    )
                                  }
                                  className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                                >
                                  Sahkan
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => onSelectDocument(doc)}
                                title="Lihat & Pratinjau"
                                className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onEditDocument(doc)}
                                title="Edit"
                                className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onPrintValidationSheet(doc)}
                                title="Cetak Lembar Pengesahan"
                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {confirmDeleteDoc?.id === doc.id ? (
                                <div className="inline-flex items-center gap-1 ml-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteDocument(doc.id);
                                      setConfirmDeleteDoc(null);
                                    }}
                                    className="px-2 py-1 text-[10px] font-bold bg-rose-600 text-white rounded hover:bg-rose-700 cursor-pointer"
                                  >
                                    Hapus
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteDoc(null)}
                                    className="px-2 py-1 text-[10px] font-medium bg-slate-100 text-slate-600 rounded hover:bg-slate-200 cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteDoc({ id: doc.id, title: doc.title })}
                                  title="Hapus"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Unggah Arsip Lainnya */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-700 text-white flex items-center justify-center shrink-0">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Unggah Dokumen Arsip Lainnya
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Arsip di luar Adm Guru, Surat Izin Guru, dan Arsip Wali Kelas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUpload} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kategori Arsip Lainnya *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Pemilik / Penanggung Jawab *
                  </label>
                  {isGuru ? (
                    <input
                      type="text"
                      readOnly
                      value={currentUser.displayName}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-700"
                    />
                  ) : (
                    <select
                      value={formOwnerId}
                      onChange={(e) => setFormOwnerId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                    >
                      <option value={SCHOOL_GENERAL_OWNER_ID}>
                        Arsip Umum Sekolah (Waka / Kolektif)
                      </option>
                      {uniqueTeachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.subject})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Judul Dokumen *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Contoh: SK Pembagian Tugas Semester Ganjil / Sertifikat PMM"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nomor SK / Arsip (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formReferenceNo}
                    onChange={(e) => setFormReferenceNo(e.target.value)}
                    placeholder="Opsional"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Deskripsi / Catatan Singkat
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Keterangan tambahan mengenai isi atau kegunaan dokumen ini..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pilih Berkas Dokumen (PDF, Word, Excel, PPT, Foto · Maks 10 MB)
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4 text-indigo-600" />
                    <span>{formFile ? 'Ganti Berkas' : 'Pilih Berkas dari Perangkat'}</span>
                  </button>
                  {formFile && (
                    <span className="text-[11px] font-medium text-emerald-700 truncate">
                      {formFile.name} ({Math.round(formFile.size / 1024)} KB)
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 font-bold text-white bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan ke Arsip Lainnya'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
