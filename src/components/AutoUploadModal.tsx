import React, { useState, useRef, useEffect } from 'react';
import { 
  X, UploadCloud, FileText, CheckCircle2, Sparkles, AlertCircle, 
  Trash2, Plus, Info, Check, ShieldAlert, ArrowRight, Layers, 
  Upload, FileSpreadsheet, FileCheck, RefreshCw 
} from 'lucide-react';
import { 
  CurriculumDocument, DocumentCategory, GradeLevel, SemesterType, 
  CurriculumType, Teacher, SchoolProfile, CategoryItem 
} from '../types/curriculum';
import { 
  classifyCurriculumDocument, CATEGORY_LABELS, SUBJECT_DICTIONARY, 
  generateSuggestedCompetencies 
} from '../utils/documentClassifier';

interface CategoryUploadSlot {
  categoryId: string;
  file: File | { name: string; size: number };
  title: string;
  alokasiJp: number;
  competencies: string[];
  notes?: string;
}

interface StagedBatchFile {
  id: string;
  file: File | { name: string; size: number };
  title: string;
  category: DocumentCategory;
  subject: string;
  grade: GradeLevel;
  semester: SemesterType;
  academicYear: string;
  curriculumType: CurriculumType;
  teacherId: string;
  alokasiJp: number;
  competencies: string[];
  confidenceScore: number;
  tags: string[];
  notes: string;
}

interface AutoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDocuments: (newDocs: CurriculumDocument[]) => void;
  teachers: Teacher[];
  profile: SchoolProfile;
  currentSemester: SemesterType;
  categories: CategoryItem[];
  initialTeacherId?: string | null;
  initialCategoryId?: string | null;
}

export const AutoUploadModal: React.FC<AutoUploadModalProps> = ({
  isOpen,
  onClose,
  onSaveDocuments,
  teachers,
  profile,
  currentSemester,
  categories,
  initialTeacherId,
  initialCategoryId
}) => {
  // Mode selection: 'category_grid' (Pilihan Cepat per Kategori) or 'batch_scan' (Pemindaian Berkas Massal)
  const [activeTab, setActiveTab] = useState<'category_grid' | 'batch_scan'>('category_grid');

  // Teacher Context for Category-by-Category Quick Upload
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    initialTeacherId || (teachers[0]?.id || '')
  );
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('7');
  const [selectedSemester, setSelectedSemester] = useState<SemesterType>(currentSemester);
  const [selectedCurriculum, setSelectedCurriculum] = useState<CurriculumType>('Kurikulum Merdeka');

  // Slots for category-by-category uploads
  const [categorySlots, setCategorySlots] = useState<Record<string, CategoryUploadSlot>>({});

  // Staged files for batch scan mode
  const [stagedFiles, setStagedFiles] = useState<StagedBatchFile[]>([]);
  const [isDraggingBatch, setIsDraggingBatch] = useState(false);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  // Individual file input refs for each category
  const categoryFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Sync initial props when opened
  useEffect(() => {
    if (initialTeacherId) {
      setSelectedTeacherId(initialTeacherId);
    }
    if (currentSemester) {
      setSelectedSemester(currentSemester);
    }
  }, [initialTeacherId, currentSemester]);

  if (!isOpen) return null;

  const currentTeacher = teachers.find(t => t.id === selectedTeacherId) || teachers[0];
  const currentSubject = currentTeacher?.subject || 'Matematika';

  // Handle file chosen for a specific category slot
  const handleCategoryFileSelect = (cat: CategoryItem, file: File) => {
    const competencies = generateSuggestedCompetencies(currentSubject, selectedGrade, selectedSemester);
    const standardTitle = `${cat.name} ${currentSubject} Kelas ${selectedGrade} Semester ${selectedSemester === 'ganjil' ? 'Ganjil' : 'Genap'}`;

    setCategorySlots(prev => ({
      ...prev,
      [cat.id]: {
        categoryId: cat.id,
        file,
        title: standardTitle,
        alokasiJp: cat.defaultJp,
        competencies,
        notes: ''
      }
    }));
  };

  const handleRemoveCategorySlot = (categoryId: string) => {
    setCategorySlots(prev => {
      const copy = { ...prev };
      delete copy[categoryId];
      return copy;
    });
    const inputRef = categoryFileInputRefs.current[categoryId];
    if (inputRef) inputRef.value = '';
  };

  const handleUpdateCategorySlotField = (
    categoryId: string, 
    field: 'title' | 'alokasiJp', 
    value: string | number
  ) => {
    setCategorySlots(prev => {
      const slot = prev[categoryId];
      if (!slot) return prev;
      return {
        ...prev,
        [categoryId]: {
          ...slot,
          [field]: value
        }
      };
    });
  };

  // 1-Click Demo Presets: Fills all category upload fields with mock realistic documents
  const handleLoadAllDemoCategories = () => {
    const newSlots: Record<string, CategoryUploadSlot> = {};

    categories.forEach((cat) => {
      const fileExt = cat.id === 'promes' ? 'xlsx' : 'pdf';
      const cleanSub = currentSubject.replace(/[^a-zA-Z0-9]/g, '_');
      const fakeFileName = `${cat.code}_${cleanSub}_Kelas_${selectedGrade}_Sem_${selectedSemester === 'ganjil' ? '1' : '2'}.${fileExt}`;
      const mockFile = new File(['mock content for school curriculum archival'], fakeFileName, {
        type: fileExt === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf'
      });

      const comps = generateSuggestedCompetencies(currentSubject, selectedGrade, selectedSemester);
      const title = `${cat.name} ${currentSubject} Kelas ${selectedGrade} Semester ${selectedSemester === 'ganjil' ? 'Ganjil' : 'Genap'}`;

      newSlots[cat.id] = {
        categoryId: cat.id,
        file: mockFile,
        title,
        alokasiJp: cat.defaultJp,
        competencies: comps
      };
    });

    setCategorySlots(newSlots);
  };

  // --- BATCH SCAN LOGIC ---
  const processBatchFileList = (files: File[]) => {
    const newStaged: StagedBatchFile[] = [];

    files.forEach((file) => {
      const result = classifyCurriculumDocument(file.name, file.size);
      const matchedTeacher = teachers.find(t => 
        t.subject.toLowerCase().includes(result.detectedSubject.toLowerCase()) ||
        result.detectedSubject.toLowerCase().includes(t.subject.toLowerCase())
      ) || teachers[0];

      newStaged.push({
        id: `staged-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        file,
        title: result.detectedTitle,
        category: result.detectedCategory,
        subject: result.detectedSubject,
        grade: result.detectedGrade,
        semester: result.detectedSemester,
        academicYear: profile.currentAcademicYear,
        curriculumType: result.detectedCurriculum,
        teacherId: matchedTeacher ? matchedTeacher.id : '',
        alokasiJp: result.detectedJp,
        competencies: result.detectedCompetencies,
        confidenceScore: result.confidenceScore,
        tags: [result.detectedCurriculum, `Kelas ${result.detectedGrade}`, `Sem. ${result.detectedSemester}`],
        notes: ''
      });
    });

    setStagedFiles(prev => [...prev, ...newStaged]);
  };

  const handleBatchDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingBatch(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processBatchFileList(Array.from(e.dataTransfer.files));
    }
  };

  // --- SAVE ALL DOCUMENTS ---
  const handleSaveAll = () => {
    const now = new Date().toISOString();
    const finalDocs: CurriculumDocument[] = [];

    if (activeTab === 'category_grid') {
      const uploadedCategoriesList = Object.values(categorySlots);
      if (uploadedCategoriesList.length === 0) return;

      uploadedCategoriesList.forEach((slot, idx) => {
        const catInfo = categories.find(c => c.id === slot.categoryId);
        const catCode = catInfo?.code || 'DOC';
        const regNumber = `REG-KUR/SMP1/${profile.currentAcademicYear.substring(0, 4)}/${catCode}-${String(100 + idx)}`;

        finalDocs.push({
          id: `doc-${Date.now()}-${idx}`,
          title: slot.title,
          originalFileName: slot.file.name,
          fileSize: slot.file.size || 1850000,
          fileType: slot.file.name.split('.').pop()?.toLowerCase() || 'pdf',
          category: slot.categoryId,
          subject: currentSubject,
          grade: selectedGrade,
          semester: selectedSemester,
          academicYear: profile.currentAcademicYear,
          curriculumType: selectedCurriculum,
          teacherName: currentTeacher.name,
          teacherNip: currentTeacher.nip,
          alokasiJp: slot.alokasiJp,
          competencies: slot.competencies,
          uploadDate: now,
          lastModified: now,
          status: 'diajukan',
          supervisorNotes: 'Diunggah via Pilihan Cepat Kategori Guru. Menunggu telaah supervisi Waka Kurikulum.',
          approvalNumber: regNumber,
          contentPreview: `Dokumen resmi ${slot.title}. Disusun sesuai standar ${selectedCurriculum} Fase D SMP.`,
          tags: [selectedCurriculum, `Kelas ${selectedGrade}`, `Sem. ${selectedSemester}`, catCode]
        });
      });
    } else {
      if (stagedFiles.length === 0) return;

      stagedFiles.forEach((item, idx) => {
        const teacher = teachers.find(t => t.id === item.teacherId) || teachers[0];
        const matchedCat = categories.find(c => c.id === item.category);
        const catCode = matchedCat?.code || CATEGORY_LABELS[item.category]?.code || 'DOC';
        const regNumber = `REG-KUR/SMP1/${item.academicYear.substring(0, 4)}/${catCode}-${String(100 + idx)}`;

        finalDocs.push({
          id: `doc-${Date.now()}-${idx}`,
          title: item.title,
          originalFileName: item.file.name,
          fileSize: item.file.size || 1540000,
          fileType: item.file.name.split('.').pop()?.toLowerCase() || 'pdf',
          category: item.category,
          subject: item.subject,
          grade: item.grade,
          semester: item.semester,
          academicYear: item.academicYear,
          curriculumType: item.curriculumType,
          teacherName: teacher.name,
          teacherNip: teacher.nip,
          alokasiJp: item.alokasiJp,
          competencies: item.competencies,
          uploadDate: now,
          lastModified: now,
          status: 'diajukan',
          supervisorNotes: 'Diunggah via Sistem Ekstraksi Otomatis. Menunggu telaah kelayakan oleh Waka Kurikulum.',
          approvalNumber: regNumber,
          contentPreview: `Dokumen resmi ${item.title}. Disusun berdasarkan standar ${item.curriculumType} Fase D SMP.`,
          tags: item.tags
        });
      });
    }

    onSaveDocuments(finalDocs);
    setCategorySlots({});
    setStagedFiles([]);
    onClose();
  };

  const totalUploadedCount = activeTab === 'category_grid' 
    ? Object.keys(categorySlots).length 
    : stagedFiles.length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Pilihan Cepat Unggah Dokumen Kurikulum
                </h2>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-2 py-0.5">
                  Fase D · TP {profile.currentAcademicYear}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tersedia field unggah langsung untuk semua kategori perangkat ajar (Silabus, Modul Ajar, Promes, Prota, CP, dll).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-200 bg-white flex items-center justify-between gap-4">
          <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveTab('category_grid')}
              className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'category_grid'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Semua Kategori &amp; Field Unggah</span>
              {Object.keys(categorySlots).length > 0 && (
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-mono px-1.5 py-0.2 rounded-full">
                  {Object.keys(categorySlots).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('batch_scan')}
              className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'batch_scan'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pemindaian Massal (Auto-Batch)</span>
              {stagedFiles.length > 0 && (
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-mono px-1.5 py-0.2 rounded-full">
                  {stagedFiles.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'category_grid' && (
            <button
              type="button"
              onClick={handleLoadAllDemoCategories}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
              title="Isi simulasi file untuk semua kategori perangkat ajar dalam 1 klik"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Isi Berkas Contoh Semua Kategori</span>
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* TAB 1: ALL CATEGORIES & UPLOAD FIELDS */}
          {activeTab === 'category_grid' && (
            <div className="space-y-6">
              {/* Context Selector: Teacher, Subject, Grade, Semester */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                  1. Pilih Guru Pengampu &amp; Sasaran Kelas Pembelajaran:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Teacher Select */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Guru Pengampu
                    </label>
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-indigo-500"
                    >
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject (Auto-synced) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Mata Pelajaran
                    </label>
                    <div className="w-full text-xs font-semibold bg-slate-100 border border-slate-200 rounded-lg p-2 text-slate-800 truncate">
                      {currentSubject}
                    </div>
                  </div>

                  {/* Grade */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tingkat Kelas
                    </label>
                    <select
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value as GradeLevel)}
                      className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="7">Kelas 7 (Fase D)</option>
                      <option value="8">Kelas 8 (Fase D)</option>
                      <option value="9">Kelas 9 (Fase D)</option>
                    </select>
                  </div>

                  {/* Semester */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Semester
                    </label>
                    <select
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(e.target.value as SemesterType)}
                      className="w-full text-xs font-semibold bg-indigo-50 border border-indigo-300 rounded-lg p-2 text-indigo-900 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ganjil">Semester Ganjil (Gasal)</option>
                      <option value="genap">Semester Genap</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Category Upload Cards Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      2. Field Unggah Berkas per Kategori Perangkat Ajar:
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Setiap kategori memiliki tombol dan kolom unggah langsung. Guru dapat mengunggah berkas format PDF, DOCX, atau XLSX.
                    </p>
                  </div>

                  <span className="text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                    {Object.keys(categorySlots).length} dari {categories.length} kategori terisi
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categories.map((cat) => {
                    const uploadedItem = categorySlots[cat.id];
                    const isUploaded = Boolean(uploadedItem);
                    const isHighlight = initialCategoryId === cat.id;

                    return (
                      <div
                        key={cat.id}
                        className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
                          isUploaded
                            ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                            : isHighlight
                            ? 'bg-indigo-50/50 border-indigo-400 ring-2 ring-indigo-200'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        {/* Top: Category Title & Code */}
                        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs shrink-0 ${
                              isUploaded 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {cat.code}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900 leading-snug">
                                {cat.name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Default: {cat.defaultJp > 0 ? `${cat.defaultJp} JP` : 'Fleksibel'} {cat.isSupervisedInMatrix ? '· Wajib Matriks' : ''}
                              </div>
                            </div>
                          </div>

                          {isUploaded ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Siap
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              Belum ada berkas
                            </span>
                          )}
                        </div>

                        {/* Middle: Upload Field or Uploaded Details */}
                        <div className="py-3">
                          {isUploaded ? (
                            <div className="space-y-2.5">
                              {/* File name & size */}
                              <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border border-emerald-200">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-900 truncate text-[11px]">
                                      {uploadedItem.file.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {((uploadedItem.file.size || 1500000) / 1024 / 1024).toFixed(2)} MB
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => categoryFileInputRefs.current[cat.id]?.click()}
                                    className="p-1 text-slate-500 hover:text-indigo-600 rounded"
                                    title="Ganti Berkas"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCategorySlot(cat.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                    title="Hapus Berkas Ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Editable Title */}
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                  Judul Dokumen Resmi:
                                </label>
                                <input
                                  type="text"
                                  value={uploadedItem.title}
                                  onChange={(e) => handleUpdateCategorySlotField(cat.id, 'title', e.target.value)}
                                  className="w-full text-[11px] font-medium border border-slate-200 rounded p-1.5 bg-white focus:border-indigo-500 focus:outline-none"
                                />
                              </div>

                              {/* Editable JP */}
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 font-medium">Alokasi Waktu:</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={120}
                                  value={uploadedItem.alokasiJp}
                                  onChange={(e) => handleUpdateCategorySlotField(cat.id, 'alokasiJp', Number(e.target.value))}
                                  className="w-16 text-[11px] font-mono font-bold border border-slate-200 rounded p-1 text-center bg-white"
                                />
                                <span className="text-[10px] text-slate-400">Jam Pelajaran (JP)</span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              {/* Dedicated file picker button for this category */}
                              <input
                                type="file"
                                ref={(el) => {
                                  categoryFileInputRefs.current[cat.id] = el;
                                }}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleCategoryFileSelect(cat, f);
                                }}
                                accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx"
                                className="hidden"
                              />

                              <button
                                type="button"
                                onClick={() => categoryFileInputRefs.current[cat.id]?.click()}
                                className="w-full py-3 px-3 bg-slate-50 hover:bg-indigo-50/70 border border-dashed border-slate-300 hover:border-indigo-400 rounded-lg text-slate-600 hover:text-indigo-700 transition-all flex flex-col items-center justify-center gap-1 group cursor-pointer"
                              >
                                <UploadCloud className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:-translate-y-0.5" />
                                <span className="font-semibold text-[11px]">
                                  Pilih Berkas {cat.code}
                                </span>
                                <span className="text-[9px] text-slate-400">
                                  Klik atau tarik file PDF / DOCX di sini
                                </span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Bottom note */}
                        <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="truncate max-w-[240px]">
                            {cat.description || `Perangkat resmi ${cat.name}`}
                          </span>
                          {isUploaded && (
                            <span className="text-emerald-700 font-semibold font-mono text-[10px]">
                              ✓ Terindeks
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BATCH SCAN DROPZONE */}
          {activeTab === 'batch_scan' && (
            <div className="space-y-6">
              {/* Batch Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDraggingBatch(true); }}
                onDragLeave={() => setIsDraggingBatch(false)}
                onDrop={handleBatchDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  isDraggingBatch
                    ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={batchFileInputRef}
                  onChange={(e) => {
                    if (e.target.files) processBatchFileList(Array.from(e.target.files));
                  }}
                  multiple
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx"
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>

                <h3 className="text-sm font-semibold text-slate-800 mb-1">
                  Tarik &amp; Lepaskan Sekumpulan Berkas Kurikulum di Sini
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                  Sistem otomatis memindai nama berkas dan mengelompokkannya ke dalam kategori yang sesuai secara otomatis.
                </p>

                <button
                  type="button"
                  onClick={() => batchFileInputRef.current?.click()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  Pilih Berkas Sekaligus dari Komputer
                </button>
              </div>

              {/* Batch Staged Files List */}
              {stagedFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>Berkas Terdeteksi ({stagedFiles.length} berkas):</span>
                    <button
                      type="button"
                      onClick={() => setStagedFiles([])}
                      className="text-xs text-rose-600 hover:underline font-medium"
                    >
                      Bersihkan Semua
                    </button>
                  </div>

                  <div className="space-y-2">
                    {stagedFiles.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {item.file.name} · {item.subject} · Kelas {item.grade} · Sem. {item.semester}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setStagedFiles(prev => prev.filter(f => f.id !== item.id))}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info Banner */}
          <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-3 text-xs text-blue-800 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Kemudahan Supervisi Kurikulum:</strong> Dokumen yang diunggah akan otomatis memiliki nomor registrasi pengesahan unik dan masuk ke antrian telaah Waka Kurikulum untuk diterbitkan Lembar Pengesahan Resmi bertanda tangan digital.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            {totalUploadedCount > 0 ? (
              <span>
                Siap mengarsipkan <strong>{totalUploadedCount} berkas</strong> untuk TP {profile.currentAcademicYear}
              </span>
            ) : (
              <span>Pilih berkas pada kategori di atas untuk memulai pengunggahan</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg transition-colors"
            >
              Batal
            </button>

            <button
              type="button"
              disabled={totalUploadedCount === 0}
              onClick={handleSaveAll}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Simpan ke Arsip ({totalUploadedCount} Berkas)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
