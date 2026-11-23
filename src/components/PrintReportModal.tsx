import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ActivityAction,
  ActivityLog,
  CategoryItem,
  CurriculumDocument,
  SchoolProfile,
  Teacher
} from '../types/curriculum';
import { CATEGORY_LABELS } from '../utils/documentClassifier';
import { ArrowLeft, Printer, QrCode, ShieldCheck } from 'lucide-react';
import { SchoolLogoImg } from './SchoolLogoImg';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: CurriculumDocument[];
  profile: SchoolProfile;
  categories: CategoryItem[];
  teachers: Teacher[];
  activityLogs: ActivityLog[];
  scopeLabel: string;
}

const STATUS_LABEL: Record<CurriculumDocument['status'], string> = {
  draft: 'Draf',
  disahkan: 'Disahkan',
  diverifikasi: 'Terverifikasi',
  diajukan: 'Menunggu Telaah',
  perlu_revisi: 'Perlu Revisi'
};

const ACTION_LABEL: Record<ActivityAction, string> = {
  UPLOAD: 'Unggah Berkas',
  RESUBMIT: 'Ajukan Revisi',
  VERIFY: 'Verifikasi Waka',
  APPROVE: 'Pengesahan',
  REVISION: 'Minta Revisi',
  UPDATE_DOC: 'Sunting Data',
  DELETE: 'Hapus Berkas',
  CONFIG: 'Pengaturan',
  RESTORE: 'Pulihkan Arsip',
  LOGIN: 'Masuk Sesi'
};

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  documents,
  profile,
  categories,
  teachers,
  activityLogs,
  scopeLabel
}) => {
  const [semesterFilter, setSemesterFilter] = useState<'all' | 'ganjil' | 'genap'>('all');
  const [includeCategorySummary, setIncludeCategorySummary] = useState(true);
  const [includeTeacherRecap, setIncludeTeacherRecap] = useState(true);
  const [includeDocumentList, setIncludeDocumentList] = useState(true);
  const [includeAuditLogs, setIncludeAuditLogs] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('is-printing-portal');
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('is-printing-portal');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const filteredDocs = useMemo(() => {
    if (semesterFilter === 'all') return documents;
    return documents.filter(d => d.semester === semesterFilter);
  }, [documents, semesterFilter]);

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, { name: string; code: string }>();
    categories.forEach(c => {
      map.set(c.id, { name: c.name, code: c.code });
    });
    Object.entries(CATEGORY_LABELS).forEach(([key, val]) => {
      if (!map.has(key)) {
        map.set(key, { name: val.name, code: val.code });
      }
    });
    filteredDocs.forEach(d => {
      if (!map.has(d.category)) {
        map.set(d.category, { name: d.category, code: 'DOC' });
      }
    });
    return map;
  }, [categories, filteredDocs]);

  const categoryStats = useMemo(() => {
    return Array.from(categoryNameMap.entries()).map(([key, meta]) => {
      const matching = filteredDocs.filter(d => d.category === key);
      return {
        key,
        name: meta.name,
        code: meta.code,
        ganjil: matching.filter(d => d.semester === 'ganjil').length,
        genap: matching.filter(d => d.semester === 'genap').length,
        approved: matching.filter(d => d.status === 'disahkan').length,
        total: matching.length
      };
    });
  }, [categoryNameMap, filteredDocs]);

  const teacherStats = useMemo(() => {
    return teachers.map(teacher => {
      const tDocs = filteredDocs.filter(
        d => d.teacherId === teacher.id || (teacher.nip && d.teacherNip === teacher.nip)
      );
      const approved = tDocs.filter(d => d.status === 'disahkan').length;
      const verified = tDocs.filter(d => d.status === 'diverifikasi').length;
      const pending = tDocs.filter(d => d.status === 'diajukan' || d.status === 'perlu_revisi').length;
      return {
        teacher,
        total: tDocs.length,
        approved,
        verified,
        pending
      };
    });
  }, [teachers, filteredDocs]);

  if (!isOpen) return null;

  const totalDocs = filteredDocs.length;
  const approvedCount = filteredDocs.filter(d => d.status === 'disahkan').length;
  const verifiedCount = filteredDocs.filter(d => d.status === 'diverifikasi').length;
  const pendingOrRevisionCount = filteredDocs.filter(
    d => d.status === 'diajukan' || d.status === 'perlu_revisi'
  ).length;

  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const semesterLabel =
    semesterFilter === 'all'
      ? 'Ganjil & Genap (Semua Semester)'
      : semesterFilter === 'ganjil'
      ? 'Semester Ganjil'
      : 'Semester Genap';

  const hasAnySection =
    includeCategorySummary || includeTeacherRecap || includeDocumentList || includeAuditLogs;

  const modalContent = (
    <div className="print-portal-sheet fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex flex-col items-center p-3 sm:p-6">
      {/* Control Toolbar (Hidden on Print) */}
      <div className="print:hidden sticky top-0 z-20 w-full max-w-5xl bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700 p-3.5 sm:p-4 mb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white">
                Pratinjau Cetak Laporan Rekapitulasi (Format A4)
              </div>
              <div className="text-[11px] text-slate-300">
                Sesuaikan komponen laporan sebelum mencetak atau menyimpan sebagai PDF
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={!hasAnySection}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Cetak / Simpan PDF
          </button>
        </div>

        {/* Print Options Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-700/80 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium">Semester:</span>
            <div className="inline-flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              {([
                { id: 'all', label: 'Semua' },
                { id: 'ganjil', label: 'Ganjil' },
                { id: 'genap', label: 'Genap' }
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSemesterFilter(opt.id)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    semesterFilter === opt.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 font-medium">Bagian Cetak:</span>
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeCategorySummary}
                onChange={e => setIncludeCategorySummary(e.target.checked)}
                className="rounded border-slate-500 text-indigo-500 focus:ring-indigo-500"
              />
              <span>Kategori</span>
            </label>
            {teachers.length > 0 && (
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeTeacherRecap}
                  onChange={e => setIncludeTeacherRecap(e.target.checked)}
                  className="rounded border-slate-500 text-indigo-500 focus:ring-indigo-500"
                />
                <span>Rekap Guru</span>
              </label>
            )}
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeDocumentList}
                onChange={e => setIncludeDocumentList(e.target.checked)}
                className="rounded border-slate-500 text-indigo-500 focus:ring-indigo-500"
              />
              <span>Daftar Dokumen ({totalDocs})</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeAuditLogs}
                onChange={e => setIncludeAuditLogs(e.target.checked)}
                className="rounded border-slate-500 text-indigo-500 focus:ring-indigo-500"
              />
              <span>Audit Log</span>
            </label>
          </div>
        </div>
      </div>

      {/* Printable A4 Document Sheet */}
      <div className="print-portal-card w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-300 p-6 sm:p-10 text-slate-900">
        {/* KOP SURAT RESMI */}
        <div className="pb-3 border-b-4 border-slate-900">
          <div className="flex items-center justify-between gap-4 mb-1">
            <div className="w-20 h-20 flex items-center justify-center shrink-0">
              {profile.pemdaLogoUrl ? (
                <img
                  src={profile.pemdaLogoUrl}
                  alt="Logo Pemda"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="w-14 h-14 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-400 text-center">
                  Logo Pemda
                </div>
              )}
            </div>

            <div className="text-center flex-1">
              <div className="text-xs tracking-widest font-semibold uppercase text-slate-700">
                {profile.regionalGovernment || 'PEMERINTAH DAERAH'}
              </div>
              <div className="text-sm tracking-wider font-semibold uppercase text-slate-800">
                {profile.educationDepartment || 'DINAS PENDIDIKAN'}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 font-serif my-0.5">
                {profile.name.toUpperCase()}
              </h1>
              <div className="text-[11px] text-slate-600 leading-tight">
                {profile.address} {profile.postalCode ? `Kode Pos ${profile.postalCode}` : ''}
              </div>
              <div className="text-[10px] text-slate-500 tracking-wide mt-0.5">
                NPSN: {profile.npsn} · {profile.accreditation} · Telp: {profile.phone || '-'} · Laman: {profile.website || '-'}
              </div>
            </div>

            <div className="w-24 h-24 flex items-center justify-center shrink-0">
              {profile.schoolLogoUrl ? (
                <SchoolLogoImg
                  src={profile.schoolLogoUrl}
                  alt="Logo Sekolah"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-14 h-14 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-400 text-center">
                  Logo Sekolah
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="border-b border-slate-900 mt-0.5 mb-5" />

        {/* JUDUL LAPORAN */}
        <div className="text-center mb-5">
          <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-wide text-slate-950 underline decoration-2 underline-offset-4">
            LAPORAN REKAPITULASI ADMINISTRASI KURIKULUM
          </h2>
          <div className="text-xs font-semibold text-slate-700 mt-1">
            Periode: {scopeLabel} · {semesterLabel}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Dicetak pada {currentDate}
          </div>
        </div>

        {/* RINGKASAN EKSEKUTIF */}
        <div className="grid grid-cols-4 gap-3 mb-6 print-avoid-break">
          <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Total Arsip</div>
            <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">{totalDocs}</div>
            <div className="text-[10px] text-slate-500">Dokumen terdata</div>
          </div>
          <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Disahkan Kepsek</div>
            <div className="text-xl font-bold text-emerald-700 font-mono tabular-nums mt-0.5">{approvedCount}</div>
            <div className="text-[10px] text-slate-500">
              {totalDocs > 0 ? `${Math.round((approvedCount / totalDocs) * 100)}% disahkan` : '0%'}
            </div>
          </div>
          <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Terverifikasi Waka</div>
            <div className="text-xl font-bold text-blue-700 font-mono tabular-nums mt-0.5">{verifiedCount}</div>
            <div className="text-[10px] text-slate-500">Menunggu SK Kepsek</div>
          </div>
          <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Antrian / Revisi</div>
            <div className="text-xl font-bold text-amber-700 font-mono tabular-nums mt-0.5">
              {pendingOrRevisionCount}
            </div>
            <div className="text-[10px] text-slate-500">Perlu tindak lanjut</div>
          </div>
        </div>

        {!hasAnySection && (
          <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl text-slate-500 text-xs mb-6">
            Pilih minimal satu bagian cetak pada bilah kontrol di atas untuk menampilkan pratinjau laporan.
          </div>
        )}

        {/* BAGIAN 1: REKAPITULASI PER KATEGORI */}
        {includeCategorySummary && (
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-900 mb-2">
              A. Rekapitulasi Dokumen per Kategori Kurikulum
            </h3>
            <table className="print-table w-full text-[11px] border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-semibold">
                  <th className="border border-slate-400 py-1.5 px-2 text-center w-9">No</th>
                  <th className="border border-slate-400 py-1.5 px-2 text-center w-20">Kode</th>
                  <th className="border border-slate-400 py-1.5 px-2.5 text-left">Kategori Instrumen</th>
                  <th className="border border-slate-400 py-1.5 px-2 text-center w-16">Ganjil</th>
                  <th className="border border-slate-400 py-1.5 px-2 text-center w-16">Genap</th>
                  <th className="border border-slate-400 py-1.5 px-2 text-center w-20">Disahkan</th>
                  <th className="border border-slate-400 py-1.5 px-2 text-center w-16">Total</th>
                </tr>
              </thead>
              <tbody>
                {categoryStats.map((stat, idx) => (
                  <tr key={stat.key}>
                    <td className="border border-slate-300 py-1.5 px-2 text-center font-mono">{idx + 1}</td>
                    <td className="border border-slate-300 py-1.5 px-2 text-center font-mono font-semibold">{stat.code}</td>
                    <td className="border border-slate-300 py-1.5 px-2.5 font-medium">{stat.name}</td>
                    <td className="border border-slate-300 py-1.5 px-2 text-center font-mono tabular-nums">{stat.ganjil}</td>
                    <td className="border border-slate-300 py-1.5 px-2 text-center font-mono tabular-nums">{stat.genap}</td>
                    <td className="border border-slate-300 py-1.5 px-2 text-center font-mono tabular-nums">{stat.approved}</td>
                    <td className="border border-slate-300 py-1.5 px-2 text-center font-mono font-bold tabular-nums">{stat.total}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={3} className="border border-slate-400 py-1.5 px-2.5 text-right uppercase">
                    Jumlah Keseluruhan
                  </td>
                  <td className="border border-slate-400 py-1.5 px-2 text-center font-mono tabular-nums">
                    {filteredDocs.filter(d => d.semester === 'ganjil').length}
                  </td>
                  <td className="border border-slate-400 py-1.5 px-2 text-center font-mono tabular-nums">
                    {filteredDocs.filter(d => d.semester === 'genap').length}
                  </td>
                  <td className="border border-slate-400 py-1.5 px-2 text-center font-mono tabular-nums">
                    {approvedCount}
                  </td>
                  <td className="border border-slate-400 py-1.5 px-2 text-center font-mono tabular-nums">
                    {totalDocs}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* BAGIAN 2: REKAPITULASI PER GURU */}
        {includeTeacherRecap && teachers.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-900 mb-2">
              {includeCategorySummary ? 'B.' : 'A.'} Rekapitulasi Kelengkapan Arsip per Guru Pengampu
            </h3>
            <table className="print-table w-full text-[11px] border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-semibold">
                  <th className="border border-slate-400 py-1.5 px-2 text-center w-9">No</th>
                  <th className="border border-slate-400 py-1.5 px-2.5 text-left">Nama Guru &amp; NIP</th>
                  <th className="border border-slate-400 py-1.5 px-2.5 text-left">Mata Pelajaran</th>
                  <th className="border border-slate-400 py-1.5 px-2 text-center w-16">Total</th>
                  <th className="border border-slate-400 py-1.5 px-2 text-center w-20">Disahkan</th>
                  <th className="border border-slate-400 py-1.5 px-2 text-center w-20">Verifikasi</th>
                  <th className="border border-slate-400 py-1.5 px-2 text-center w-24">Antrian/Revisi</th>
                </tr>
              </thead>
              <tbody>
                {teacherStats.map((row, idx) => (
                  <tr key={row.teacher.id}>
                    <td className="border border-slate-300 py-1.5 px-2 text-center font-mono">{idx + 1}</td>
                    <td className="border border-slate-300 py-1.5 px-2.5">
                      <div className="font-semibold text-slate-900">{row.teacher.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">NIP. {row.teacher.nip || '-'}</div>
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2.5 text-slate-700">{row.teacher.subject}</td>
                    <td className="border border-slate-300 py-1.5 px-2 text-center font-mono font-bold tabular-nums">
                      {row.total}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2 text-center font-mono tabular-nums text-emerald-700 font-semibold">
                      {row.approved}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2 text-center font-mono tabular-nums text-blue-700">
                      {row.verified}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2 text-center font-mono tabular-nums text-amber-700">
                      {row.pending}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* BAGIAN 3: DAFTAR DOKUMEN TERARSIP */}
        {includeDocumentList && (
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-900 mb-2">
              Daftar Rincian Dokumen Arsip Kurikulum ({totalDocs} Dokumen)
            </h3>
            {filteredDocs.length === 0 ? (
              <div className="p-4 border border-slate-300 text-center text-[11px] text-slate-500">
                Belum ada dokumen arsip untuk filter periode yang dipilih.
              </div>
            ) : (
              <table className="print-table w-full text-[11px] border-collapse border border-slate-400">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-semibold">
                    <th className="border border-slate-400 py-1.5 px-2 text-center w-9">No</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-left">Judul Dokumen &amp; Kategori</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-left">Mapel &amp; Kelas</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-left">Guru Pengampu</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-center w-20">Semester</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-center w-24">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((doc, idx) => (
                    <tr key={doc.id}>
                      <td className="border border-slate-300 py-1.5 px-2 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-300 py-1.5 px-2">
                        <div className="font-semibold text-slate-900">{doc.title}</div>
                        <div className="text-[10px] text-slate-500">
                          {categoryNameMap.get(doc.category)?.name || doc.category}
                          {doc.approvalNumber ? ` · Reg: ${doc.approvalNumber}` : ''}
                        </div>
                      </td>
                      <td className="border border-slate-300 py-1.5 px-2">
                        <div>{doc.subject}</div>
                        <div className="text-[10px] text-slate-500">Kelas {doc.grade}</div>
                      </td>
                      <td className="border border-slate-300 py-1.5 px-2">
                        <div className="font-medium">{doc.teacherName}</div>
                        <div className="text-[10px] font-mono text-slate-500">{doc.teacherNip}</div>
                      </td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center">
                        <div>{doc.semester === 'ganjil' ? 'Ganjil' : 'Genap'}</div>
                        <div className="text-[10px] font-mono text-slate-500">{doc.academicYear}</div>
                      </td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center font-semibold">
                        {STATUS_LABEL[doc.status] || doc.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* BAGIAN 4: AUDIT LOG (OPSIONAL) */}
        {includeAuditLogs && (
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-900 mb-2">
              Riwayat Aktivitas &amp; Jejak Audit Terbaru
            </h3>
            {activityLogs.length === 0 ? (
              <div className="p-4 border border-slate-300 text-center text-[11px] text-slate-500">
                Belum ada catatan aktivitas yang tersimpan.
              </div>
            ) : (
              <table className="print-table w-full text-[11px] border-collapse border border-slate-400">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-semibold">
                    <th className="border border-slate-400 py-1.5 px-2 text-left w-28">Waktu</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-left">Pelaku</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-left w-28">Aktivitas</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-left">Sasaran &amp; Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.slice(0, 25).map(log => (
                    <tr key={log.id}>
                      <td className="border border-slate-300 py-1.5 px-2 font-mono text-[10px]">
                        {new Date(log.timestamp).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="border border-slate-300 py-1.5 px-2 font-medium">{log.actorName}</td>
                      <td className="border border-slate-300 py-1.5 px-2">
                        {ACTION_LABEL[log.action] || log.action}
                      </td>
                      <td className="border border-slate-300 py-1.5 px-2">
                        <div className="font-semibold text-slate-900">{log.targetTitle}</div>
                        <div className="text-[10px] text-slate-600">{log.details}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* BLOK TANDA TANGAN PENGESAHAN */}
        <div className="print-avoid-break grid grid-cols-2 gap-8 pt-6 mt-4 border-t border-slate-200 text-xs">
          <div className="text-center">
            <div className="text-slate-600">Mengetahui &amp; Memverifikasi,</div>
            <div className="font-semibold text-slate-800">Waka Bidang Kurikulum</div>

            <div className="my-3 flex flex-col items-center justify-center min-h-[5.25rem]">
              {profile.wakaSignatureUrl ? (
                <img
                  src={profile.wakaSignatureUrl}
                  alt="Tanda Tangan Waka Kurikulum"
                  className="h-20 max-w-[160px] object-contain"
                />
              ) : (
                <div className="w-20 h-20 border border-slate-300 rounded-lg p-1 bg-white flex flex-col items-center justify-center">
                  <div className="text-[9px] font-mono font-bold text-indigo-700">TERVALIDASI</div>
                  <div className="w-10 h-10 border border-indigo-200 rounded flex items-center justify-center my-0.5">
                    <QrCode className="w-8 h-8 text-indigo-800" />
                  </div>
                  <div className="text-[8px] font-mono text-slate-500">DIGITAL SIGN</div>
                </div>
              )}
            </div>

            <div className="font-bold text-slate-900 underline underline-offset-2">
              {profile.curriculumViceName}
            </div>
            <div className="text-[11px] text-slate-600 font-mono">
              NIP. {profile.curriculumViceNip}
            </div>
          </div>

          <div className="text-center">
            <div className="text-slate-600">Ditetapkan pada {currentDate}</div>
            <div className="font-semibold text-slate-800">Mengesahkan: Kepala Sekolah</div>

            <div className="my-3 flex flex-col items-center justify-center min-h-[5.25rem]">
              {profile.headmasterSignatureUrl ? (
                <img
                  src={profile.headmasterSignatureUrl}
                  alt="Tanda Tangan Kepala Sekolah"
                  className="h-20 max-w-[160px] object-contain"
                />
              ) : (
                <div className="w-20 h-20 border-2 border-emerald-500/50 rounded-lg p-1 bg-white flex flex-col items-center justify-center">
                  <div className="text-[9px] font-mono font-bold text-emerald-800">DISAHKAN</div>
                  <div className="w-10 h-10 border border-emerald-300 rounded flex items-center justify-center my-0.5">
                    <ShieldCheck className="w-8 h-8 text-emerald-700" />
                  </div>
                  <div className="text-[8px] font-mono text-slate-500">KEPALA SEKOLAH</div>
                </div>
              )}
            </div>

            <div className="font-bold text-slate-900 underline underline-offset-2">
              {profile.headmasterName}
            </div>
            <div className="text-[11px] text-slate-600 font-mono">
              NIP. {profile.headmasterNip}
            </div>
          </div>
        </div>

        {/* FOOTER CETAK */}
        <div className="mt-8 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400">
          Rekapitulasi Resmi Administrasi Kurikulum · {profile.name} · Dicetak pada {new Date().toLocaleString('id-ID')}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
