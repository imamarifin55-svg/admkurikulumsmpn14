import React, { useState, useMemo } from 'react';
import { 
  CurriculumDocument, DocumentCategory, GradeLevel, SemesterType, VerificationStatus, CategoryItem 
} from '../types/curriculum';
import { CATEGORY_LABELS } from '../utils/documentClassifier';
import { 
  Search, Filter, FileText, CheckCircle2, Clock, AlertTriangle, 
  ShieldCheck, Eye, Printer, Trash2, ArrowUpDown, Download, Sparkles 
} from 'lucide-react';

interface CurriculumListProps {
  documents: CurriculumDocument[];
  currentSemester: SemesterType;
  academicYear: string;
  categories: CategoryItem[];
  onSelectDocument: (doc: CurriculumDocument) => void;
  onPrintValidationSheet: (doc: CurriculumDocument) => void;
  onDeleteDocument: (docId: string) => void;
  onOpenUpload: () => void;
}

export const CurriculumList: React.FC<CurriculumListProps> = ({
  documents,
  currentSemester,
  academicYear,
  categories,
  onSelectDocument,
  onPrintValidationSheet,
  onDeleteDocument,
  onOpenUpload
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'jp'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter logic
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Must match semester (or show prota which spans whole year if ganjil)
      if (doc.semester !== currentSemester && !(doc.category === 'prota' && currentSemester === 'ganjil')) {
        return false;
      }

      // Year match
      if (doc.academicYear !== academicYear) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && doc.category !== selectedCategory) {
        return false;
      }

      // Grade filter
      if (selectedGrade !== 'all' && doc.grade !== selectedGrade) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && doc.status !== selectedStatus) {
        return false;
      }

      // Query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = doc.title.toLowerCase().includes(query);
        const matchesSubject = doc.subject.toLowerCase().includes(query);
        const matchesTeacher = doc.teacherName.toLowerCase().includes(query);
        const matchesTags = doc.tags.some(t => t.toLowerCase().includes(query));
        const matchesCompetencies = doc.competencies?.some(c => c.toLowerCase().includes(query));
        return matchesTitle || matchesSubject || matchesTeacher || matchesTags || matchesCompetencies;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date') {
        const da = new Date(a.uploadDate).getTime();
        const db = new Date(b.uploadDate).getTime();
        return sortOrder === 'desc' ? db - da : da - db;
      }
      if (sortBy === 'title') {
        return sortOrder === 'desc' ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title);
      }
      if (sortBy === 'jp') {
        const jpa = a.alokasiJp || 0;
        const jpb = b.alokasiJp || 0;
        return sortOrder === 'desc' ? jpb - jpa : jpa - jpb;
      }
      return 0;
    });
  }, [documents, currentSemester, academicYear, selectedCategory, selectedGrade, selectedStatus, searchQuery, sortBy, sortOrder]);

  const getStatusBadge = (status: VerificationStatus) => {
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Search and Filter Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul materi, mata pelajaran, guru, atau kata kunci..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Quick Stats & Sort */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => {
                if (sortBy === 'date') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                else { setSortBy('date'); setSortOrder('desc'); }
              }}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Tanggal {sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}</span>
            </button>
          </div>
        </div>

        {/* Filter Badges Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-500 font-semibold flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Semua Kategori Dokumen</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.code})
              </option>
            ))}
          </select>

          {/* Grade Filter */}
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Semua Kelas</option>
            <option value="7">Kelas 7</option>
            <option value="8">Kelas 8</option>
            <option value="9">Kelas 9</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Semua Status</option>
            <option value="disahkan">Disahkan Kepsek</option>
            <option value="diverifikasi">Terverifikasi Waka</option>
            <option value="diajukan">Menunggu Telaah</option>
            <option value="perlu_revisi">Perlu Revisi</option>
          </select>

          {(searchQuery || selectedCategory !== 'all' || selectedGrade !== 'all' || selectedStatus !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedGrade('all');
                setSelectedStatus('all');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline ml-2"
            >
              Reset Filter
            </button>
          )}

          <div className="ml-auto text-xs text-slate-500 font-mono tabular-nums">
            Menampilkan <strong>{filteredDocuments.length}</strong> dokumen
          </div>
        </div>
      </div>

      {/* High-density Document Table */}
      {filteredDocuments.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800 mb-1">
            Tidak ada dokumen kurikulum yang cocok
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Coba ubah kata kunci pencarian, sesuaikan filter kategori, atau unggah dokumen kurikulum baru.
          </p>
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Unggah Dokumen Otomatis</span>
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-4 min-w-[260px]">Dokumen Kurikulum</th>
                <th className="py-3 px-3 min-w-[140px]">Semester &amp; Tingkat</th>
                <th className="py-3 px-3 min-w-[180px]">Guru Pengampu</th>
                <th className="py-3 px-3 text-center min-w-[70px]">Alokasi</th>
                <th className="py-3 px-3 text-center min-w-[130px]">Status Validasi</th>
                <th className="py-3 px-4 text-right min-w-[120px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredDocuments.map((doc) => {
                return (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Document Title & File Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                          {categories.find(c => c.id === doc.category)?.code || CATEGORY_LABELS[doc.category]?.code || 'DOC'}
                        </div>
                        <div>
                          <button
                            onClick={() => onSelectDocument(doc)}
                            className="font-semibold text-slate-900 hover:text-indigo-700 transition-colors text-left line-clamp-1 cursor-pointer"
                          >
                            {doc.title}
                          </button>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-medium text-slate-700">{doc.subject}</span>
                            <span aria-hidden="true">·</span>
                            <span>{doc.originalFileName}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Semester & Grade */}
                    <td className="py-3.5 px-3">
                      <div className="font-medium text-slate-800">
                        Semester {doc.semester === 'ganjil' ? 'Ganjil' : 'Genap'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Kelas {doc.grade} <span aria-hidden="true">·</span> {doc.curriculumType}
                      </div>
                    </td>

                    {/* Teacher */}
                    <td className="py-3.5 px-3">
                      <div className="font-medium text-slate-800">{doc.teacherName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        NIP. {doc.teacherNip}
                      </div>
                    </td>

                    {/* Alokasi JP */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="font-mono font-bold text-slate-800 tabular-nums">
                        {doc.alokasiJp ? `${doc.alokasiJp} JP` : '-'}
                      </div>
                      <div className="text-[10px] text-slate-400">Efektif</div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center">
                      {getStatusBadge(doc.status)}
                      {doc.approvalNumber && (
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-[130px] mx-auto">
                          {doc.approvalNumber}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectDocument(doc)}
                          className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Lihat Pratinjau Dokumen & Catatan"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onPrintValidationSheet(doc)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Cetak Lembar Pengesahan Resmi"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`Yakin ingin menghapus dokumen "${doc.title}" dari arsip?`)) {
                              onDeleteDocument(doc.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus dari arsip"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
  );
};
