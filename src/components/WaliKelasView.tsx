import React, { useState, useMemo } from 'react';
import {
  LayoutGrid, ListFilter, ShieldCheck, UploadCloud,
  Search, Eye, Pencil, Trash2, Printer, CheckCircle2, AlertTriangle,
  Clock, Plus, CheckCheck, Users, FileText
} from 'lucide-react';
import {
  AppUserRole, CategoryItem, CurriculumDocument, SemesterType, Teacher, VerificationStatus
} from '../types/curriculum';
import { HomeroomEntry } from './WalasUploadModal';

interface WaliKelasViewProps {
  userRole: AppUserRole;
  teachers: Teacher[];
  documents: CurriculumDocument[];
  walasCategories: CategoryItem[];
  currentSemester: SemesterType;
  academicYear: string;
  onSemesterChange: (sem: SemesterType) => void;
  onAcademicYearChange: (year: string) => void;
  activeHomeroomClass?: string | null;
  onOpenWalasUpload: (homeroomClass?: string | null, categoryId?: string | null) => void;
  onSelectDocument: (doc: CurriculumDocument) => void;
  onEditDocument: (doc: CurriculumDocument) => void;
  onDeleteDocument: (docId: string) => void;
  onPrintValidationSheet: (doc: CurriculumDocument) => void;
  onUpdateDocumentStatus: (docId: string, newStatus: VerificationStatus, supervisorNotes: string) => void;
  onBatchApproveWalas: () => void;
  onNavigateToTeachers?: () => void;
}

const STATUS_META: Record<VerificationStatus, { label: string; textClass: string; bgClass: string }> = {
  draft: {
    label: 'Draft',
    textClass: 'text-slate-700',
    bgClass: 'bg-slate-100 border-slate-200'
  },
  diajukan: {
    label: 'Menunggu Telaah',
    textClass: 'text-amber-800',
    bgClass: 'bg-amber-50 border-amber-200'
  },
  diverifikasi: {
    label: 'Terverifikasi Waka',
    textClass: 'text-indigo-800',
    bgClass: 'bg-indigo-50 border-indigo-200'
  },
  disahkan: {
    label: 'Disahkan Kepsek',
    textClass: 'text-emerald-800',
    bgClass: 'bg-emerald-50 border-emerald-200'
  },
  perlu_revisi: {
    label: 'Perlu Revisi',
    textClass: 'text-rose-800',
    bgClass: 'bg-rose-50 border-rose-200'
  }
};

export function buildHomeroomEntries(teachers: Teacher[]): HomeroomEntry[] {
  const byClass = new Map<string, Teacher>();
  teachers.forEach((t) => {
    const cls = (t.homeroomClass || '').trim().toUpperCase();
    if (t.isHomeroomTeacher && cls) {
      if (!byClass.has(cls)) {
        byClass.set(cls, { ...t, homeroomClass: cls });
      }
    }
  });
  return Array.from(byClass.entries())
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
    .map(([homeroomClass, teacher]) => ({ homeroomClass, teacher }));
}

export const WaliKelasView: React.FC<WaliKelasViewProps> = ({
  userRole,
  teachers,
  documents,
  walasCategories,
  currentSemester,
  academicYear,
  onSemesterChange,
  onAcademicYearChange,
  activeHomeroomClass,
  onOpenWalasUpload,
  onSelectDocument,
  onEditDocument,
  onDeleteDocument,
  onPrintValidationSheet,
  onUpdateDocumentStatus,
  onBatchApproveWalas,
  onNavigateToTeachers
}) => {
  const isWaka = userRole === 'waka_kurikulum';
  const [subTab, setSubTab] = useState<'matrix' | 'list' | 'supervision'>('matrix');

  // Filter & search states for List & Supervision tabs
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [pendingDeleteDoc, setPendingDeleteDoc] = useState<CurriculumDocument | null>(null);

  // Supervision inline review notes
  const [reviewDocId, setReviewDocId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');

  const allHomeroomEntries = useMemo(() => buildHomeroomEntries(teachers), [teachers]);
  const visibleEntries = useMemo(() => {
    if (isWaka) return allHomeroomEntries;
    const normalized = (activeHomeroomClass || '').trim().toUpperCase();
    return allHomeroomEntries.filter(e => e.homeroomClass === normalized);
  }, [isWaka, allHomeroomEntries, activeHomeroomClass]);

  const matrixCategories = useMemo(
    () => walasCategories.filter(c => c.isSupervisedInMatrix),
    [walasCategories]
  );

  // Documents scoped to active semester & academic year
  const periodDocs = useMemo(
    () => documents.filter(d => d.semester === currentSemester && d.academicYear === academicYear),
    [documents, currentSemester, academicYear]
  );

  const pendingCount = periodDocs.filter(d => d.status === 'diajukan').length;
  const verifiedCount = periodDocs.filter(d => d.status === 'diverifikasi').length;
  const approvedCount = periodDocs.filter(d => d.status === 'disahkan').length;
  const revisionDocs = periodDocs.filter(d => d.status === 'perlu_revisi');

  const totalCells = visibleEntries.length * matrixCategories.length;
  const filledCells = useMemo(() => {
    if (totalCells === 0) return 0;
    let filled = 0;
    visibleEntries.forEach((entry) => {
      matrixCategories.forEach((cat) => {
        const match = periodDocs.find(
          d =>
            (d.homeroomClass || '').toUpperCase() === entry.homeroomClass &&
            d.category === cat.id
        );
        if (match) filled++;
      });
    });
    return filled;
  }, [visibleEntries, matrixCategories, periodDocs, totalCells]);

  const completionPercent = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;

  const filteredListDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return periodDocs.filter((d) => {
      if (filterClass !== 'all' && (d.homeroomClass || '').toUpperCase() !== filterClass) return false;
      if (filterCategory !== 'all' && d.category !== filterCategory) return false;
      if (filterStatus !== 'all' && d.status !== filterStatus) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.teacherName.toLowerCase().includes(q) ||
        (d.homeroomClass || '').toLowerCase().includes(q) ||
        d.originalFileName.toLowerCase().includes(q)
      );
    });
  }, [periodDocs, filterClass, filterCategory, filterStatus, searchQuery]);

  const getCellDoc = (homeroomClass: string, categoryId: string): CurriculumDocument | undefined => {
    return periodDocs.find(
      d =>
        (d.homeroomClass || '').toUpperCase() === homeroomClass.toUpperCase() &&
        d.category === categoryId
    );
  };

  const getCategoryLabel = (catId: string) => {
    const found = walasCategories.find(c => c.id === catId);
    return found ? `${found.name} (${found.code})` : catId;
  };

  return (
    <div className="space-y-6 mb-8 text-xs">
      {/* Workspace Header & Period Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-emerald-700">Menu Khusus Wali Kelas</span>
              <span aria-hidden="true">·</span>
              <span>
                {isWaka
                  ? 'Pemantauan & Validasi Seluruh Kelas Binaan'
                  : `Kelas Binaan ${activeHomeroomClass || '-'}`}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">TP {academicYear}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
              {isWaka
                ? 'Arsip Administrasi Wali Kelas'
                : `Arsip Administrasi Wali Kelas ${activeHomeroomClass || ''}`}
            </h1>
            <p className="text-slate-500 mt-1 max-w-2xl">
              {isWaka
                ? 'Pantau kelengkapan administrasi kelas binaan, lakukan telaah dan pengesahan dokumen wali kelas, serta atur kategori khusus wali kelas di luar kategori kurikulum.'
                : 'Unggah dan kelola dokumen administrasi kelas binaan Anda secara terpisah dari perangkat ajar mata pelajaran, lengkap dengan pantauan status telaah dan pengesahan.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <select
              value={academicYear}
              onChange={(e) => onAcademicYearChange(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-600"
            >
              <option value="2026/2027">TP 2026/2027</option>
              <option value="2025/2026">TP 2025/2026</option>
              <option value="2024/2025">TP 2024/2025</option>
              <option value="2023/2024">TP 2023/2024</option>
            </select>

            <div className="inline-flex p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => onSemesterChange('ganjil')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  currentSemester === 'ganjil'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ganjil
              </button>
              <button
                type="button"
                onClick={() => onSemesterChange('genap')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  currentSemester === 'genap'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Genap
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenWalasUpload(isWaka ? null : activeHomeroomClass, null)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Unggah Arsip Walas</span>
            </button>
          </div>
        </div>

        {/* Summary Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 rounded-xl bg-gradient-to-r from-[#062448] via-[#0b4b7a] to-[#0e7490] border border-sky-300/25 p-4 text-white shadow-xs">
          <div>
            <div className="text-[11px] text-sky-100/85 font-medium">Kelengkapan Matriks</div>
            <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
              {completionPercent}% <span className="text-xs font-normal text-sky-200/85">({filledCells}/{totalCells})</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-sky-100/85 font-medium">Menunggu Telaah</div>
            <div className="text-lg font-bold text-amber-300 font-mono tabular-nums mt-0.5">
              {pendingCount} berkas
            </div>
          </div>
          <div>
            <div className="text-[11px] text-sky-100/85 font-medium">Terverifikasi Waka</div>
            <div className="text-lg font-bold text-cyan-200 font-mono tabular-nums mt-0.5">
              {verifiedCount} berkas
            </div>
          </div>
          <div>
            <div className="text-[11px] text-sky-100/85 font-medium">Disahkan Kepsek</div>
            <div className="text-lg font-bold text-emerald-300 font-mono tabular-nums mt-0.5">
              {approvedCount} berkas
            </div>
          </div>
        </div>
      </div>

      {/* Guru Revision Alert for Wali Kelas */}
      {!isWaka && revisionDocs.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-rose-900">
                {revisionDocs.length} Dokumen Wali Kelas Memerlukan Revisi
              </div>
              <div className="text-rose-700 mt-0.5">
                Tinjau catatan telaah dari Waka Kurikulum dan ajukan ulang berkas perbaikan Anda.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectDocument(revisionDocs[0])}
            className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shrink-0 cursor-pointer"
          >
            Lihat &amp; Perbaiki Berkas
          </button>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap p-1 bg-slate-200/70 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setSubTab('matrix')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'matrix'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Matriks Wali Kelas</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('list')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'list'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Daftar Arsip ({periodDocs.length})</span>
          </button>

          {isWaka && (
            <button
              type="button"
              onClick={() => setSubTab('supervision')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                subTab === 'supervision'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Telaah &amp; Pengesahan</span>
              {pendingCount > 0 && (
                <span className="font-mono font-bold text-amber-700 tabular-nums">
                  ({pendingCount})
                </span>
              )}
            </button>
          )}
        </div>

        {isWaka && subTab === 'matrix' && pendingCount > 0 && (
          <button
            type="button"
            onClick={onBatchApproveWalas}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer whitespace-nowrap"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Sahkan Semua Diajukan ({pendingCount})</span>
          </button>
        )}
      </div>

      {/* Inline Delete Confirmation Banner */}
      {pendingDeleteDoc && (
        <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              Hapus arsip Wali Kelas <strong>&ldquo;{pendingDeleteDoc.title}&rdquo;</strong> beserta lampiran berkasnya?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPendingDeleteDoc(null)}
              className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                onDeleteDocument(pendingDeleteDoc.id);
                setPendingDeleteDoc(null);
              }}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold cursor-pointer"
            >
              Ya, Hapus Berkas
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: MATRIKS WALI KELAS */}
      {subTab === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {visibleEntries.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-900">
                Belum Ada Wali Kelas yang Ditetapkan
              </div>
              <p className="text-slate-500 max-w-md mx-auto">
                {isWaka
                  ? 'Tetapkan guru sebagai Wali Kelas beserta pilihan kelas (contoh: Kelas 7.1, 7.2, 8.1) melalui menu Data Guru & Waka.'
                  : 'Akun Anda belum memiliki Kelas Binaan aktif.'}
              </p>
              {isWaka && onNavigateToTeachers && (
                <button
                  type="button"
                  onClick={onNavigateToTeachers}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-semibold cursor-pointer"
                >
                  <span>Atur Wali Kelas di Data Guru</span>
                </button>
              )}
            </div>
          ) : matrixCategories.length === 0 ? (
            <div className="p-10 text-center space-y-2 text-slate-500">
              <div className="font-bold text-slate-800">Tidak Ada Kategori Matriks Wali Kelas Aktif</div>
              <p>Aktifkan minimal satu kategori Wali Kelas pada sub-menu Kategori Walas di sidebar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                    <th className="py-3 px-4 min-w-[220px] sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                      Kelas Binaan &amp; Wali Kelas
                    </th>
                    {matrixCategories.map((cat) => (
                      <th key={cat.id} className="py-3 px-3 min-w-[165px] text-center border-r border-slate-100 last:border-r-0">
                        <div className="font-mono font-bold text-emerald-800">{cat.code}</div>
                        <div className="text-[11px] font-medium text-slate-500 line-clamp-1 mt-0.5" title={cat.name}>
                          {cat.name}
                        </div>
                      </th>
                    ))}
                    <th className="py-3 px-3 min-w-[100px] text-center">Capaian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {visibleEntries.map((entry) => {
                    const rowFilled = matrixCategories.filter(cat => Boolean(getCellDoc(entry.homeroomClass, cat.id))).length;
                    const rowPct = Math.round((rowFilled / matrixCategories.length) * 100);

                    return (
                      <tr key={entry.homeroomClass} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 sticky left-0 bg-white z-10 border-r border-slate-200">
                          <div className="font-bold text-slate-900">
                            Kelas {entry.homeroomClass}
                          </div>
                          <div className="text-[11px] text-slate-600 truncate max-w-[200px]">
                            {entry.teacher.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            NIP. {entry.teacher.nip || '-'}
                          </div>
                        </td>

                        {matrixCategories.map((cat) => {
                          const docItem = getCellDoc(entry.homeroomClass, cat.id);
                          const statusMeta = docItem ? STATUS_META[docItem.status] : null;

                          return (
                            <td key={cat.id} className="py-2.5 px-2.5 text-center border-r border-slate-100 last:border-r-0 align-middle">
                              {docItem && statusMeta ? (
                                <div className={`p-2 rounded-lg border text-left space-y-1.5 ${statusMeta.bgClass}`}>
                                  <div className={`text-[10px] font-bold ${statusMeta.textClass}`}>
                                    {statusMeta.label}
                                  </div>
                                  <div className="text-[11px] font-semibold text-slate-800 truncate" title={docItem.originalFileName}>
                                    {docItem.originalFileName}
                                  </div>
                                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/70">
                                    <button
                                      type="button"
                                      onClick={() => onSelectDocument(docItem)}
                                      className="p-1 text-slate-600 hover:text-indigo-700 rounded cursor-pointer"
                                      title="Pratinjau & Telaah"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onEditDocument(docItem)}
                                      className="p-1 text-slate-600 hover:text-amber-700 rounded cursor-pointer"
                                      title="Edit / Ganti Berkas"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPendingDeleteDoc(docItem)}
                                      className="p-1 text-slate-500 hover:text-rose-600 rounded cursor-pointer"
                                      title="Hapus Berkas"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onOpenWalasUpload(entry.homeroomClass, cat.id)}
                                  className="w-full py-2.5 px-2 rounded-lg border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-500 hover:text-emerald-800 font-semibold inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                  title={`Unggah ${cat.name} untuk Kelas ${entry.homeroomClass}`}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Unggah</span>
                                </button>
                              )}
                            </td>
                          );
                        })}

                        <td className="py-3 px-3 text-center font-mono tabular-nums">
                          <div className="font-bold text-slate-900">{rowPct}%</div>
                          <div className="text-[10px] text-slate-500">
                            {rowFilled}/{matrixCategories.length}
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
      )}

      {/* TAB 2: DAFTAR ARSIP WALI KELAS */}
      {subTab === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul dokumen, kelas, wali kelas, nama berkas..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            {isWaka && (
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none"
              >
                <option value="all">Semua Kelas Binaan</option>
                {allHomeroomEntries.map(e => (
                  <option key={e.homeroomClass} value={e.homeroomClass}>
                    Kelas {e.homeroomClass}
                  </option>
                ))}
              </select>
            )}

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none"
            >
              <option value="all">Semua Kategori Walas</option>
              {walasCategories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="diajukan">Menunggu Telaah</option>
              <option value="diverifikasi">Terverifikasi Waka</option>
              <option value="disahkan">Disahkan Kepsek</option>
              <option value="perlu_revisi">Perlu Revisi</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-3 px-4 min-w-[230px]">Judul Dokumen &amp; Berkas</th>
                  <th className="py-3 px-4 min-w-[160px]">Kategori</th>
                  <th className="py-3 px-4 min-w-[160px]">Kelas &amp; Wali Kelas</th>
                  <th className="py-3 px-4 min-w-[140px]">Status Validasi</th>
                  <th className="py-3 px-4 min-w-[110px]">Tanggal</th>
                  <th className="py-3 px-4 min-w-[130px] text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredListDocs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      <FileText className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                      <div>Belum ada dokumen Wali Kelas pada periode Semester {currentSemester === 'ganjil' ? 'Ganjil' : 'Genap'} TP {academicYear}.</div>
                    </td>
                  </tr>
                ) : (
                  filteredListDocs.map((docItem) => {
                    const meta = STATUS_META[docItem.status];
                    return (
                      <tr key={docItem.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{docItem.title}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[260px] mt-0.5">
                            {docItem.originalFileName} · {(docItem.fileSize / 1024).toFixed(0)} KB
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {getCategoryLabel(docItem.category)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-emerald-800">Kelas {docItem.homeroomClass || docItem.grade}</div>
                          <div className="text-[11px] text-slate-600">{docItem.teacherName}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block font-semibold px-2 py-0.5 rounded border text-[11px] ${meta.bgClass} ${meta.textClass}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 tabular-nums">
                          {new Date(docItem.uploadDate).toLocaleDateString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onSelectDocument(docItem)}
                              className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer"
                              title="Pratinjau & Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditDocument(docItem)}
                              className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                              title="Edit / Ganti Berkas"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onPrintValidationSheet(docItem)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                              title="Cetak Lembar Pengesahan"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteDoc(docItem)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Hapus Berkas"
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
      )}

      {/* TAB 3: SUPERVISI, TELAAH & PENGESAHAN WALI KELAS (WAKA ONLY) */}
      {isWaka && subTab === 'supervision' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Antrean Telaah &amp; Pengesahan Dokumen Wali Kelas
              </h3>
              <p className="text-slate-500 mt-0.5">
                Lakukan verifikasi kelengkapan, beri catatan revisi apabila perlu perbaikan, atau sahkan langsung dokumen administrasi Wali Kelas.
              </p>
            </div>
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={onBatchApproveWalas}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Sahkan Semua Menunggu ({pendingCount})</span>
              </button>
            )}
          </div>

          {periodDocs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
              Belum ada dokumen Wali Kelas untuk ditelaah pada Semester {currentSemester === 'ganjil' ? 'Ganjil' : 'Genap'} TP {academicYear}.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {periodDocs.map((docItem) => {
                const meta = STATUS_META[docItem.status];
                const isEditingNotes = reviewDocId === docItem.id;

                return (
                  <div key={docItem.id} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span className="font-bold text-emerald-800">Kelas {docItem.homeroomClass || docItem.grade}</span>
                          <span aria-hidden="true">·</span>
                          <span>{docItem.teacherName}</span>
                          <span aria-hidden="true">·</span>
                          <span>{getCategoryLabel(docItem.category)}</span>
                          <span aria-hidden="true">·</span>
                          <span className={`font-bold ${meta.textClass}`}>{meta.label}</span>
                        </div>
                        <div className="text-sm font-bold text-slate-900">{docItem.title}</div>
                        {docItem.supervisorNotes && (
                          <div className="text-[11px] text-slate-600 italic">
                            Catatan: &ldquo;{docItem.supervisorNotes}&rdquo;
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onSelectDocument(docItem)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Pratinjau</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onUpdateDocumentStatus(
                              docItem.id,
                              'diverifikasi',
                              docItem.supervisorNotes || 'Telah ditelaah dan diverifikasi Waka Kurikulum.'
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-semibold cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Verifikasi Waka</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onUpdateDocumentStatus(
                              docItem.id,
                              'disahkan',
                              docItem.supervisorNotes || 'Disahkan oleh Waka Kurikulum dan Kepala Sekolah.'
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Sahkan Kepsek</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (isEditingNotes) {
                              setReviewDocId(null);
                            } else {
                              setReviewDocId(docItem.id);
                              setReviewNotes(docItem.supervisorNotes || '');
                            }
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 font-semibold cursor-pointer"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Minta Revisi</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onPrintValidationSheet(docItem)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
                          title="Cetak Lembar Pengesahan"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak</span>
                        </button>
                      </div>
                    </div>

                    {isEditingNotes && (
                      <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row gap-2.5">
                        <input
                          type="text"
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Tuliskan catatan bagian yang perlu diperbaiki oleh Wali Kelas..."
                          className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:border-rose-500 focus:outline-none"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setReviewDocId(null)}
                            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 font-semibold cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateDocumentStatus(
                                docItem.id,
                                'perlu_revisi',
                                reviewNotes.trim() || 'Mohon lengkapi atau perbaiki dokumen administrasi kelas.'
                              );
                              setReviewDocId(null);
                            }}
                            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
                          >
                            Kirim Instruksi Revisi
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
