import React, { useState, useEffect } from 'react';
import { 
  X, ShieldCheck, Printer, Save, BookOpen, 
  Send, UploadCloud, AlertTriangle, CheckCircle2, Eye, EyeOff
} from 'lucide-react';
import { 
  CurriculumDocument, VerificationStatus, CategoryItem, 
  AppUserRole, DocumentFile 
} from '../types/curriculum';
import { CATEGORY_LABELS } from '../utils/documentClassifier';
import { getDocumentFileFromFirestore } from '../services/firestoreService';
import { UniversalFilePreview } from './UniversalFilePreview';

const MAX_CLOUD_FILE_BYTES = 10 * 1024 * 1024; // 10 MB langsung ke Cloud Firestore

function dataUrlToBlobUrl(dataUrl: string): string | null {
  try {
    const [header, base64] = dataUrl.split(',');
    if (!base64) return dataUrl;
    const mimeMatch = header.match(/data:([^;]+);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
  } catch {
    return dataUrl;
  }
}

interface DocumentDetailModalProps {
  document: CurriculumDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (docId: string, newStatus: VerificationStatus, supervisorNotes: string) => void;
  onResubmitRevision?: (
    doc: CurriculumDocument,
    newAttachedFile?: DocumentFile
  ) => Promise<void>;
  onPrintValidationSheet: (doc: CurriculumDocument) => void;
  onRequestEditUpload?: (doc: CurriculumDocument) => void;
  categories?: CategoryItem[];
  userRole: AppUserRole;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  isOpen,
  onClose,
  onUpdateStatus,
  onResubmitRevision,
  onPrintValidationSheet,
  onRequestEditUpload,
  categories,
  userRole
}) => {
  const [currentStatus, setCurrentStatus] = useState<VerificationStatus>(document?.status || 'draft');
  const [notes, setNotes] = useState<string>(document?.supervisorNotes || '');
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  // Stored file fetching & universal inline preview
  const [storedFile, setStoredFile] = useState<DocumentFile | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState(true);

  // Teacher revision resubmit state
  const [revisionFile, setRevisionFile] = useState<File | null>(null);
  const [isResubmitting, setIsResubmitting] = useState(false);

  useEffect(() => {
    if (document) {
      setCurrentStatus(document.status);
      setNotes(document.supervisorNotes || '');
      setRevisionFile(null);
      setShowFilePreview(true);
      setStoredFile(null);

      setIsLoadingFile(true);
      getDocumentFileFromFirestore(document.id)
        .then((f) => setStoredFile(f))
        .finally(() => setIsLoadingFile(false));
    }
  }, [document]);

  // Blob URL for reliable PDF/media/image preview & multi-MB downloads
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storedFile?.dataUrl || storedFile.dataUrl === 'CHUNKED') {
      setBlobUrl(null);
      return;
    }
    const created = dataUrlToBlobUrl(storedFile.dataUrl);
    setBlobUrl(created);
    return () => {
      if (created && created.startsWith('blob:')) {
        URL.revokeObjectURL(created);
      }
    };
  }, [storedFile]);

  if (!isOpen || !document) return null;

  const docScope = document.archiveScope || 'kurikulum';
  const isWalasDoc = docScope === 'wali_kelas';
  const isSuratIzinDoc = docScope === 'surat_izin';
  const isLainnyaDoc = docScope === 'lainnya';
  const matchedCat = categories?.find(c => c.id === document.category);
  const catCode = matchedCat?.code || CATEGORY_LABELS[document.category]?.code || 'DOC';
  const catName = matchedCat?.name || CATEGORY_LABELS[document.category]?.name || document.category;
  const isWaka = userRole === 'waka_kurikulum';

  const handleSaveReview = () => {
    onUpdateStatus(document.id, currentStatus, notes);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  const handleDownloadStoredFile = () => {
    if (!storedFile) return;
    const targetUrl = blobUrl || storedFile.dataUrl;
    const link = window.document.createElement('a');
    link.href = targetUrl;
    link.download = storedFile.fileName || document.originalFileName;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleGuruResubmit = async () => {
    if (!onResubmitRevision) return;
    if (revisionFile && revisionFile.size > MAX_CLOUD_FILE_BYTES) return;
    setIsResubmitting(true);
    try {
      let newFilePayload: DocumentFile | undefined;
      if (revisionFile && revisionFile.size <= MAX_CLOUD_FILE_BYTES) {
        const dataUrl = await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(revisionFile);
        });
        if (dataUrl) {
          newFilePayload = {
            id: document.id,
            documentId: document.id,
            fileName: revisionFile.name.slice(0, 255),
            mimeType: (revisionFile.type || 'application/octet-stream').slice(0, 120),
            fileSize: revisionFile.size,
            dataUrl,
            uploadedAt: new Date().toISOString()
          };
        }
      }

      const updatedDoc: CurriculumDocument = {
        ...document,
        originalFileName: revisionFile ? revisionFile.name.slice(0, 255) : document.originalFileName,
        fileSize: revisionFile ? revisionFile.size : document.fileSize,
        fileType: revisionFile
          ? (revisionFile.name.split('.').pop()?.toLowerCase() || 'file').slice(0, 20)
          : document.fileType,
        externalFileUrl: newFilePayload ? undefined : document.externalFileUrl,
        hasStoredFile: newFilePayload ? true : document.hasStoredFile,
        status: 'diajukan',
        lastModified: new Date().toISOString()
      };

      await onResubmitRevision(updatedDoc, newFilePayload);
      if (newFilePayload) setStoredFile(newFilePayload);
      setRevisionFile(null);
      setIsSavedNotice(true);
      setTimeout(() => setIsSavedNotice(false), 2500);
    } finally {
      setIsResubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
              {catCode}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-indigo-700 font-semibold truncate">
                  {catName}
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="text-xs font-mono text-slate-500 shrink-0">
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
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="text-slate-500 font-medium mb-0.5">
                {isWalasDoc
                  ? 'Kelas Binaan'
                  : isSuratIzinDoc
                  ? 'Tanggal Izin Guru'
                  : isLainnyaDoc
                  ? 'Jenis Arsip'
                  : 'Mata Pelajaran'}
              </div>
              <div className="font-semibold text-slate-900">
                {isWalasDoc
                  ? `Kelas ${document.homeroomClass || document.grade}`
                  : isSuratIzinDoc
                  ? `${document.leaveStartDate || '-'}${document.leaveEndDate && document.leaveEndDate !== document.leaveStartDate ? ` s.d. ${document.leaveEndDate}` : ''}`
                  : document.subject}
              </div>
            </div>

            <div>
              <div className="text-slate-500 font-medium mb-0.5">
                {isWalasDoc
                  ? 'Semester'
                  : isSuratIzinDoc
                  ? 'Kelas Terdampak'
                  : isLainnyaDoc
                  ? 'Semester'
                  : 'Semester & Kelas'}
              </div>
              <div className="font-semibold text-slate-900">
                {isWalasDoc || isLainnyaDoc
                  ? `Semester ${document.semester === 'ganjil' ? 'Ganjil' : 'Genap'}`
                  : isSuratIzinDoc
                  ? document.affectedClasses || '-'
                  : `Semester ${document.semester === 'ganjil' ? 'Ganjil' : 'Genap'} · Kls ${document.grade}`}
              </div>
            </div>

            <div>
              <div className="text-slate-500 font-medium mb-0.5">Tahun Ajaran</div>
              <div className="font-semibold text-slate-900">{document.academicYear}</div>
            </div>

            <div>
              <div className="text-slate-500 font-medium mb-0.5">
                {isWalasDoc
                  ? 'Lingkup Arsip'
                  : isSuratIzinDoc
                  ? 'Guru Pengganti'
                  : isLainnyaDoc
                  ? 'Lingkup Arsip'
                  : 'Alokasi Waktu'}
              </div>
              <div className="font-semibold text-slate-900 font-mono">
                {isWalasDoc
                  ? 'Administrasi Wali Kelas'
                  : isSuratIzinDoc
                  ? document.substituteTeacher || '-'
                  : isLainnyaDoc
                  ? 'Arsip Lainnya (Non-Walas)'
                  : (document.alokasiJp ? `${document.alokasiJp} Jam Pelajaran` : 'Sesuai Kalender')}
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="text-slate-500 font-medium mb-0.5">
                {isWalasDoc ? 'Wali Kelas Penyusun' : 'Guru Pengampu / Penyusun'}
              </div>
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

          {/* Universal File Preview (Images, PDF, Word, Excel, PowerPoint, Text, Media, Any File) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 text-xs">
                Pratinjau Berkas Unggahan
              </div>
              {storedFile && (
                <button
                  type="button"
                  onClick={() => setShowFilePreview(prev => !prev)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer"
                >
                  {showFilePreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showFilePreview ? 'Sembunyikan Pratinjau' : 'Tampilkan Pratinjau'}</span>
                </button>
              )}
            </div>

            {showFilePreview && (
              <UniversalFilePreview
                storedFile={storedFile}
                blobUrl={blobUrl}
                documentMeta={document}
                isLoading={isLoadingFile}
                onDownload={storedFile ? handleDownloadStoredFile : undefined}
                onRequestUpload={onRequestEditUpload ? () => onRequestEditUpload(document) : undefined}
              />
            )}
          </div>

          {/* Competencies / Tujuan Pembelajaran List (Curriculum docs only) */}
          {!isWalasDoc && (
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
          )}

          {/* Preview Snippet */}
          {document.contentPreview && (
            <div>
              <div className="text-slate-500 font-medium mb-1">Ringkasan Narasi Dokumen:</div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-mono text-[11px] leading-relaxed">
                {document.contentPreview}
              </div>
            </div>
          )}

          {/* Role-Aware Supervision Panel: Editable ONLY for Waka Kurikulum, Read-only + Resubmit for Guru */}
          {isWaka ? (
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Hasil Supervisi</span>
                </button>
              </div>
            </div>
          ) : (
            <div className={`p-4 rounded-xl border space-y-3 ${
              document.status === 'perlu_revisi'
                ? 'border-rose-300 bg-rose-50/60'
                : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  {document.status === 'perlu_revisi' ? (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  )}
                  <span>Status &amp; Catatan Telaah Waka Kurikulum</span>
                </div>
                <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                  {document.status.replace('_', ' ')}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 text-slate-700 italic leading-relaxed">
                &ldquo;{document.supervisorNotes || 'Belum ada catatan telaah dari Waka Kurikulum.'}&rdquo;
              </div>

              {(document.status === 'perlu_revisi' || document.status === 'draft') && onResubmitRevision && (
                <div className="pt-2 border-t border-slate-200/80 space-y-2.5">
                  <div className="font-bold text-slate-800">
                    Kirim Perbaikan &amp; Ajukan Ulang ke Waka Kurikulum:
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Unggah Berkas Revisi (Semua format file, maks. 10 MB):
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2.5 bg-white border border-dashed border-slate-300 hover:border-indigo-400 rounded-lg cursor-pointer text-[11px] font-medium text-slate-700">
                      <UploadCloud className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="truncate">
                        {revisionFile ? `${revisionFile.name} (${(revisionFile.size / 1024).toFixed(0)} KB)` : 'Pilih file revisi baru (PDF, Word, Excel, JPG/PNG, dll.)...'}
                      </span>
                      <input
                        type="file"
                        onChange={(e) => setRevisionFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                    {revisionFile && revisionFile.size > MAX_CLOUD_FILE_BYTES && (
                      <p className="text-[10px] text-rose-600 mt-1">
                        Ukuran file melebihi batas Cloud 10 MB. Harap kompres berkas terlebih dahulu sebelum mengunggah.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-emerald-700 font-medium">
                      {isSavedNotice && '✓ Revisi berhasil dikirim ke Waka Kurikulum!'}
                    </span>
                    <button
                      type="button"
                      disabled={isResubmitting || Boolean(revisionFile && revisionFile.size > MAX_CLOUD_FILE_BYTES)}
                      onClick={handleGuruResubmit}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs cursor-pointer disabled:opacity-60"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isResubmitting ? 'Mengirim...' : 'Ajukan Ulang untuk Telaah'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onPrintValidationSheet(document)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-700" />
            <span>Cetak Lembar Pengesahan Resmi (Kop Sekolah)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
