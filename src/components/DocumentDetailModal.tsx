import React, { useState } from 'react';
import { 
  X, FileText, CheckCircle2, Clock, AlertTriangle, ShieldCheck, 
  Printer, Save, Download, Sparkles, Tag, Calendar, User, BookOpen 
} from 'lucide-react';
import { CurriculumDocument, VerificationStatus, CategoryItem } from '../types/curriculum';
import { CATEGORY_LABELS } from '../utils/documentClassifier';

interface DocumentDetailModalProps {
  document: CurriculumDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (docId: string, newStatus: VerificationStatus, supervisorNotes: string) => void;
  onPrintValidationSheet: (doc: CurriculumDocument) => void;
  categories?: CategoryItem[];
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  isOpen,
  onClose,
  onUpdateStatus,
  onPrintValidationSheet,
  categories
}) => {
  const [currentStatus, setCurrentStatus] = useState<VerificationStatus>(document?.status || 'draft');
  const [notes, setNotes] = useState<string>(document?.supervisorNotes || '');
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  React.useEffect(() => {
    if (document) {
      setCurrentStatus(document.status);
      setNotes(document.supervisorNotes || '');
    }
  }, [document]);

  if (!isOpen || !document) return null;

  const matchedCat = categories?.find(c => c.id === document.category);
  const catCode = matchedCat?.code || CATEGORY_LABELS[document.category]?.code || 'DOC';
  const catName = matchedCat?.name || CATEGORY_LABELS[document.category]?.name || document.category;

  const handleSaveReview = () => {
    onUpdateStatus(document.id, currentStatus, notes);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
              {catCode}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-indigo-700 font-semibold">
                  {catName}
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="text-xs font-mono text-slate-500">
                  {document.approvalNumber || 'DOKUMEN-ARSIP'}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 line-clamp-1">
                {document.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="text-slate-500 font-medium mb-0.5">Mata Pelajaran</div>
              <div className="font-semibold text-slate-900">{document.subject}</div>
            </div>

            <div>
              <div className="text-slate-500 font-medium mb-0.5">Semester &amp; Kelas</div>
              <div className="font-semibold text-slate-900">
                Semester {document.semester === 'ganjil' ? 'Ganjil' : 'Genap'} · Kls {document.grade}
              </div>
            </div>

            <div>
              <div className="text-slate-500 font-medium mb-0.5">Tahun Ajaran</div>
              <div className="font-semibold text-slate-900">{document.academicYear}</div>
            </div>

            <div>
              <div className="text-slate-500 font-medium mb-0.5">Alokasi Waktu</div>
              <div className="font-semibold text-slate-900 font-mono">
                {document.alokasiJp ? `${document.alokasiJp} Jam Pelajaran` : 'Sesuai Kalender'}
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="text-slate-500 font-medium mb-0.5">Guru Pengampu / Penyusun</div>
              <div className="font-semibold text-slate-900">{document.teacherName}</div>
              <div className="text-[11px] text-slate-500 font-mono">NIP. {document.teacherNip}</div>
            </div>

            <div className="sm:col-span-2">
              <div className="text-slate-500 font-medium mb-0.5">Berkas Asli Terarsip</div>
              <div className="font-semibold text-slate-900 truncate">{document.originalFileName}</div>
              <div className="text-[11px] text-slate-500 font-mono">
                {(document.fileSize / 1024 / 1024).toFixed(2)} MB · Diunggah: {new Date(document.uploadDate).toLocaleDateString('id-ID', { dateStyle: 'long' })}
              </div>
            </div>
          </div>

          {/* Competencies / Tujuan Pembelajaran List */}
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Alur Tujuan Pembelajaran (ATP) &amp; Materi Esensial:</span>
            </div>
            {document.competencies && document.competencies.length > 0 ? (
              <ul className="space-y-2 border border-slate-200 rounded-xl p-3 bg-white divide-y divide-slate-100">
                {document.competencies.map((tp, idx) => (
                  <li key={idx} className="pt-2 first:pt-0 text-slate-700 flex items-start gap-2">
                    <span className="font-mono font-bold text-indigo-600 shrink-0">
                      {(idx + 1).toString().padStart(2, '0')}.
                    </span>
                    <span className="leading-relaxed">{tp}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-slate-500 italic p-3 bg-slate-50 rounded-lg">
                Tidak ada rincian kompetensi tertera.
              </div>
            )}
          </div>

          {/* Preview Snippet */}
          {document.contentPreview && (
            <div>
              <div className="text-slate-500 font-medium mb-1">Ringkasan Narasi Dokumen:</div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-mono text-[11px] leading-relaxed">
                {document.contentPreview}
              </div>
            </div>
          )}

          {/* Supervisor Validation Panel */}
          <div className="p-4 rounded-xl border-2 border-indigo-100 bg-indigo-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-700" />
                <span className="font-bold text-slate-900 text-xs">
                  Hasil Telaah &amp; Supervisi Waka Kurikulum
                </span>
              </div>
              {document.verifiedBy && (
                <span className="text-[11px] text-slate-500 font-medium">
                  Penelaah: {document.verifiedBy}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Status Pengesahan Dokumen
                </label>
                <select
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value as VerificationStatus)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 focus:border-indigo-600 focus:outline-none bg-white"
                >
                  <option value="draft">Draft (Konsep)</option>
                  <option value="diajukan">Diajukan Guru (Menunggu Review)</option>
                  <option value="diverifikasi">Diverifikasi Waka Kurikulum (Layak)</option>
                  <option value="disahkan">Disahkan Kepala Sekolah (Final SK)</option>
                  <option value="perlu_revisi">Perlu Revisi Guru</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tanggal Verifikasi
                </label>
                <div className="text-xs text-slate-600 py-1.5 font-mono">
                  {document.verificationDate 
                    ? new Date(document.verificationDate).toLocaleDateString('id-ID', { dateStyle: 'medium' }) 
                    : 'Belum ditandatangani'}
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Catatan Evaluasi / Rekomendasi Supervisi Waka Kurikulum:
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tuliskan catatan kelayakan, diferensiasi asesmen, atau perbaikan modul ajar..."
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:border-indigo-600 leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-emerald-700 text-xs font-medium">
                {isSavedNotice && '✓ Perubahan supervisi berhasil disimpan!'}
              </div>
              <button
                type="button"
                onClick={handleSaveReview}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Hasil Supervisi</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onPrintValidationSheet(document)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4 text-emerald-700" />
            <span>Cetak Lembar Pengesahan Resmi (Kop Sekolah)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
