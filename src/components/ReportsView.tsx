import React, { useRef, useState } from 'react';
import { 
  CurriculumDocument, SchoolProfile,
  CategoryItem, ActivityLog, ActivityAction, Teacher
} from '../types/curriculum';
import { CATEGORY_LABELS } from '../utils/documentClassifier';
import { 
  Upload, FileSpreadsheet, CheckCircle2, Database, BarChart3, 
  History, ShieldCheck, AlertTriangle, Loader2, Printer
} from 'lucide-react';
import { PrintReportModal } from './PrintReportModal';

interface ReportsViewProps {
  documents: CurriculumDocument[];
  profile: SchoolProfile;
  categories: CategoryItem[];
  teachers?: Teacher[];
  activityLogs: ActivityLog[];
  academicYear: string;
  onRestoreBackup: (docs: CurriculumDocument[]) => void;
  onFetchAllYearsDocuments?: () => Promise<CurriculumDocument[]>;
}

const ACTION_BADGE_MAP: Record<ActivityAction, { label: string; style: string }> = {
  UPLOAD: { label: 'Unggah Berkas', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  RESUBMIT: { label: 'Ajukan Revisi', style: 'bg-amber-50 text-amber-800 border-amber-200' },
  VERIFY: { label: 'Verifikasi Waka', style: 'bg-blue-50 text-blue-700 border-blue-200' },
  APPROVE: { label: 'Pengesahan', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REVISION: { label: 'Minta Revisi', style: 'bg-rose-50 text-rose-700 border-rose-200' },
  UPDATE_DOC: { label: 'Sunting Data', style: 'bg-slate-100 text-slate-700 border-slate-200' },
  DELETE: { label: 'Hapus Berkas', style: 'bg-rose-50 text-rose-700 border-rose-200' },
  CONFIG: { label: 'Pengaturan', style: 'bg-purple-50 text-purple-700 border-purple-200' },
  RESTORE: { label: 'Pulihkan Arsip', style: 'bg-teal-50 text-teal-700 border-teal-200' },
  LOGIN: { label: 'Masuk Sesi', style: 'bg-slate-100 text-slate-600 border-slate-200' }
};

export const ReportsView: React.FC<ReportsViewProps> = ({
  documents,
  profile,
  categories,
  teachers = [],
  activityLogs,
  academicYear,
  onRestoreBackup,
  onFetchAllYearsDocuments
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scopeMode, setScopeMode] = useState<'active_year' | 'all'>('active_year');
  const [allYearsDocs, setAllYearsDocs] = useState<CurriculumDocument[] | null>(null);
  const [isLoadingAllYears, setIsLoadingAllYears] = useState<boolean>(false);
  const [pendingRestoreDocs, setPendingRestoreDocs] = useState<CurriculumDocument[] | null>(null);
  const [restoreFeedback, setRestoreFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  const handleSelectAllYears = async () => {
    setScopeMode('all');
    if (onFetchAllYearsDocuments && !isLoadingAllYears) {
      try {
        setIsLoadingAllYears(true);
        const fetched = await onFetchAllYearsDocuments();
        setAllYearsDocs(fetched.filter(d => (d.archiveScope || 'kurikulum') === 'kurikulum'));
      } catch {
        setRestoreFeedback({ type: 'error', text: 'Gagal memuat arsip semua tahun pelajaran dari Cloud.' });
      } finally {
        setIsLoadingAllYears(false);
      }
    }
  };

  const scopedDocs = scopeMode === 'active_year'
    ? documents.filter(d => d.academicYear === academicYear)
    : (allYearsDocs ?? documents);

  // Stats calculation
  const totalDocs = scopedDocs.length;
  const ganjilDocs = scopedDocs.filter(d => d.semester === 'ganjil');
  const genapDocs = scopedDocs.filter(d => d.semester === 'genap');
  const approvedDocs = scopedDocs.filter(d => d.status === 'disahkan');
  const verifiedDocs = scopedDocs.filter(d => d.status === 'diverifikasi');
  const pendingDocs = scopedDocs.filter(d => d.status === 'diajukan');
  const revisionDocs = scopedDocs.filter(d => d.status === 'perlu_revisi');

  // Dynamic category map merging custom categories and any legacy document keys
  const categoryNameMap = new Map<string, { name: string; code: string }>();
  categories.forEach(c => {
    categoryNameMap.set(c.id, { name: c.name, code: c.code });
  });
  Object.entries(CATEGORY_LABELS).forEach(([key, val]) => {
    if (!categoryNameMap.has(key)) {
      categoryNameMap.set(key, { name: val.name, code: val.code });
    }
  });
  scopedDocs.forEach(d => {
    if (!categoryNameMap.has(d.category)) {
      categoryNameMap.set(d.category, { name: d.category, code: 'DOC' });
    }
  });

  const categoryStats = Array.from(categoryNameMap.entries()).map(([catKey, meta]) => {
    const matching = scopedDocs.filter(d => d.category === catKey);
    return {
      key: catKey,
      name: meta.name,
      code: meta.code,
      count: matching.length,
      ganjil: matching.filter(d => d.semester === 'ganjil').length,
      genap: matching.filter(d => d.semester === 'genap').length
    };
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'ID Dokumen',
      'Nomor Registrasi',
      'Judul Dokumen',
      'Kategori',
      'Mata Pelajaran',
      'Kelas',
      'Semester',
      'Tahun Ajaran',
      'Guru Pengampu',
      'NIP Guru',
      'Alokasi JP',
      'Status Verifikasi',
      'Tanggal Upload',
      'Catatan Supervisi'
    ];

    const rows = scopedDocs.map(d => [
      `"${d.id}"`,
      `"${d.approvalNumber || '-'}"`,
      `"${d.title.replace(/"/g, '""')}"`,
      `"${categoryNameMap.get(d.category)?.name || d.category}"`,
      `"${d.subject}"`,
      `"${d.grade}"`,
      `"${d.semester === 'ganjil' ? 'Ganjil' : 'Genap'}"`,
      `"${d.academicYear}"`,
      `"${d.teacherName}"`,
      `"'${d.teacherNip}"`,
      `"${d.alokasiJp || '-'}"`,
      `"${d.status}"`,
      `"${new Date(d.uploadDate).toLocaleDateString('id-ID')}"`,
      `"${(d.supervisorNotes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const suffix = scopeMode === 'active_year' ? academicYear.replace('/', '_') : 'Semua_Tahun';
    link.setAttribute('download', `Rekapitulasi_Arsip_Kurikulum_${suffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON Backup
  const handleExportJSON = () => {
    const backupData = {
      schoolProfile: profile,
      exportedAt: new Date().toISOString(),
      academicYear: scopeMode === 'active_year' ? academicYear : 'all',
      totalCount: scopedDocs.length,
      documents: scopedDocs
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const suffix = scopeMode === 'active_year' ? academicYear.replace('/', '_') : 'Semua_Tahun';
    link.setAttribute('download', `backup_arsip_kurikulum_${suffix}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle Restore without window.alert/confirm
  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFeedback(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.documents && Array.isArray(json.documents)) {
          setPendingRestoreDocs(json.documents);
        } else {
          setRestoreFeedback({ type: 'error', text: 'Format berkas cadangan JSON tidak valid.' });
        }
      } catch {
        setRestoreFeedback({ type: 'error', text: 'Gagal membaca berkas JSON cadangan.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmRestore = () => {
    if (!pendingRestoreDocs) return;
    const count = pendingRestoreDocs.length;
    onRestoreBackup(pendingRestoreDocs);
    setAllYearsDocs(null);
    setPendingRestoreDocs(null);
    setRestoreFeedback({ type: 'success', text: `Pemulihan ${count} dokumen arsip berhasil disinkronkan ke Cloud.` });
  };

  return (
    <div className="space-y-6 mb-8 text-xs">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900">
                Rekapitulasi &amp; Laporan Administrasi Kurikulum
              </h2>
              <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-2 py-0.5">
                {scopeMode === 'active_year' ? `TP ${academicYear}` : 'Semua Tahun Pelajaran'}
              </span>
            </div>
            <p className="text-slate-500 mt-1">
              Ekspor laporan resmi untuk pengawas sekolah, dinas pendidikan, serta pencadangan database digital secara mandiri.
            </p>
          </div>

          {/* Scope Toggle + Action buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setScopeMode('active_year')}
                className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                  scopeMode === 'active_year' ? 'bg-white text-indigo-700 shadow-xs font-semibold' : 'text-slate-600'
                }`}
              >
                TP {academicYear}
              </button>
              <button
                onClick={handleSelectAllYears}
                disabled={isLoadingAllYears}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer disabled:opacity-60 ${
                  scopeMode === 'all' ? 'bg-white text-indigo-700 shadow-xs font-semibold' : 'text-slate-600'
                }`}
              >
                {isLoadingAllYears && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Semua Tahun</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Cetak Laporan</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Unduh Rekap CSV / Excel</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-lg shadow-xs transition-colors"
            >
              <Database className="w-4 h-4 text-indigo-600" />
              <span>Cadangkan Data (JSON)</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileRestore}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="Pulihkan dari cadangan"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Pulihkan</span>
            </button>
          </div>
        </div>

        {/* Inline Restore Confirmation */}
        {pendingRestoreDocs && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Konfirmasi pemulihan <strong>{pendingRestoreDocs.length} dokumen</strong> dari berkas cadangan JSON? Data di Cloud akan diperbarui.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPendingRestoreDocs(null)}
                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={confirmRestore}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold"
              >
                Ya, Pulihkan Sekarang
              </button>
            </div>
          </div>
        )}

        {restoreFeedback && (
          <div className={`p-3 rounded-xl border ${
            restoreFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {restoreFeedback.text}
          </div>
        )}
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-slate-500 font-medium mb-1">Total Arsip Terdata</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">{totalDocs}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {ganjilDocs.length} Ganjil · {genapDocs.length} Genap
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-slate-500 font-medium mb-1">Disahkan Kepala Sekolah</div>
          <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums">{approvedDocs.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {totalDocs > 0 ? `${Math.round((approvedDocs.length / totalDocs) * 100)}% dari total dokumen` : '0%'}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-slate-500 font-medium mb-1">Terverifikasi Waka</div>
          <div className="text-2xl font-bold text-blue-600 font-mono tabular-nums">{verifiedDocs.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Siap diterbitkan SK Pengesahan
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-slate-500 font-medium mb-1">Menunggu Telaah &amp; Revisi</div>
          <div className="text-2xl font-bold text-amber-600 font-mono tabular-nums">
            {pendingDocs.length + revisionDocs.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {pendingDocs.length} antrian · {revisionDocs.length} revisi
          </div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            Rincian Distribusi Dokumen per Kategori Kurikulum
          </h3>
          <span className="text-slate-500 font-mono">
            {scopeMode === 'active_year' ? academicYear : 'Semua Tahun'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-2.5 px-4">Kategori Instrumen Kurikulum</th>
                <th className="py-2.5 px-3 text-center">Kode</th>
                <th className="py-2.5 px-3 text-center">Semester Ganjil</th>
                <th className="py-2.5 px-3 text-center">Semester Genap</th>
                <th className="py-2.5 px-3 text-center">Total Terarsip</th>
                <th className="py-2.5 px-4 text-center">Status Pemenuhan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {categoryStats.map(stat => (
                <tr key={stat.key} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-medium text-slate-800">{stat.name}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">{stat.code}</td>
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums">{stat.ganjil}</td>
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums">{stat.genap}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold tabular-nums text-slate-900">
                    {stat.count}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {stat.count > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Terdata ({stat.count})
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Belum ada dokumen</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-Time Audit Log Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900">
              Riwayat Aktivitas &amp; Jejak Audit Real-Time
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Tercatat permanen di Cloud Firestore ({activityLogs.length} log terbaru)
          </span>
        </div>

        {activityLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            Belum ada riwayat aktivitas tercatat pada sesi ini. Setiap unggahan, pengesahan, revisi, dan penghapusan akan muncul otomatis di sini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-2.5 px-4">Waktu</th>
                  <th className="py-2.5 px-3">Pelaku</th>
                  <th className="py-2.5 px-3">Aktivitas</th>
                  <th className="py-2.5 px-4">Sasaran / Dokumen</th>
                  <th className="py-2.5 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activityLogs.slice(0, 25).map((log) => {
                  const badge = ACTION_BADGE_MAP[log.action] || ACTION_BADGE_MAP.UPDATE_DOC;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 text-slate-500 font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{log.actorName}</div>
                        <div className="text-[10px] text-slate-400">
                          {log.actorRole === 'waka_kurikulum' ? 'Waka Kurikulum' : 'Guru Pengampu'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${badge.style}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900 max-w-xs truncate">
                        {log.targetTitle}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {log.details}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        documents={scopedDocs}
        profile={profile}
        categories={categories}
        teachers={teachers}
        activityLogs={activityLogs}
        scopeLabel={scopeMode === 'active_year' ? `TP ${academicYear}` : 'Semua Tahun Pelajaran'}
      />
    </div>
  );
};

