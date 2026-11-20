import React, { useState, useRef, useEffect } from 'react';
import {
  X, UploadCloud, FileText, CheckCircle2, Trash2, RefreshCw, AlertCircle, Check
} from 'lucide-react';
import {
  CurriculumDocument, GradeLevel, SemesterType, Teacher, SchoolProfile,
  CategoryItem, DocumentFile, AppUserRole, SCHOOL_CLASS_VALUES
} from '../types/curriculum';

const MAX_CLOUD_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

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

export interface HomeroomEntry {
  homeroomClass: string;
  teacher: Teacher;
}

interface WalasUploadSlot {
  categoryId: string;
  file: File;
  title: string;
  notes: string;
}

interface WalasUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDocuments: (newDocs: CurriculumDocument[], attachedFiles?: DocumentFile[]) => Promise<void> | void;
  homeroomEntries: HomeroomEntry[];
  profile: SchoolProfile;
  currentSemester: SemesterType;
  currentAcademicYear: string;
  walasCategories: CategoryItem[];
  initialHomeroomClass?: string | null;
  initialCategoryId?: string | null;
  userRole: AppUserRole;
  lockedHomeroomClass?: string | null;
}

export const WalasUploadModal: React.FC<WalasUploadModalProps> = ({
  isOpen,
  onClose,
  onSaveDocuments,
  homeroomEntries,
  profile,
  currentSemester,
  currentAcademicYear,
  walasCategories,
  initialHomeroomClass,
  initialCategoryId,
  userRole,
  lockedHomeroomClass
}) => {
  const isWakaUser = userRole === 'waka_kurikulum';
  const [selectedClass, setSelectedClass] = useState<string>(
    lockedHomeroomClass || initialHomeroomClass || homeroomEntries[0]?.homeroomClass || ''
  );
  const [selectedSemester, setSelectedSemester] = useState<SemesterType>(currentSemester);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(
    currentAcademicYear || profile.currentAcademicYear || '2026/2027'
  );
  const [slots, setSlots] = useState<Record<string, WalasUploadSlot>>({});
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (lockedHomeroomClass) {
      setSelectedClass(lockedHomeroomClass);
    } else if (initialHomeroomClass) {
      setSelectedClass(initialHomeroomClass);
    } else if (homeroomEntries.length > 0) {
      setSelectedClass(prev =>
        homeroomEntries.some(e => e.homeroomClass === prev) ? prev : homeroomEntries[0].homeroomClass
      );
    }
    setSelectedSemester(currentSemester);
    setSelectedAcademicYear(currentAcademicYear || profile.currentAcademicYear || '2026/2027');
    setFileError(null);
  }, [isOpen, lockedHomeroomClass, initialHomeroomClass, homeroomEntries, currentSemester, currentAcademicYear, profile.currentAcademicYear]);

  useEffect(() => {
    if (isOpen && initialCategoryId) {
      const target = cardRefs.current[initialCategoryId];
      if (target) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [isOpen, initialCategoryId]);

  if (!isOpen) return null;

  const activeEntry =
    homeroomEntries.find(e => e.homeroomClass.toUpperCase() === selectedClass.toUpperCase()) ||
    homeroomEntries[0];

  const handleFileSelect = (cat: CategoryItem, file: File | null) => {
    setFileError(null);
    if (!file) return;
    if (file.size === 0) {
      setFileError(`Berkas "${file.name}" kosong (0 byte). Pilih file valid lainnya.`);
      return;
    }
    if (file.size > MAX_CLOUD_FILE_BYTES) {
      setFileError(`Berkas "${file.name}" melebihi batas maksimal 10 MB untuk penyimpanan Cloud.`);
      return;
    }

    const className = activeEntry?.homeroomClass || selectedClass || '-';
    const semLabel = selectedSemester === 'ganjil' ? 'Ganjil' : 'Genap';
    setSlots(prev => ({
      ...prev,
      [cat.id]: {
        categoryId: cat.id,
        file,
        title: `${cat.name} Kelas ${className} Semester ${semLabel}`,
        notes: ''
      }
    }));
  };

  const handleRemoveSlot = (catId: string) => {
    setSlots(prev => {
      const next = { ...prev };
      delete next[catId];
      return next;
    });
    const ref = fileInputRefs.current[catId];
    if (ref) ref.value = '';
  };

  const handleUpdateTitle = (catId: string, newTitle: string) => {
    setSlots(prev => {
      const current = prev[catId];
      if (!current) return prev;
      return { ...prev, [catId]: { ...current, title: newTitle } };
    });
  };

  const handleSaveAll = async () => {
    if (isSaving || !activeEntry) return;
    const slotList = Object.values(slots);
    if (slotList.length === 0) return;

    setIsSaving(true);
    setFileError(null);
    try {
      const now = new Date().toISOString();
      const classLabel = activeEntry.homeroomClass.toUpperCase();
      const derivedGrade = (
        SCHOOL_CLASS_VALUES.includes(classLabel as (typeof SCHOOL_CLASS_VALUES)[number])
          ? classLabel
          : classLabel.match(/^[789]/)?.[0] || '7.1'
      ) as GradeLevel;
      const finalDocs: CurriculumDocument[] = [];
      const attachedFiles: DocumentFile[] = [];

      for (let idx = 0; idx < slotList.length; idx++) {
        const slot = slotList[idx];
        const cat = walasCategories.find(c => c.id === slot.categoryId);
        const catCode = cat?.code || 'WALAS';
        const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
        const docId = `walas-${Date.now()}-${idx}-${suffix.toLowerCase()}`;
        const regNumber = `REG-WALAS/${selectedAcademicYear.substring(0, 4)}/${classLabel}/${catCode}-${suffix}`;

        let hasStoredFile = false;
        const dataUrl = await readFileDataUrl(slot.file);
        if (dataUrl) {
          hasStoredFile = true;
          attachedFiles.push({
            id: docId,
            documentId: docId,
            fileName: slot.file.name.slice(0, 255),
            mimeType: (slot.file.type || 'application/octet-stream').slice(0, 120),
            fileSize: slot.file.size,
            dataUrl,
            uploadedAt: now
          });
        }

        finalDocs.push({
          id: docId,
          title: slot.title.trim() || `${cat?.name || 'Administrasi Wali Kelas'} Kelas ${classLabel}`,
          originalFileName: slot.file.name.slice(0, 255),
          fileSize: slot.file.size,
          fileType: (slot.file.name.split('.').pop()?.toLowerCase() || 'file').slice(0, 20),
          category: slot.categoryId,
          archiveScope: 'wali_kelas',
          homeroomClass: classLabel,
          subject: `Wali Kelas ${classLabel}`,
          grade: derivedGrade,
          semester: selectedSemester,
          academicYear: selectedAcademicYear,
          curriculumType: 'Kurikulum Merdeka',
          teacherId: activeEntry.teacher.id,
          teacherName: activeEntry.teacher.name,
          teacherNip: activeEntry.teacher.nip,
          teacherEmail: activeEntry.teacher.email,
          alokasiJp: 0,
          uploadDate: now,
          lastModified: now,
          status: 'diajukan',
          supervisorNotes: 'Diunggah oleh Wali Kelas. Menunggu telaah dan verifikasi Waka Kurikulum.',
          approvalNumber: regNumber,
          contentPreview: `Arsip administrasi Wali Kelas ${classLabel} (${activeEntry.teacher.name}) untuk Semester ${selectedSemester === 'ganjil' ? 'Ganjil' : 'Genap'} TP ${selectedAcademicYear}.`,
          hasStoredFile,
          tags: ['Wali Kelas', `Kelas ${classLabel}`, `Sem. ${selectedSemester}`, catCode]
        });
      }

      await onSaveDocuments(finalDocs, attachedFiles);
      setSlots({});
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const readyCount = Object.keys(slots).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">
                Unggah Dokumen Administrasi Wali Kelas
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                TP {selectedAcademicYear} · Mendukung semua format file (PDF, Word, Excel, Gambar, dll. maks. 10 MB)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {homeroomEntries.length === 0 ? (
            <div className="p-6 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-center space-y-2">
              <div className="font-bold text-sm">Belum Ada Guru yang Ditetapkan sebagai Wali Kelas</div>
              <p className="text-xs text-amber-800">
                Waka Kurikulum perlu menetapkan guru sebagai Wali Kelas beserta pilihan kelas (mis. Kelas 7.1, 8.2) di menu <strong>Data Guru &amp; Waka</strong> terlebih dahulu.
              </p>
            </div>
          ) : (
            <>
              {/* Target Class & Period */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Kelas Binaan &amp; Wali Kelas
                  </label>
                  {isWakaUser && !lockedHomeroomClass ? (
                    <select
                      value={activeEntry?.homeroomClass || ''}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                    >
                      {homeroomEntries.map(entry => (
                        <option key={entry.homeroomClass} value={entry.homeroomClass}>
                          Kelas {entry.homeroomClass} — {entry.teacher.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg p-2 text-emerald-800">
                      Kelas {activeEntry?.homeroomClass} · {activeEntry?.teacher.name}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Semester
                  </label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value as SemesterType)}
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="ganjil">Semester Ganjil</option>
                    <option value="genap">Semester Genap</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tahun Pelajaran
                  </label>
                  <select
                    value={selectedAcademicYear}
                    onChange={(e) => setSelectedAcademicYear(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="2026/2027">2026/2027</option>
                    <option value="2025/2026">2025/2026</option>
                    <option value="2024/2025">2024/2025</option>
                    <option value="2023/2024">2023/2024</option>
                  </select>
                </div>
              </div>

              {fileError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{fileError}</span>
                </div>
              )}

              {/* Category Upload Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {walasCategories.map((cat) => {
                  const slot = slots[cat.id];
                  const isHighlighted = initialCategoryId === cat.id;

                  return (
                    <div
                      key={cat.id}
                      ref={(el) => {
                        cardRefs.current[cat.id] = el;
                      }}
                      className={`rounded-xl border p-4 transition-colors ${
                        slot
                          ? 'border-emerald-300 bg-emerald-50/40'
                          : isHighlighted
                          ? 'border-indigo-400 bg-indigo-50/40 ring-2 ring-indigo-200'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="min-w-0">
                          <div className="text-[11px] font-mono font-bold text-emerald-700">
                            {cat.code}
                          </div>
                          <div className="font-bold text-slate-900 text-xs leading-snug">
                            {cat.name}
                          </div>
                          {cat.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                              {cat.description}
                            </p>
                          )}
                        </div>
                        {slot && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        )}
                      </div>

                      <input
                        ref={(el) => {
                          fileInputRefs.current[cat.id] = el;
                        }}
                        type="file"
                        onChange={(e) => handleFileSelect(cat, e.target.files?.[0] || null)}
                        className="hidden"
                      />

                      {slot ? (
                        <div className="space-y-2.5 pt-1">
                          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-emerald-200">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-800 truncate text-[11px]">
                                  {slot.file.name}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                                  {(slot.file.size / 1024).toFixed(1)} KB
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveSlot(cat.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                              title="Hapus pilihan file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <input
                            type="text"
                            value={slot.title}
                            onChange={(e) => handleUpdateTitle(cat.id, e.target.value)}
                            placeholder="Judul dokumen..."
                            className="w-full text-[11px] font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:border-emerald-600 focus:outline-none"
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[cat.id]?.click()}
                          className="w-full mt-1 py-2.5 px-3 rounded-lg border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/40 text-slate-600 hover:text-emerald-800 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <UploadCloud className="w-4 h-4" />
                          <span>Pilih Berkas {cat.code}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-600 tabular-nums">
            <strong className="text-slate-900">{readyCount}</strong> berkas siap diajukan ke telaah Waka Kurikulum
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isSaving || readyCount === 0 || homeroomEntries.length === 0}
              onClick={handleSaveAll}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Mengunggah...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan &amp; Ajukan Telaah ({readyCount})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
