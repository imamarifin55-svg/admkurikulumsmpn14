import React, { useState } from 'react';
import { CurriculumDocument, VerificationStatus, SchoolProfile } from '../types/curriculum';
import { CATEGORY_LABELS } from '../utils/documentClassifier';
import { 
  ShieldCheck, CheckCircle2, Clock, AlertTriangle, FileText, 
  MessageSquare, Check, RotateCcw, Eye, Printer, Sparkles 
} from 'lucide-react';

interface SupervisionViewProps {
  documents: CurriculumDocument[];
  profile: SchoolProfile;
  onUpdateDocumentStatus: (docId: string, status: VerificationStatus, notes: string) => void;
  onSelectDocument: (doc: CurriculumDocument) => void;
  onPrintValidationSheet: (doc: CurriculumDocument) => void;
}

export const SupervisionView: React.FC<SupervisionViewProps> = ({
  documents,
  profile,
  onUpdateDocumentStatus,
  onSelectDocument,
  onPrintValidationSheet
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('diajukan');
  const [activeNotesId, setActiveNotesId] = useState<string | null>(null);
  const [customNote, setCustomNote] = useState<string>('');

  const filteredDocs = documents.filter(doc => {
    if (filterStatus === 'all') return true;
    return doc.status === filterStatus;
  });

  const handleQuickApprove = (doc: CurriculumDocument) => {
    onUpdateDocumentStatus(
      doc.id, 
      'disahkan', 
      'Telah ditelaah dan memenuhi kriteria kelayakan kurikulum operasional sekolah.'
    );
  };

  const handleRequestRevision = (doc: CurriculumDocument) => {
    const noteText = customNote.trim() || 'Perlu penyesuaian alokasi waktu dan instrumen asesmen formatif.';
    onUpdateDocumentStatus(doc.id, 'perlu_revisi', noteText);
    setActiveNotesId(null);
    setCustomNote('');
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Panel Supervisi &amp; Pengesahan Waka Kurikulum
            </h2>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
              Supervisi Aktif
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Penelaahan instrumen silabus, alur tujuan pembelajaran, dan modul ajar untuk memastikan keselarasan kurikulum sebelum disahkan Kepala Sekolah.
          </p>
        </div>

        {/* Filter Tab by Status */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0 text-xs">
          <button
            onClick={() => setFilterStatus('diajukan')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
              filterStatus === 'diajukan'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Antrian Telaah ({documents.filter(d => d.status === 'diajukan').length})
          </button>
          <button
            onClick={() => setFilterStatus('diverifikasi')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
              filterStatus === 'diverifikasi'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Terverifikasi Waka ({documents.filter(d => d.status === 'diverifikasi').length})
          </button>
          <button
            onClick={() => setFilterStatus('disahkan')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
              filterStatus === 'disahkan'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Disahkan ({documents.filter(d => d.status === 'disahkan').length})
          </button>
          <button
            onClick={() => setFilterStatus('perlu_revisi')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
              filterStatus === 'perlu_revisi'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Revisi ({documents.filter(d => d.status === 'perlu_revisi').length})
          </button>
        </div>
      </div>

      {/* Document Queue */}
      <div className="space-y-4">
        {filteredDocs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">
              Tidak ada dokumen pada status ini
            </h3>
            <p className="text-xs text-slate-500">
              Semua dokumen kurikulum dalam kategori ini telah selesai ditindaklanjuti.
            </p>
          </div>
        ) : (
          filteredDocs.map((doc) => {
            return (
              <div
                key={doc.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Document info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        {CATEGORY_LABELS[doc.category]?.code || 'DOC'}
                      </span>
                      <span className="text-xs text-slate-500">
                        Semester {doc.semester === 'ganjil' ? 'Ganjil' : 'Genap'} · Kelas {doc.grade} (Fase D)
                      </span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-xs font-mono text-slate-400">
                        {doc.approvalNumber}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 hover:text-indigo-700 cursor-pointer" onClick={() => onSelectDocument(doc)}>
                      {doc.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span>Mata Pelajaran: <strong>{doc.subject}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>Guru: <strong>{doc.teacherName}</strong> (NIP. {doc.teacherNip})</span>
                      <span aria-hidden="true">·</span>
                      <span>Alokasi: <strong className="font-mono">{doc.alokasiJp || 36} JP</strong></span>
                    </div>

                    {/* Competency preview */}
                    {doc.competencies && doc.competencies.length > 0 && (
                      <div className="text-xs text-slate-500 pt-1 line-clamp-1">
                        🎯 Fokus: {doc.competencies[0]}
                      </div>
                    )}

                    {/* Supervisor Notes if any */}
                    {doc.supervisorNotes && (
                      <div className="text-xs text-slate-600 italic bg-slate-50 border border-slate-200 rounded-lg p-2.5 mt-2 flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>Catatan Waka Kurikulum: &ldquo;{doc.supervisorNotes}&rdquo;</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Quick Action Controls */}
                  <div className="flex flex-wrap lg:flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectDocument(doc)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detail
                      </button>

                      <button
                        onClick={() => onPrintValidationSheet(doc)}
                        className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" /> Lembar Sah
                      </button>
                    </div>

                    {doc.status !== 'disahkan' && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleQuickApprove(doc)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Sahkan Kelayakan
                        </button>

                        <button
                          onClick={() => {
                            setActiveNotesId(activeNotesId === doc.id ? null : doc.id);
                            setCustomNote(doc.supervisorNotes || '');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Minta Revisi
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline Revision Input Form */}
                {activeNotesId === doc.id && (
                  <div className="mt-4 pt-3 border-t border-slate-200 bg-rose-50/50 rounded-lg p-3 space-y-2">
                    <label className="block text-xs font-semibold text-rose-800">
                      Uraikan catatan telaah perbaikan untuk guru penyusun:
                    </label>
                    <textarea
                      rows={2}
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                      placeholder="Contoh: Format alokasi waktu pada bab 2 melebihi standar pekan efektif. Harap diselaraskan..."
                      className="w-full text-xs border border-rose-200 rounded-lg p-2 bg-white focus:outline-none focus:border-rose-500"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setActiveNotesId(null)}
                        className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => handleRequestRevision(doc)}
                        className="px-3 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-xs"
                      >
                        Kirim Catatan Revisi
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
