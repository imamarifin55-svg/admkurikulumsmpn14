import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  CurriculumDocument, SemesterType, Teacher, CategoryItem, VerificationStatus,
  AppUser, AppUserRole, DocumentFile, SchoolProfile
} from '../types/curriculum';
import {
  Plus, Search, Calendar, Clock, CheckCircle2, ShieldCheck, AlertTriangle,
  Eye, Pencil, Printer, Trash2, UploadCloud, FileText, X, UserCheck
} from 'lucide-react';

const MAX_CLOUD_FILE_BYTES = 10 * 1024 * 1024;

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

function calcDaysInclusive(start?: string, end?: string): number {
  if (!start) return 1;
  const s = new Date(start);
  const e = new Date(end || start);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diff);
}

function formatDateId(dateStr?: string): string {
  if (!dateStr) return '-';
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

interface SuratIzinViewProps {
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
  externalUploadTrigger?: number;
}

export const SuratIzinView: React.FC<SuratIzinViewProps> = ({
  userRole,
  currentUser,
  teachers,
  documents,
  categories,
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
  externalUploadTrigger = 0
}) => {
  const isGuru = userRole === 'guru';
  const todayIso = new Date().toISOString().slice(0, 10);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<{ id: string; title: string } | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTeacherId, setFormTeacherId] = useState<string>(
    currentUser.teacherId || teachers[0]?.id || ''
  );
  const [formCategory, setFormCategory] = useState<string>(categories[0]?.id || 'izin_sakit');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formStartDate, setFormStartDate] = useState<string>(todayIso);
  const [formEndDate, setFormEndDate] = useState<string>(todayIso);
  const [formAffectedClasses, setFormAffectedClasses] = useState<string>('');
  const [formSubstituteTeacher, setFormSubstituteTeacher] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (externalUploadTrigger > 0) {
      openCreateModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalUploadTrigger]);

  const openCreateModal = () => {
    setFormTeacherId(
      isGuru
        ? currentUser.teacherId || teachers[0]?.id || ''
        : teachers[0]?.id || ''
    );
    setFormCategory(categories[0]?.id || 'izin_sakit');
    setFormTitle('');
    setFormStartDate(todayIso);
    setFormEndDate(todayIso);
    setFormAffectedClasses('');
    setFormSubstituteTeacher('');
    setFormNotes('');
    setFormFile(null);
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsModalOpen(true);
  };

  // Deduplicated teachers list by name + NIP for filters
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
        if (!isGuru && selectedTeacherFilter !== 'all') {
          const target = uniqueTeachers.find((t) => t.id === selectedTeacherFilter);
          const matchesId = doc.teacherId === selectedTeacherFilter;
          const matchesName =
            target && doc.teacherName.toLowerCase() === target.name.toLowerCase();
          if (!matchesId && !matchesName) return false;
        }
        if (selectedStatus !== 'all' && doc.status !== selectedStatus) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            doc.title.toLowerCase().includes(q) ||
            doc.teacherName.toLowerCase().includes(q) ||
            (doc.substituteTeacher || '').toLowerCase().includes(q) ||
            (doc.affectedClasses || '').toLowerCase().includes(q) ||
            (doc.contentPreview || '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => (b.uploadDate || '').localeCompare(a.uploadDate || ''));
  }, [periodDocs, selectedCategory, selectedTeacherFilter, selectedStatus, searchQuery, isGuru, uniqueTeachers]);

  const stats = useMemo(() => {
    const total = periodDocs.length;
    const pending = periodDocs.filter((d) => d.status === 'diajukan').length;
    const approved = periodDocs.filter(
      (d) => d.status === 'diverifikasi' || d.status === 'disahkan'
    ).length;
    const revision = periodDocs.filter((d) => d.status === 'perlu_revisi').length;
    return { total, pending, approved, revision };
  }, [periodDocs]);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setFormError(null);

    const chosenTeacher =
      (isGuru && currentUser.teacherId
        ? teachers.find((t) => t.id === currentUser.teacherId)
        : teachers.find((t) => t.id === formTeacherId)) ||
      (isGuru
        ? {
            id: currentUser.teacherId || currentUser.uid,
            name: currentUser.displayName,
            nip: currentUser.nip || '-',
            subject: currentUser.subject || 'Guru Mapel',
            email: currentUser.email
          }
        : undefined);

    if (!chosenTeacher) {
      setFormError('Pilih nama guru terlebih dahulu. Surat izin ini khusus untuk guru.');
      return;
    }

    if (!formStartDate) {
      setFormError('Tanggal mulai izin wajib diisi.');
      return;
    }

    const effectiveEndDate =
      formEndDate && formEndDate >= formStartDate ? formEndDate : formStartDate;

    if (formFile && formFile.size > MAX_CLOUD_FILE_BYTES) {
      setFormError('Ukuran file lampiran maksimal 10 MB.');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const cat = categories.find((c) => c.id === formCategory);
      const catCode = cat?.code || 'IZIN';
      const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
      const docId = `izin-${Date.now()}-${suffix.toLowerCase()}`;
      const regNumber = `REG-IZIN/${academicYear.substring(0, 4)}/${catCode}-${suffix}`;
      const daysCount = calcDaysInclusive(formStartDate, effectiveEndDate);

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

      const defaultTitle = `${cat?.name || 'Surat Izin Guru'} - ${chosenTeacher.name} (${formatDateId(formStartDate)})`;
      const summaryParts = [
        `Pengajuan ${cat?.name || 'Surat Izin Guru'} atas nama ${chosenTeacher.name} (${chosenTeacher.subject || 'Guru'}).`,
        `Tanggal: ${formatDateId(formStartDate)}${effectiveEndDate !== formStartDate ? ` s.d. ${formatDateId(effectiveEndDate)}` : ''} (${daysCount} hari).`,
        formAffectedClasses.trim() ? `Kelas/Jam terdampak: ${formAffectedClasses.trim()}.` : '',
        formSubstituteTeacher.trim() ? `Guru pengganti/piket: ${formSubstituteTeacher.trim()}.` : '',
        formNotes.trim() ? `Keterangan: ${formNotes.trim()}` : ''
      ].filter(Boolean);

      const newDoc: CurriculumDocument = {
        id: docId,
        title: formTitle.trim() || defaultTitle,
        originalFileName: formFile ? formFile.name.slice(0, 255) : 'Formulir_Surat_Izin_Guru.pdf',
        fileSize: formFile ? formFile.size : 0,
        fileType: formFile
          ? (formFile.name.split('.').pop()?.toLowerCase() || 'pdf').slice(0, 20)
          : 'formulir',
        category: formCategory,
        archiveScope: 'surat_izin',
        leaveStartDate: formStartDate,
        leaveEndDate: effectiveEndDate,
        substituteTeacher: formSubstituteTeacher.trim() || undefined,
        affectedClasses: formAffectedClasses.trim() || undefined,
        subject: chosenTeacher.subject || 'Guru Mata Pelajaran',
        grade: '7.1',
        semester: currentSemester,
        academicYear,
        curriculumType: 'Kurikulum Merdeka',
        teacherId: chosenTeacher.id,
        teacherName: chosenTeacher.name,
        teacherNip: chosenTeacher.nip || '-',
        teacherEmail: chosenTeacher.email,
        alokasiJp: 0,
        uploadDate: now,
        lastModified: now,
        status: 'diajukan',
        supervisorNotes: formNotes.trim() || 'Diajukan oleh Guru. Menunggu telaah Waka Kurikulum.',
        approvalNumber: regNumber,
        contentPreview: summaryParts.join(' '),
        hasStoredFile,
        tags: ['Surat Izin Guru', catCode, `${daysCount} Hari`]
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
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Disetujui Waka
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
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-indigo-700">
            <span>Arsip Guru</span>
            <span aria-hidden="true">/</span>
            <span>Khusus untuk Guru (Bukan Peserta Didik)</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Surat Izin Guru
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            {isGuru
              ? 'Ajukan dan arsipkan surat izin sakit, cuti, dinas luar, pelatihan/MGMP, atau keperluan pribadi beserta guru pengganti dan lampiran surat.'
              : 'Pantau, telaah, dan arsipkan seluruh pengajuan surat izin guru pada periode berjalan. Hanya diperuntukkan bagi tenaga pendidik/guru.'}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{isGuru ? 'Ajukan Surat Izin' : 'Catat Surat Izin Guru'}</span>
        </button>
      </div>

      {/* 4-Column Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#062448] via-[#0a4573] to-[#0e6a94] rounded-xl border border-sky-300/25 p-4 shadow-sm text-white">
          <div className="text-xs font-medium text-sky-100/90">Total Surat Izin</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white mt-1">
            {stats.total}
          </div>
          <div className="text-[11px] text-sky-200/80 mt-0.5">
            Sem. {currentSemester === 'ganjil' ? 'Ganjil' : 'Genap'} · {academicYear}
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#093660] via-[#0b5485] to-[#0f769a] rounded-xl border border-sky-300/25 p-4 shadow-sm text-white">
          <div className="text-xs font-medium text-sky-100/90">Menunggu Telaah</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-300 mt-1">
            {stats.pending}
          </div>
          <div className="text-[11px] text-sky-200/80 mt-0.5">Perlu tinjauan Waka</div>
        </div>

        <div className="bg-gradient-to-br from-[#0a4170] via-[#0d6291] to-[#1281a3] rounded-xl border border-sky-300/25 p-4 shadow-sm text-white">
          <div className="text-xs font-medium text-sky-100/90">Disetujui / Disahkan</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-300 mt-1">
            {stats.approved}
          </div>
          <div className="text-[11px] text-sky-200/80 mt-0.5">Terverifikasi resmi</div>
        </div>

        <div className="bg-gradient-to-br from-[#08385e] via-[#0c567d] to-[#0e7490] rounded-xl border border-cyan-300/25 p-4 shadow-sm text-white">
          <div className="text-xs font-medium text-sky-100/90">Perlu Revisi</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-rose-200 mt-1">
            {stats.revision}
          </div>
          <div className="text-[11px] text-sky-200/80 mt-0.5">Menunggu perbaikan berkas</div>
        </div>
      </div>

      {/* Filters & Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama guru, perihal izin, kelas terdampak, atau guru pengganti..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Period Switcher */}
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
              <option value="all">Semua Jenis Izin Guru</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.code})
                </option>
              ))}
            </select>

            {!isGuru && (
              <select
                value={selectedTeacherFilter}
                onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">Semua Guru</option>
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
              <option value="diverifikasi">Disetujui Waka</option>
              <option value="disahkan">Disahkan Kepsek</option>
              <option value="perlu_revisi">Perlu Revisi</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800">
              Belum ada arsip Surat Izin Guru pada periode ini
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Gunakan tombol di bawah untuk mengarsipkan atau mengajukan surat izin sakit, cuti, dinas luar, atau pelatihan khusus guru.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isGuru ? 'Ajukan Surat Izin Pertama' : 'Catat Surat Izin Guru'}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Guru</th>
                  <th className="py-3 px-4">Jenis &amp; Perihal Izin</th>
                  <th className="py-3 px-4">Tanggal &amp; Durasi</th>
                  <th className="py-3 px-4">Kelas &amp; Guru Pengganti</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc) => {
                  const cat = categories.find((c) => c.id === doc.category);
                  const days = calcDaysInclusive(doc.leaveStartDate, doc.leaveEndDate);
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-slate-900">{doc.teacherName}</div>
                        <div className="text-[11px] text-slate-500">
                          {doc.subject} · <span className="font-mono">NIP. {doc.teacherNip || '-'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top max-w-xs">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 mb-0.5">
                          <span className="font-mono">{cat?.code || 'IZIN'}</span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{cat?.name || doc.category}</span>
                        </div>
                        <div className="font-semibold text-slate-900 line-clamp-2">{doc.title}</div>
                        {doc.hasStoredFile && (
                          <div className="text-[11px] text-emerald-700 mt-0.5 truncate">
                            Lampiran: {doc.originalFileName}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="font-semibold text-slate-800 font-mono tabular-nums">
                          {formatDateId(doc.leaveStartDate || doc.uploadDate)}
                        </div>
                        {doc.leaveEndDate && doc.leaveEndDate !== doc.leaveStartDate && (
                          <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                            s.d. {formatDateId(doc.leaveEndDate)}
                          </div>
                        )}
                        <div className="text-[11px] font-semibold text-slate-600 mt-0.5 tabular-nums">
                          {days} Hari Kerja
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <div className="text-slate-800 font-medium">
                          {doc.affectedClasses || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Pengganti: {doc.substituteTeacher || '-'}
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
                                  'diverifikasi',
                                  'Surat izin guru disetujui Waka Kurikulum.'
                                )
                              }
                              title="Setujui Surat Izin"
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                            >
                              Setujui
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onSelectDocument(doc)}
                            title="Lihat & Telaah"
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
                            title="Cetak Bukti Pengesahan"
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

      {/* Modal Form Pengajuan / Arsip Surat Izin Guru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-700 text-white flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {isGuru ? 'Ajukan Surat Izin Guru' : 'Catat / Arsipkan Surat Izin Guru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Khusus untuk tenaga pendidik / guru · Tersimpan ke Cloud Real-Time
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

            <form onSubmit={handleSubmitLeave} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Guru Pemohon *
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
                      value={formTeacherId}
                      onChange={(e) => setFormTeacherId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                    >
                      {uniqueTeachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.subject})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jenis Surat Izin *
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
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Perihal / Judul Surat Izin
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Surat Izin Sakit 2 Hari / Surat Tugas MGMP Matematika"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Mulai Izin *
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => {
                      setFormStartDate(e.target.value);
                      if (formEndDate < e.target.value) setFormEndDate(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Selesai Izin
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    min={formStartDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kelas &amp; Jam Terdampak (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formAffectedClasses}
                    onChange={(e) => setFormAffectedClasses(e.target.value)}
                    placeholder="Contoh: Kelas 7.1, 7.2 (Jam 1-4)"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Guru Pengganti / Piket (Opsional)
                  </label>
                  <input
                    type="text"
                    list="surat-izin-substitute-teachers"
                    value={formSubstituteTeacher}
                    onChange={(e) => setFormSubstituteTeacher(e.target.value)}
                    placeholder="Nama guru pengganti / tugas mandiri"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                  <datalist id="surat-izin-substitute-teachers">
                    {uniqueTeachers.map((t) => (
                      <option key={t.id} value={t.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Keterangan / Alasan &amp; Titipan Tugas Kelas
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Tuliskan alasan izin atau catatan tugas siswa selama guru berhalangan..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Lampiran Surat Izin / Surat Dokter / Surat Tugas (PDF, Foto, DOCX · Maks 10 MB)
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                    onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4 text-indigo-600" />
                    <span>{formFile ? 'Ganti Berkas Lampiran' : 'Pilih Berkas Surat (Opsional)'}</span>
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
                  {isSaving ? 'Menyimpan...' : 'Simpan & Ajukan Surat Izin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
