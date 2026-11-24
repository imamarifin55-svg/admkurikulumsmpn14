import React, { useState, useMemo, useEffect } from 'react';
import {
  X, AlertTriangle, FileSpreadsheet, RefreshCw, CheckCircle2
} from 'lucide-react';
import { SCHOOL_CLASS_GROUPS } from '../types/curriculum';
import { StagedImportRow } from '../utils/studentExcelHelper';

export interface StudentImportPreviewData {
  fileName: string;
  sheetNames: string[];
  rows: StagedImportRow[];
}

interface StudentImportPreviewModalProps {
  preview: StudentImportPreviewData | null;
  isWaka: boolean;
  isCommitting: boolean;
  onClose: () => void;
  onChangeRowClass: (tempId: string, nextClass: string) => void;
  onDownloadTemplate: () => void;
  onConfirm: (deduplicate: boolean) => Promise<void> | void;
}

export const StudentImportPreviewModal: React.FC<StudentImportPreviewModalProps> = ({
  preview,
  isWaka,
  isCommitting,
  onClose,
  onChangeRowClass,
  onDownloadTemplate,
  onConfirm
}) => {
  const [deduplicate, setDeduplicate] = useState(true);

  useEffect(() => {
    if (preview) {
      setDeduplicate(true);
    }
  }, [preview?.fileName, preview?.rows.length]);

  const previewClassSummary = useMemo(() => {
    if (!preview) return [];
    const counts = new Map<string, number>();
    preview.rows.forEach((r) => {
      const cls = r.student.homeroomClass;
      counts.set(cls, (counts.get(cls) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { numeric: true })
    );
  }, [preview]);

  if (!preview) return null;

  const duplicateMatches = preview.rows.filter(r => Boolean(r.matchedExisting)).length;
  const unrecognizedCount = preview.rows.filter(r => !r.classWasRecognized).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Pratinjau Impor Massal Peserta Didik &amp; Buku Induk
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Berkas: <strong className="text-slate-700">{preview.fileName}</strong> ·{' '}
              {preview.sheetNames.length} sheet terbaca ({preview.sheetNames.join(', ')})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] text-slate-500">Total Terdeteksi</div>
              <div className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {preview.rows.length} siswa
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-[11px] text-emerald-700">Siswa Baru</div>
              <div className="text-base font-bold text-emerald-900 font-mono tabular-nums mt-0.5">
                {deduplicate ? preview.rows.length - duplicateMatches : preview.rows.length} siswa
              </div>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
              <div className="text-[11px] text-indigo-700">Cocok / Diperbarui</div>
              <div className="text-base font-bold text-indigo-900 font-mono tabular-nums mt-0.5">
                {deduplicate ? duplicateMatches : 0} siswa
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] text-slate-500">Jumlah Kelas</div>
              <div className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {previewClassSummary.length} kelas
              </div>
            </div>
          </div>

          {/* Class Distribution Breakdown */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="font-bold text-slate-800">
              Ringkasan Pembagian per Kelas:
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {previewClassSummary.map(([cls, count]) => (
                <div
                  key={cls}
                  className="px-2.5 py-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between"
                >
                  <span className="font-bold text-emerald-800">Kls {cls}</span>
                  <span className="font-mono font-semibold text-slate-700 tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {isWaka && unrecognizedCount > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Ada <strong>{unrecognizedCount} baris</strong> yang kolom kelasnya kosong atau tidak sesuai format (mis. 7.1–9.4) sehingga sementara diarahkan ke kelas bawaan. Anda dapat menyesuaikan kelasnya langsung pada tabel di bawah.
              </span>
            </div>
          )}

          {/* Anti-Duplicate Toggle */}
          <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 cursor-pointer">
            <input
              type="checkbox"
              checked={deduplicate}
              onChange={(e) => setDeduplicate(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-indigo-700 rounded border-slate-300 cursor-pointer"
            />
            <div>
              <div className="font-bold text-indigo-950">
                Perbarui Otomatis Jika NISN / Nama &amp; Kelas Sudah Ada (Anti-Duplikat)
              </div>
              <div className="text-[11px] text-indigo-800 mt-0.5">
                {duplicateMatches > 0
                  ? `${duplicateMatches} data cocok dengan siswa yang sudah tersimpan dan akan diperbarui tanpa membuat baris ganda.`
                  : 'Aktifkan agar impor ulang file master sekolah tidak menggandakan siswa yang sudah ada.'}
              </div>
            </div>
          </label>

          {/* Preview Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold z-10">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">No</th>
                    <th className="py-2 px-3">Nama Lengkap Siswa</th>
                    <th className="py-2 px-3">NIS / NISN</th>
                    <th className="py-2 px-3 text-center">L/P</th>
                    <th className="py-2 px-3">Kelas</th>
                    <th className="py-2 px-3">Aksi Impor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {preview.rows.map((row, idx) => {
                    const isUpdate = deduplicate && Boolean(row.matchedExisting);
                    return (
                      <tr key={row.tempId} className={!row.classWasRecognized ? 'bg-amber-50/40' : ''}>
                        <td className="py-2 px-3 text-center font-mono text-slate-500 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {row.student.name}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                          {row.student.nis} / {row.student.nisn}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold">
                          {row.student.gender}
                        </td>
                        <td className="py-2 px-3">
                          {isWaka ? (
                            <select
                              value={row.student.homeroomClass}
                              onChange={(e) => onChangeRowClass(row.tempId, e.target.value)}
                              className="text-[11px] font-semibold bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:border-emerald-600"
                            >
                              {SCHOOL_CLASS_GROUPS.map((group) => (
                                <optgroup key={group.level} label={group.groupLabel}>
                                  {group.classes.map((cls) => (
                                    <option key={cls.value} value={cls.value}>
                                      {cls.label}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          ) : (
                            <span className="font-bold text-emerald-800">
                              Kelas {row.student.homeroomClass}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {isUpdate ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-semibold">
                              Perbarui Data
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">
                              Siswa Baru
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onDownloadTemplate}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:underline cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Unduh Template Seragam Peserta Didik &amp; Buku Induk (.xlsx)</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isCommitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => onConfirm(deduplicate)}
              disabled={isCommitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer disabled:opacity-60"
            >
              {isCommitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan {preview.rows.length} Siswa ke Cloud</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
