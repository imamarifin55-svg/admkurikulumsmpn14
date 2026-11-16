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
  subscribeToSchoolProfile, saveSchoolProfileToFirestore,
  subscribeToTeachers, saveTeacherToFirestore, deleteTeacherFromFirestore,
  subscribeToCategories, saveCategoryToFirestore, deleteCategoryFromFirestore,
  seedFirestoreIfEmpty
} from './services/firestoreService';
import { testFirestoreConnection, auth, googleProvider } from './services/firebase';
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { CloudOff, LogIn } from 'lucide-react';

import { LandingLoginPage } from './components/LandingLoginPage';
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
import { TeacherManagementView } from './components/TeacherManagementView';
import { AutoUploadModal } from './components/AutoUploadModal';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { EditDocumentModal } from './components/EditDocumentModal';
import { PrintValidationSheet } from './components/PrintValidationSheet';

const STORAGE_KEY = 'arsip_kurikulum_documents_v1';
const PROFILE_STORAGE_KEY = 'arsip_kurikulum_profile_v1';
const CATEGORIES_STORAGE_KEY = 'arsip_kurikulum_categories_v1';
const TEACHERS_STORAGE_KEY = 'arsip_kurikulum_teachers_v1';

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

  // Load teachers from localStorage or initial seed
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    try {
      const saved = localStorage.getItem(TEACHERS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load teachers:', e);
    }
    return INITIAL_TEACHERS;
  });

  // Session Auth State: If false, renders the Landing & Login Page
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('arsip_kurikulum_logged_in') === 'true';
    } catch {
      return false;
    }
  });

  // User & Role State: 'waka_kurikulum' (Dashboard Utama) vs 'guru' (Hanya berkas sendiri)
  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    try {
      const savedUser = localStorage.getItem('arsip_kurikulum_current_user');
      if (savedUser) return JSON.parse(savedUser);
    } catch {
      // default
    }
    return {
      uid: 'waka-01',
      email: 'imamarifin55@admin.smp.belajar.id',
      displayName: 'Waka Kurikulum',
      role: 'waka_kurikulum'
    };
  });

  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(() => Boolean(auth.currentUser));

  // Active filters and views
  const [academicYear, setAcademicYear] = useState<string>(profile.currentAcademicYear || '2025/2026');
  const [currentSemester, setCurrentSemester] = useState<SemesterType>(profile.currentSemester || 'ganjil');
  const [activeView, setActiveView] = useState<'matrix' | 'list' | 'supervision' | 'reports' | 'profile' | 'categories' | 'teachers'>('matrix');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<CurriculumDocument | null>(null);
  const [editDoc, setEditDoc] = useState<CurriculumDocument | null>(null);
  const [printDoc, setPrintDoc] = useState<CurriculumDocument | null>(null);

  // Toast / feedback notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Keep latest state refs for auth / seeding callbacks
  const teachersRef = React.useRef<Teacher[]>(teachers);
  const documentsRef = React.useRef<CurriculumDocument[]>(documents);
  const profileRef = React.useRef<SchoolProfile>(profile);
  const categoriesRef = React.useRef<CategoryItem[]>(categories);
  const isCloudInitializedRef = React.useRef<boolean>(false);
  const [isConnectingCloud, setIsConnectingCloud] = useState(false);

  useEffect(() => {
    teachersRef.current = teachers;
  }, [teachers]);
  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  // 1. Test Firestore, subscribe to Auth changes, and seed initial cloud data if needed
  useEffect(() => {
    testFirestoreConnection();
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email || '';
        const isWaka = email === 'imamarifin55@admin.smp.belajar.id';
        const currentTeachers = teachersRef.current;
        const matched = currentTeachers.find(t => t.email.toLowerCase() === email.toLowerCase());

        const loggedUser: AppUser = {
          uid: firebaseUser.uid,
          email,
          displayName: firebaseUser.displayName || (isWaka ? 'Waka Kurikulum' : 'Guru Pengampu'),
          role: isWaka ? 'waka_kurikulum' : 'guru',
          teacherId: matched ? matched.id : (isWaka ? undefined : currentTeachers[0]?.id)
        };

        setCurrentUser(loggedUser);
        setIsCloudSynced(true);
        setIsAuthenticated(true);
        try {
          localStorage.setItem('arsip_kurikulum_logged_in', 'true');
          localStorage.setItem('arsip_kurikulum_current_user', JSON.stringify(loggedUser));
        } catch (e) {
          console.warn(e);
        }

        // Seed empty Firestore collections once so all devices share the same baseline
        const seeded = await seedFirestoreIfEmpty({
          documents: documentsRef.current,
          profile: profileRef.current,
          teachers: teachersRef.current,
          categories: categoriesRef.current
        });
        if (seeded) {
          isCloudInitializedRef.current = true;
        }
      } else {
        setIsCloudSynced(false);
      }
    });

    return () => unsubAuth();
  }, []);

  // 2. Real-time Firestore sync across devices for Documents, Profile, Teachers & Categories
  useEffect(() => {
    const unsubDocs = subscribeToDocuments((remoteDocs) => {
      if (remoteDocs.length > 0 || isCloudInitializedRef.current) {
        isCloudInitializedRef.current = true;
        setDocuments(remoteDocs);
      }
    });

    const unsubProfile = subscribeToSchoolProfile((remoteProfile) => {
      if (remoteProfile) {
        isCloudInitializedRef.current = true;
        setProfile(remoteProfile);
      }
    });

    const unsubTeachers = subscribeToTeachers((remoteTeachers) => {
      if (remoteTeachers.length > 0 || isCloudInitializedRef.current) {
        isCloudInitializedRef.current = true;
        setTeachers(remoteTeachers);
      }
    });

    const unsubCategories = subscribeToCategories((remoteCategories) => {
      if (remoteCategories.length > 0 || isCloudInitializedRef.current) {
        isCloudInitializedRef.current = true;
        setCategories(remoteCategories);
      }
    });

    return () => {
      unsubDocs();
      unsubProfile();
      unsubTeachers();
      unsubCategories();
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

  // Sync teachers to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(teachers));
    } catch (e) {
      console.warn('Failed to persist teachers:', e);
    }
  }, [teachers]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleLandingLogin = (role: AppUserRole, teacherId?: string) => {
    const matched = teachers.find(t => t.id === teacherId);
    const newUser: AppUser = {
      uid: role === 'waka_kurikulum' ? 'waka-01' : (matched?.id || 'guru-01'),
      email: role === 'waka_kurikulum' ? 'imamarifin55@admin.smp.belajar.id' : (matched?.email || 'guru@smp.belajar.id'),
      displayName: role === 'waka_kurikulum' ? 'Waka Kurikulum' : (matched?.name || 'Guru Pengampu'),
      role,
      teacherId: role === 'guru' ? (teacherId || teachers[0].id) : undefined
    };

    setCurrentUser(newUser);
    setIsAuthenticated(true);
    try {
      localStorage.setItem('arsip_kurikulum_logged_in', 'true');
      localStorage.setItem('arsip_kurikulum_current_user', JSON.stringify(newUser));
    } catch (e) {
      console.warn(e);
    }

    showToast(`Selamat datang di SIM Arsip Kurikulum sebagai ${newUser.displayName}.`);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('arsip_kurikulum_logged_in');
    } catch (e) {
      console.warn(e);
    }
    showToast('Anda telah keluar dari sesi.');
  };

  const handleRoleChange = (role: AppUserRole, teacherId?: string) => {
    const matched = teachers.find(t => t.id === teacherId);
    const updatedUser: AppUser = {
      ...currentUser,
      role,
      teacherId,
      displayName: role === 'waka_kurikulum' ? 'Waka Kurikulum' : (matched?.name || 'Guru Pengampu')
    };
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('arsip_kurikulum_current_user', JSON.stringify(updatedUser));
    } catch (e) {
      console.warn(e);
    }

    if (role === 'guru') {
      showToast(`Beralih ke Portal Guru: ${matched?.name || 'Guru'}. Hanya menampilkan berkas Anda.`);
      if (activeView === 'supervision' || activeView === 'reports' || activeView === 'profile' || activeView === 'categories' || activeView === 'teachers') {
        setActiveView('matrix');
      }
    } else {
      showToast('Beralih ke Dashboard Utama Waka Kurikulum (Akses Penuh Seluruh Sekolah).');
    }
  };

  // Connect to Cloud Google Auth directly from workspace
  const handleConnectCloud = async () => {
    try {
      setIsConnectingCloud(true);
      await signInWithPopup(auth, googleProvider);
      showToast('Berhasil terhubung ke Cloud Firestore. Sinkronisasi real-time antar perangkat aktif!');
    } catch (err) {
      console.warn('Cloud sign-in cancelled or failed:', err);
      showToast('Login Google dibatalkan atau gagal. Silakan coba lagi.');
    } finally {
      setIsConnectingCloud(false);
    }
  };

  // Add new documents from automatic upload modal
  const handleSaveDocuments = async (newDocs: CurriculumDocument[]) => {
    setDocuments(prev => [...newDocs, ...prev]);
    if (auth.currentUser) {
      try {
        await batchSaveDocumentsToFirestore(newDocs);
        showToast(`Berhasil mengarsipkan ${newDocs.length} berkas kurikulum ke Cloud Real-Time.`);
      } catch (err) {
        console.error(err);
        showToast('Gagal menyimpan ke Cloud Firestore. Tersimpan sementara secara lokal.');
      }
    } else {
      showToast(`Tersimpan lokal (${newDocs.length} berkas). Hubungkan Google agar terbaca di perangkat lain.`);
    }
  };

  // Update existing document from Edit Modal
  const handleSaveEditedDocument = async (updatedDoc: CurriculumDocument) => {
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    if (selectedDoc?.id === updatedDoc.id) {
      setSelectedDoc(updatedDoc);
    }
    if (auth.currentUser) {
      try {
        await saveDocumentToFirestore(updatedDoc);
        showToast(`Perubahan berkas "${updatedDoc.title}" tersinkron ke Cloud.`);
      } catch (err) {
        console.error(err);
        showToast('Gagal memperbarui berkas ke Cloud Firestore.');
      }
    } else {
      showToast(`Perubahan "${updatedDoc.title}" tersimpan lokal (belum sinkron Cloud).`);
    }
  };

  // Save updated school profile
  const handleSaveProfile = async (updatedProfile: SchoolProfile) => {
    setProfile(updatedProfile);
    if (updatedProfile.currentAcademicYear) {
      setAcademicYear(updatedProfile.currentAcademicYear);
    }
    if (auth.currentUser) {
      try {
        await saveSchoolProfileToFirestore(updatedProfile);
        showToast('Profil sekolah dan logo tersimpan & tersinkron ke semua perangkat.');
      } catch (err) {
        console.error(err);
        showToast('Gagal menyimpan profil ke Cloud Firestore.');
      }
    } else {
      showToast('Profil sekolah disimpan lokal. Hubungkan Google agar terbaca di perangkat lain.');
    }
  };

  // Add new category
  const handleAddCategory = async (newCat: CategoryItem) => {
    setCategories(prev => [...prev, newCat]);
    if (auth.currentUser) {
      try {
        await saveCategoryToFirestore(newCat);
        showToast(`Kategori "${newCat.name}" ditambahkan ke Cloud Real-Time.`);
      } catch (err) {
        console.error(err);
        showToast('Gagal menyimpan kategori ke Cloud Firestore.');
      }
    } else {
      showToast(`Kategori "${newCat.name}" ditambahkan secara lokal.`);
    }
  };

  // Update category
  const handleUpdateCategory = async (updatedCat: CategoryItem) => {
    setCategories(prev => prev.map(c => c.id === updatedCat.id ? updatedCat : c));
    if (auth.currentUser) {
      try {
        await saveCategoryToFirestore(updatedCat);
        showToast(`Kategori "${updatedCat.name}" diperbarui di Cloud.`);
      } catch (err) {
        console.error(err);
        showToast('Gagal memperbarui kategori ke Cloud Firestore.');
      }
    } else {
      showToast(`Kategori "${updatedCat.name}" diperbarui secara lokal.`);
    }
  };

  // Delete category
  const handleDeleteCategory = async (catId: string) => {
    setCategories(prev => prev.filter(c => c.id !== catId));
    if (auth.currentUser) {
      try {
        await deleteCategoryFromFirestore(catId);
        showToast('Kategori perangkat pembelajaran dihapus dari Cloud.');
      } catch (err) {
        console.error(err);
        showToast('Gagal menghapus kategori dari Cloud Firestore.');
      }
    } else {
      showToast('Kategori perangkat pembelajaran dihapus secara lokal.');
    }
  };

  // Add new teacher
  const handleAddTeacher = async (newTeacher: Teacher) => {
    setTeachers(prev => [...prev, newTeacher]);
    if (auth.currentUser) {
      try {
        await saveTeacherToFirestore(newTeacher);
        showToast(`Guru "${newTeacher.name}" berhasil ditambahkan ke Cloud Real-Time.`);
      } catch (err) {
        console.error(err);
        showToast('Gagal menyimpan data guru ke Cloud Firestore.');
      }
    } else {
      showToast(`Guru "${newTeacher.name}" ditambahkan secara lokal.`);
    }
  };

  // Update teacher (and keep linked documents synced)
  const handleUpdateTeacher = async (updatedTeacher: Teacher) => {
    const previousTeacher = teachers.find(t => t.id === updatedTeacher.id);
    setTeachers(prev => prev.map(t => t.id === updatedTeacher.id ? updatedTeacher : t));

    const modifiedDocs: CurriculumDocument[] = [];
    const nextDocs = documents.map(d => {
      const isLinked =
        d.teacherId === updatedTeacher.id ||
        (previousTeacher && d.teacherName === previousTeacher.name);
      if (isLinked) {
        const syncedDoc: CurriculumDocument = {
          ...d,
          teacherId: updatedTeacher.id,
          teacherName: updatedTeacher.name,
          teacherNip: updatedTeacher.nip,
          teacherEmail: updatedTeacher.email
        };
        modifiedDocs.push(syncedDoc);
        return syncedDoc;
      }
      return d;
    });
    if (modifiedDocs.length > 0) {
      setDocuments(nextDocs);
    }

    if (currentUser.role === 'guru' && currentUser.teacherId === updatedTeacher.id) {
      setCurrentUser(prev => ({
        ...prev,
        displayName: updatedTeacher.name,
        email: updatedTeacher.email
      }));
    }

    if (auth.currentUser) {
      try {
        await saveTeacherToFirestore(updatedTeacher);
        if (modifiedDocs.length > 0) {
          await batchSaveDocumentsToFirestore(modifiedDocs);
        }
        showToast(`Data guru "${updatedTeacher.name}" tersinkron ke Cloud.`);
      } catch (err) {
        console.error(err);
        showToast('Gagal memperbarui data guru ke Cloud Firestore.');
      }
    } else {
      showToast(`Data guru "${updatedTeacher.name}" diperbarui secara lokal.`);
    }
  };

  // Delete teacher
  const handleDeleteTeacher = async (teacherId: string) => {
    setTeachers(prev => prev.filter(t => t.id !== teacherId));
    if (auth.currentUser) {
      try {
        await deleteTeacherFromFirestore(teacherId);
        showToast('Data guru telah dihapus dari Cloud.');
      } catch (err) {
        console.error(err);
        showToast('Gagal menghapus data guru dari Cloud Firestore.');
      }
    } else {
      showToast('Data guru telah dihapus secara lokal.');
    }
  };

  // Update verification status and notes
  const handleUpdateDocumentStatus = async (
    docId: string, 
    newStatus: VerificationStatus, 
    supervisorNotes: string
  ) => {
    const now = new Date().toISOString();
    const targetDoc = documents.find(d => d.id === docId);
    if (!targetDoc) return;

    const updatedDocInstance: CurriculumDocument = {
      ...targetDoc,
      status: newStatus,
      supervisorNotes,
      verificationDate: now,
      verifiedBy: `${profile.curriculumViceName} (Waka Kurikulum)`,
      lastModified: now
    };

    setDocuments(prev => prev.map(d => (d.id === docId ? updatedDocInstance : d)));

    if (selectedDoc && selectedDoc.id === docId) {
      setSelectedDoc(updatedDocInstance);
    }

    if (auth.currentUser) {
      try {
        await saveDocumentToFirestore(updatedDocInstance);
        showToast('Status kelayakan & catatan supervisi tersinkron ke Cloud.');
      } catch (err) {
        console.error(err);
        showToast('Gagal menyinkronkan status supervisi ke Cloud Firestore.');
      }
    } else {
      showToast('Status supervisi diperbarui lokal (hubungkan Google agar sinkron antar perangkat).');
    }
  };

  // Batch approve pending docs in current semester
  const handleBatchApproveSemester = async () => {
    const now = new Date().toISOString();
    const modified: CurriculumDocument[] = documents
      .filter(d => d.semester === currentSemester && d.academicYear === academicYear && d.status === 'diajukan')
      .map(d => ({
        ...d,
        status: 'disahkan' as VerificationStatus,
        supervisorNotes: 'Disahkan secara pleno oleh Tim Supervisi Kurikulum dan Kepala Sekolah.',
        verificationDate: now,
        verifiedBy: `${profile.curriculumViceName} (Waka Kurikulum)`,
        lastModified: now
      }));

    if (modified.length === 0) {
      showToast(`Tidak ada dokumen berstatus Diajukan pada semester ${currentSemester === 'ganjil' ? 'Ganjil' : 'Genap'}.`);
      return;
    }

    const modifiedMap = new Map(modified.map(m => [m.id, m]));
    setDocuments(prev => prev.map(d => modifiedMap.get(d.id) || d));

    if (auth.currentUser) {
      try {
        await batchSaveDocumentsToFirestore(modified);
        showToast(`Berhasil mengesahkan ${modified.length} dokumen ke Cloud Real-Time.`);
      } catch (err) {
        console.error(err);
        showToast('Gagal mengesahkan batch ke Cloud Firestore.');
      }
    } else {
      showToast(`Berhasil mengesahkan ${modified.length} dokumen secara lokal.`);
    }
  };

  // Delete document
  const handleDeleteDocument = async (docId: string) => {
    setDocuments(prev => prev.filter(d => d.id !== docId));
    if (selectedDoc?.id === docId) setSelectedDoc(null);
    if (editDoc?.id === docId) setEditDoc(null);
    if (printDoc?.id === docId) setPrintDoc(null);
    if (auth.currentUser) {
      try {
        await deleteDocumentFromFirestore(docId);
        showToast('Dokumen telah dihapus dari Cloud.');
      } catch (err) {
        console.error(err);
        showToast('Gagal menghapus dokumen dari Cloud Firestore.');
      }
    } else {
      showToast('Dokumen telah dihapus secara lokal.');
    }
  };

  // Restore backup
  const handleRestoreBackup = async (restoredDocs: CurriculumDocument[]) => {
    setDocuments(restoredDocs);
    if (auth.currentUser) {
      try {
        await batchSaveDocumentsToFirestore(restoredDocs);
        showToast(`Arsip berhasil dipulihkan ke Cloud (${restoredDocs.length} dokumen).`);
      } catch (err) {
        console.error(err);
        showToast('Gagal memulihkan arsip ke Cloud Firestore.');
      }
    } else {
      showToast(`Arsip berhasil dipulihkan secara lokal (${restoredDocs.length} dokumen).`);
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
      localStorage.removeItem(TEACHERS_STORAGE_KEY);
      setDocuments(INITIAL_DOCUMENTS);
      setProfile(INITIAL_SCHOOL_PROFILE);
      setCategories(INITIAL_CATEGORIES);
      setTeachers(INITIAL_TEACHERS);
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

  // If user is not yet logged in, show the comprehensive Landing & Login Page
  if (!isAuthenticated) {
    return (
      <>
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}
        <LandingLoginPage
          profile={profile}
          teachers={teachers}
          onSelectRole={handleLandingLogin}
          isCloudSynced={isCloudSynced}
        />
      </>
    );
  }

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
          onLogout={handleLogout}
          wakaName={profile.curriculumViceName}
        />

        {/* Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Cloud Sync Banner when operating in Local-Only mode */}
          {!isCloudSynced && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
              <div className="flex items-start sm:items-center gap-2.5">
                <CloudOff className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <span className="font-bold">Mode Penyimpanan Lokal: </span>
                  <span>Perubahan di perangkat ini belum terkirim ke Cloud dan belum terbaca di perangkat lain.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleConnectCloud}
                disabled={isConnectingCloud}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-2xs transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isConnectingCloud ? 'Menghubungkan...' : 'Hubungkan Cloud (Google)'}</span>
              </button>
            </div>
          )}

          {/* School Hero Profile Banner (on main curriculum views) */}
          {activeView !== 'profile' && activeView !== 'categories' && activeView !== 'teachers' && (
            <SchoolBanner
              profile={profile}
              documents={visibleDocuments}
              currentSemester={currentSemester}
              onOpenUpload={handleOpenGeneralUpload}
              onViewMatrix={() => setActiveView('matrix')}
            />
          )}

          {/* Semester & Academic Year Segmented Controls (on main curriculum views) */}
          {activeView !== 'profile' && activeView !== 'categories' && activeView !== 'teachers' && (
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

          {/* Kelola Data Guru Pengampu & Pejabat Waka Kurikulum */}
          {activeView === 'teachers' && (
            <TeacherManagementView
              teachers={teachers}
              documents={documents}
              profile={profile}
              onSaveProfile={handleSaveProfile}
              onAddTeacher={handleAddTeacher}
              onUpdateTeacher={handleUpdateTeacher}
              onDeleteTeacher={handleDeleteTeacher}
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
          currentAcademicYear={academicYear}
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
