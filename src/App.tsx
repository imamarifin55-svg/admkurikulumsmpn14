/**
 * ArsipKurikulum - Sistem Administrasi Kurikulum & Silabus Sekolah Profesional
 * Dirancang untuk Waka Kurikulum, Kepala Sekolah, dan Guru Mata Pelajaran
 */

import React, { useState, useEffect } from 'react';
import { 
  CurriculumDocument, SchoolProfile, Teacher, SemesterType, 
  VerificationStatus, DocumentCategory, CategoryItem, AppUser, AppUserRole 
} from './types/curriculum';
import { 
  INITIAL_DOCUMENTS, INITIAL_SCHOOL_PROFILE, INITIAL_TEACHERS, INITIAL_CATEGORIES 
} from './data/initialCurriculumData';

import { 
  subscribeToDocuments, saveDocumentToFirestore, 
  batchSaveDocumentsToFirestore, deleteDocumentFromFirestore,
  subscribeToSchoolProfile, saveSchoolProfileToFirestore
} from './services/firestoreService';
import { testFirestoreConnection, auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { SchoolBanner } from './components/SchoolBanner';
import { SemesterControls } from './components/SemesterControls';
import { CurriculumList } from './components/CurriculumList';
import { CurriculumMatrix } from './components/CurriculumMatrix';
import { SupervisionView } from './components/SupervisionView';
import { ReportsView } from './components/ReportsView';
import { SchoolProfileView } from './components/SchoolProfileView';
import { CategoryManagementView } from './components/CategoryManagementView';
import { AutoUploadModal } from './components/AutoUploadModal';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { EditDocumentModal } from './components/EditDocumentModal';
import { PrintValidationSheet } from './components/PrintValidationSheet';

const STORAGE_KEY = 'arsip_kurikulum_documents_v1';
const PROFILE_STORAGE_KEY = 'arsip_kurikulum_profile_v1';
const CATEGORIES_STORAGE_KEY = 'arsip_kurikulum_categories_v1';

export default function App() {
  // Load documents from localStorage or initial seed
  const [documents, setDocuments] = useState<CurriculumDocument[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load stored curriculum documents:', e);
    }
    return INITIAL_DOCUMENTS;
  });

  // Load school profile from localStorage or initial seed
  const [profile, setProfile] = useState<SchoolProfile>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load school profile:', e);
    }
    return INITIAL_SCHOOL_PROFILE;
  });

  // Load categories from localStorage or initial seed
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load curriculum categories:', e);
    }
    return INITIAL_CATEGORIES;
  });

  const [teachers] = useState<Teacher[]>(INITIAL_TEACHERS);

  // User & Role State: 'waka_kurikulum' (Dashboard Utama) vs 'guru' (Hanya berkas sendiri)
  const [currentUser, setCurrentUser] = useState<AppUser>({
    uid: 'waka-01',
    email: 'imamarifin55@admin.smp.belajar.id',
    displayName: 'Waka Kurikulum',
    role: 'waka_kurikulum'
  });

  const [isCloudSynced, setIsCloudSynced] = useState(true);

  // Active filters and views
  const [academicYear, setAcademicYear] = useState<string>(profile.currentAcademicYear || '2025/2026');
  const [currentSemester, setCurrentSemester] = useState<SemesterType>(profile.currentSemester || 'ganjil');
  const [activeView, setActiveView] = useState<'matrix' | 'list' | 'supervision' | 'reports' | 'profile' | 'categories'>('matrix');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<CurriculumDocument | null>(null);
  const [editDoc, setEditDoc] = useState<CurriculumDocument | null>(null);
  const [printDoc, setPrintDoc] = useState<CurriculumDocument | null>(null);

  // Toast / feedback notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Test Firestore and subscribe to Firebase Auth changes
  useEffect(() => {
    testFirestoreConnection();
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email || '';
        const isWaka = email === 'imamarifin55@admin.smp.belajar.id';
        const matched = teachers.find(t => t.email.toLowerCase() === email.toLowerCase());

        setCurrentUser({
          uid: firebaseUser.uid,
          email,
          displayName: firebaseUser.displayName || (isWaka ? 'Waka Kurikulum' : 'Guru Pengampu'),
          role: isWaka ? 'waka_kurikulum' : 'guru',
          teacherId: matched ? matched.id : (isWaka ? undefined : teachers[0].id)
        });
      }
    });

    return () => unsubAuth();
  }, [teachers]);

  // 2. Real-time Firestore sync for Documents
  useEffect(() => {
    const unsubDocs = subscribeToDocuments((remoteDocs) => {
      if (remoteDocs && remoteDocs.length > 0) {
        setDocuments(remoteDocs);
        setIsCloudSynced(true);
      }
    });

    const unsubProfile = subscribeToSchoolProfile((remoteProfile) => {
      if (remoteProfile) {
        setProfile(remoteProfile);
      }
    });

    return () => {
      unsubDocs();
      unsubProfile();
    };
  }, []);

  // Sync documents to localStorage as backup
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    } catch (e) {
      console.warn('Failed to persist curriculum documents:', e);
    }
  }, [documents]);

  // Sync profile to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn('Failed to persist school profile:', e);
    }
  }, [profile]);

  // Sync categories to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    } catch (e) {
      console.warn('Failed to persist categories:', e);
    }
  }, [categories]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleRoleChange = (role: AppUserRole, teacherId?: string) => {
    const matched = teachers.find(t => t.id === teacherId);
    setCurrentUser(prev => ({
      ...prev,
      role,
      teacherId,
      displayName: role === 'waka_kurikulum' ? 'Waka Kurikulum' : (matched?.name || 'Guru Pengampu')
    }));

    if (role === 'guru') {
      showToast(`Beralih ke Portal Guru: ${matched?.name || 'Guru'}. Hanya menampilkan berkas Anda.`);
      if (activeView === 'supervision' || activeView === 'reports' || activeView === 'profile' || activeView === 'categories') {
        setActiveView('matrix');
      }
    } else {
      showToast('Beralih ke Dashboard Utama Waka Kurikulum (Akses Penuh Seluruh Sekolah).');
    }
  };

  // Add new documents from automatic upload modal
  const handleSaveDocuments = async (newDocs: CurriculumDocument[]) => {
    setDocuments(prev => [...newDocs, ...prev]);
    showToast(`Berhasil mengarsipkan ${newDocs.length} berkas kurikulum ke database.`);
    try {
      await batchSaveDocumentsToFirestore(newDocs);
    } catch (e) {
      console.warn('Failed to save to Firestore:', e);
    }
  };

  // Update existing document from Edit Modal
  const handleSaveEditedDocument = async (updatedDoc: CurriculumDocument) => {
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    if (selectedDoc?.id === updatedDoc.id) {
      setSelectedDoc(updatedDoc);
    }
    showToast(`Perubahan berkas "${updatedDoc.title}" berhasil disimpan.`);
    try {
      await saveDocumentToFirestore(updatedDoc);
    } catch (e) {
      console.warn('Failed to update Firestore:', e);
    }
  };

  // Save updated school profile
  const handleSaveProfile = async (updatedProfile: SchoolProfile) => {
    setProfile(updatedProfile);
    showToast('Profil sekolah dan logo berhasil diperbarui.');
    try {
      await saveSchoolProfileToFirestore(updatedProfile);
    } catch (e) {
      console.warn('Failed to sync profile to Firestore:', e);
    }
  };

  // Add new category
  const handleAddCategory = (newCat: CategoryItem) => {
    setCategories(prev => [...prev, newCat]);
    showToast(`Kategori "${newCat.name}" berhasil ditambahkan.`);
  };

  // Update category
  const handleUpdateCategory = (updatedCat: CategoryItem) => {
    setCategories(prev => prev.map(c => c.id === updatedCat.id ? updatedCat : c));
    showToast(`Kategori "${updatedCat.name}" berhasil diperbarui.`);
  };

  // Delete category
  const handleDeleteCategory = (catId: string) => {
    setCategories(prev => prev.filter(c => c.id !== catId));
    showToast('Kategori perangkat pembelajaran telah dihapus.');
  };

  // Update verification status and notes
  const handleUpdateDocumentStatus = async (
    docId: string, 
    newStatus: VerificationStatus, 
    supervisorNotes: string
  ) => {
    const now = new Date().toISOString();
    let updatedDocInstance: CurriculumDocument | null = null;

    setDocuments(prev => prev.map(d => {
      if (d.id === docId) {
        const updated = {
          ...d,
          status: newStatus,
          supervisorNotes,
          verificationDate: now,
          verifiedBy: `${profile.curriculumViceName} (Waka Kurikulum)`,
          lastModified: now
        };
        updatedDocInstance = updated;
        return updated;
      }
      return d;
    }));

    if (selectedDoc && selectedDoc.id === docId) {
      setSelectedDoc(prev => prev ? {
        ...prev,
        status: newStatus,
        supervisorNotes,
        verificationDate: now,
        verifiedBy: `${profile.curriculumViceName} (Waka Kurikulum)`
      } : null);
    }

    if (updatedDocInstance) {
      try {
        await saveDocumentToFirestore(updatedDocInstance);
      } catch (e) {
        console.warn('Failed to update status in Firestore:', e);
      }
    }

    showToast('Status kelayakan dan catatan supervisi berhasil diperbarui.');
  };

  // Batch approve pending docs in current semester
  const handleBatchApproveSemester = async () => {
    const now = new Date().toISOString();
    let count = 0;
    const modified: CurriculumDocument[] = [];

    setDocuments(prev => prev.map(d => {
      if (d.semester === currentSemester && d.academicYear === academicYear && d.status === 'diajukan') {
        count++;
        const item = {
          ...d,
          status: 'disahkan' as VerificationStatus,
          supervisorNotes: 'Disahkan secara pleno oleh Tim Supervisi Kurikulum dan Kepala Sekolah.',
          verificationDate: now,
          verifiedBy: `${profile.curriculumViceName} (Waka Kurikulum)`
        };
        modified.push(item);
        return item;
      }
      return d;
    }));

    if (modified.length > 0) {
      try {
        await batchSaveDocumentsToFirestore(modified);
      } catch (e) {
        console.warn('Failed batch approval in Firestore:', e);
      }
    }

    showToast(`Berhasil mengesahkan ${count} dokumen kurikulum semester ${currentSemester === 'ganjil' ? 'Ganjil' : 'Genap'}.`);
  };

  // Delete document
  const handleDeleteDocument = async (docId: string) => {
    setDocuments(prev => prev.filter(d => d.id !== docId));
    if (selectedDoc?.id === docId) setSelectedDoc(null);
    if (editDoc?.id === docId) setEditDoc(null);
    if (printDoc?.id === docId) setPrintDoc(null);
    showToast('Dokumen telah berhasil dihapus dari arsip.');
    try {
      await deleteDocumentFromFirestore(docId);
    } catch (e) {
      console.warn('Failed to delete from Firestore:', e);
    }
  };

  // Restore backup
  const handleRestoreBackup = async (restoredDocs: CurriculumDocument[]) => {
    setDocuments(restoredDocs);
    showToast(`Arsip berhasil dipulihkan (${restoredDocs.length} dokumen).`);
    try {
      await batchSaveDocumentsToFirestore(restoredDocs);
    } catch (e) {
      console.warn('Failed to sync restored backup to Firestore:', e);
    }
  };

  // Target teacher and category for quick upload modal
  const [uploadTargetTeacherId, setUploadTargetTeacherId] = useState<string | null>(null);
  const [uploadTargetCategoryId, setUploadTargetCategoryId] = useState<string | null>(null);

  // Quick upload for a specific teacher
  const handleOpenUploadForTeacher = (teacher: Teacher, category: DocumentCategory) => {
    setUploadTargetTeacherId(teacher.id);
    setUploadTargetCategoryId(category);
    setIsUploadModalOpen(true);
  };

  const handleOpenGeneralUpload = () => {
    if (currentUser.role === 'guru' && currentUser.teacherId) {
      setUploadTargetTeacherId(currentUser.teacherId);
    } else {
      setUploadTargetTeacherId(null);
    }
    setUploadTargetCategoryId(null);
    setIsUploadModalOpen(true);
  };

  const handleResetData = () => {
    if (window.confirm('Reset data ke kondisi awal pabrik (seed awal)?')) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      localStorage.removeItem(CATEGORIES_STORAGE_KEY);
      setDocuments(INITIAL_DOCUMENTS);
      setProfile(INITIAL_SCHOOL_PROFILE);
      setCategories(INITIAL_CATEGORIES);
      showToast('Data berhasil direset ke kondisi awal.');
    }
  };

  // Role-Based Filtering:
  // When role === 'guru', only documents matching that teacher's name or id are shown!
  const currentLoggedInTeacher = teachers.find(t => t.id === currentUser.teacherId);
  const visibleDocuments = currentUser.role === 'guru'
    ? documents.filter(d => 
        (currentUser.teacherId && d.teacherId === currentUser.teacherId) ||
        (currentLoggedInTeacher && d.teacherName.toLowerCase().includes(currentLoggedInTeacher.name.split(' ')[0].toLowerCase()))
      )
    : documents;

  // Counts for tabs & navigation
  const semesterDocsCount = visibleDocuments.filter(d => d.semester === currentSemester && d.academicYear === academicYear).length;
  const ganjilCount = visibleDocuments.filter(d => d.semester === 'ganjil' && d.academicYear === academicYear).length;
  const genapCount = visibleDocuments.filter(d => d.semester === 'genap' && d.academicYear === academicYear).length;
  const pendingCount = visibleDocuments.filter(d => d.status === 'diajukan').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modern Sidebar Navigation */}
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenUpload={handleOpenGeneralUpload}
        profile={profile}
        academicYear={academicYear}
        onAcademicYearChange={setAcademicYear}
        currentSemester={currentSemester}
        onSemesterChange={setCurrentSemester}
        totalDocumentsCount={visibleDocuments.length}
        semesterDocsCount={semesterDocsCount}
        pendingCount={pendingCount}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onResetData={handleResetData}
        currentUser={currentUser}
        teachers={teachers}
      />

      {/* Main Content Area (Offset by Sidebar on Desktop) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all duration-300">
        {/* Workspace Top Header Bar */}
        <Header
          activeView={activeView}
          currentSemester={currentSemester}
          academicYear={academicYear}
          onOpenUpload={handleOpenGeneralUpload}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
          pendingCount={pendingCount}
          currentUser={currentUser}
          onRoleChange={handleRoleChange}
          teachers={teachers}
          isCloudSynced={isCloudSynced}
        />

        {/* Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* School Hero Profile Banner (on main curriculum views) */}
          {activeView !== 'profile' && activeView !== 'categories' && (
            <SchoolBanner
              profile={profile}
              documents={visibleDocuments}
              currentSemester={currentSemester}
              onOpenUpload={handleOpenGeneralUpload}
              onViewMatrix={() => setActiveView('matrix')}
            />
          )}

          {/* Semester & Academic Year Segmented Controls (on main curriculum views) */}
          {activeView !== 'profile' && activeView !== 'categories' && (
            <SemesterControls
              currentSemester={currentSemester}
              onSemesterChange={setCurrentSemester}
              academicYear={academicYear}
              onAcademicYearChange={setAcademicYear}
              activeView={activeView}
              onViewChange={setActiveView}
              ganjilCount={ganjilCount}
              genapCount={genapCount}
            />
          )}

          {/* Dynamic Views */}
          {activeView === 'matrix' && (
            <CurriculumMatrix
              teachers={teachers}
              documents={visibleDocuments}
              currentSemester={currentSemester}
              academicYear={academicYear}
              categories={categories}
              onSelectDocument={setSelectedDoc}
              onOpenUploadForTeacher={handleOpenUploadForTeacher}
              onBatchApproveSemester={handleBatchApproveSemester}
              onEditDocument={setEditDoc}
              onDeleteDocument={handleDeleteDocument}
              currentTeacherId={currentUser.role === 'guru' ? (currentUser.teacherId || null) : null}
            />
          )}

          {activeView === 'list' && (
            <CurriculumList
              documents={visibleDocuments}
              currentSemester={currentSemester}
              academicYear={academicYear}
              categories={categories}
              onSelectDocument={setSelectedDoc}
              onPrintValidationSheet={setPrintDoc}
              onDeleteDocument={handleDeleteDocument}
              onOpenUpload={handleOpenGeneralUpload}
            />
          )}

          {activeView === 'supervision' && (
            <SupervisionView
              documents={visibleDocuments}
              profile={profile}
              onUpdateDocumentStatus={handleUpdateDocumentStatus}
              onSelectDocument={setSelectedDoc}
              onPrintValidationSheet={setPrintDoc}
            />
          )}

          {activeView === 'reports' && (
            <ReportsView
              documents={visibleDocuments}
              teachers={teachers}
              profile={profile}
              currentSemester={currentSemester}
              academicYear={academicYear}
              onRestoreBackup={handleRestoreBackup}
            />
          )}

          {/* Profil Satuan Pendidikan & Upload Logo */}
          {activeView === 'profile' && (
            <SchoolProfileView
              profile={profile}
              onSaveProfile={handleSaveProfile}
            />
          )}

          {/* Kelola Kategori Perangkat Pembelajaran */}
          {activeView === 'categories' && (
            <CategoryManagementView
              categories={categories}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-5 px-6 lg:px-8 mt-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              &copy; {new Date().getFullYear()} {profile.name} · Repositori Arsip Kurikulum Digital
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <span>Kurikulum Merdeka</span>
              <span aria-hidden="true">·</span>
              <span>NPSN: {profile.npsn}</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Auto Upload Modal */}
      {isUploadModalOpen && (
        <AutoUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => {
            setIsUploadModalOpen(false);
            setUploadTargetTeacherId(null);
            setUploadTargetCategoryId(null);
          }}
          onSaveDocuments={handleSaveDocuments}
          teachers={teachers}
          profile={profile}
          currentSemester={currentSemester}
          categories={categories}
          initialTeacherId={uploadTargetTeacherId}
          initialCategoryId={uploadTargetCategoryId}
        />
      )}

      {/* Document Detail & Preview Modal (Tanda Mata) */}
      {selectedDoc && (
        <DocumentDetailModal
          document={selectedDoc}
          isOpen={Boolean(selectedDoc)}
          onClose={() => setSelectedDoc(null)}
          onUpdateStatus={handleUpdateDocumentStatus}
          onPrintValidationSheet={(doc) => {
            setSelectedDoc(null);
            setPrintDoc(doc);
          }}
          categories={categories}
        />
      )}

      {/* Edit Document Modal (Tanda Pensil) */}
      {editDoc && (
        <EditDocumentModal
          document={editDoc}
          isOpen={Boolean(editDoc)}
          onClose={() => setEditDoc(null)}
          onSave={handleSaveEditedDocument}
          teachers={teachers}
          categories={categories}
        />
      )}

      {/* Print Official Approval Sheet */}
      {printDoc && (
        <PrintValidationSheet
          document={printDoc}
          profile={profile}
          isOpen={Boolean(printDoc)}
          onClose={() => setPrintDoc(null)}
        />
      )}
    </div>
  );
}
