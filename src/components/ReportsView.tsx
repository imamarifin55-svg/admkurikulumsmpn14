import React, { useRef } from 'react';
import { CurriculumDocument, SchoolProfile, Teacher, SemesterType } from '../types/curriculum';
import { CATEGORY_LABELS } from '../utils/documentClassifier';
import { 
  Download, Upload, FileSpreadsheet, FileCheck, CheckCircle2, 
  Printer, ShieldCheck, Database, BarChart3 
} from 'lucide-react';

interface ReportsViewProps {
  documents: CurriculumDocument[];
  teachers: Teacher[];
  profile: SchoolProfile;
  currentSemester: SemesterType;
  academicYear: string;
  onRestoreBackup: (docs: CurriculumDocument[]) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  documents,
  teachers,
  profile,
  currentSemester,
  academicYear,
  onRestoreBackup
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats calculation
  const totalDocs = documents.length;
  const ganjilDocs = documents.filter(d => d.semester === 'ganjil');
  const genapDocs = documents.filter(d => d.semester === 'genap');
  const approvedDocs = documents.filter(d => d.status === 'disahkan');
  const verifiedDocs = documents.filter(d => d.status === 'diverifikasi');
  const pendingDocs = documents.filter(d => d.status === 'diajukan');
  const revisionDocs = documents.filter(d => d.status === 'perlu_revisi');

  // Breakdown by Category
  const categoryStats = Object.entries(CATEGORY_LABELS).map(([catKey, label]) => {
    const count = documents.filter(d => d.category === catKey).length;
    return {
      key: catKey,
      name: label.name,
      code: label.code,
      count
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

    const rows = documents.map(d => [
      `"${d.id}"`,
      `"${d.approvalNumber || '-'}"`,
      `"${d.title.replace(/"/g, '""')}"`,
      `"${CATEGORY_LABELS[d.category]?.name || d.category}"`,
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
    link.setAttribute('download', `Rekapitulasi_Arsip_Kurikulum_${academicYear.replace('/', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON Backup
  const handleExportJSON = () => {
    const backupData = {
      schoolProfile: profile,
      exportedAt: new Date().toISOString(),
      academicYear,
      totalCount: documents.length,
      documents
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `backup_arsip_kurikulum_${academicYear.replace('/', '_')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Restore
  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.documents && Array.isArray(json.documents)) {
          if (window.confirm(`Pulihkan ${json.documents.length} dokumen dari berkas cadangan?`)) {
            onRestoreBackup(json.documents);
            alert('Pemulihan arsip kurikulum berhasil diselesaikan!');
          }
        } else {
          alert('Format berkas cadangan JSON tidak valid.');
        }
      } catch (err) {
        alert('Gagal membaca berkas JSON cadangan.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 mb-8 text-xs">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Rekapitulasi &amp; Laporan Administrasi Kurikulum
            </h2>
            <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-2 py-0.5">
              TP {academicYear}
            </span>
          </div>
          <p className="text-slate-500 mt-1">
            Ekspor laporan resmi untuk pengawas sekolah, dinas pendidikan, serta pencadangan database digital secara mandiri.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
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
            {academicYear}
          </span>
        </div>

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
            {categoryStats.map(stat => {
              const ganjil = documents.filter(d => d.category === stat.key && d.semester === 'ganjil').length;
              const genap = documents.filter(d => d.category === stat.key && d.semester === 'genap').length;
              const isFulfilled = stat.count >= 6;

              return (
                <tr key={stat.key} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-medium text-slate-800">{stat.name}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">{stat.code}</td>
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums">{ganjil}</td>
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums">{genap}</td>
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
