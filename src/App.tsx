/**
 * ArsipKurikulum - Sistem Administrasi Kurikulum & Silabus Sekolah Profesional
 * Dirancang untuk Waka Kurikulum, Kepala Sekolah, dan Guru Mata Pelajaran
 */

import React, { useState, useEffect } from 'react';
import { 
  CurriculumDocument, SchoolProfile, Teacher, SemesterType, 
  VerificationStatus, DocumentCategory, CategoryItem, AppUser, AppUserRole,
  DocumentFile, ActivityLog, ActivityAction 
} from './types/curriculum';
import { 
  INITIAL_DOCUMENTS, INITIAL_SCHOOL_PROFILE, INITIAL_TEACHERS,
  INITIAL_CATEGORIES, INITIAL_WALAS_CATEGORIES
} from './data/initialCurriculumData';
import { AlertTriangle, ArrowRight } from 'lucide-react';

import { 
  subscribeToDocuments, subscribeToHomeroomDocuments, saveDocumentToFirestore, 
  batchSaveDocumentsToFirestore, deleteDocumentFromFirestore,
  fetchAllDocumentsFromFirestore, backfillTeacherIdForLegacyDocs,
  subscribeToSchoolProfile, saveSchoolProfileToFirestore,
  subscribeToTeachers, saveTeacherToFirestore, batchSaveTeachersToFirestore,
  deleteTeacherFromFirestore, subscribeToCategories, saveCategoryToFirestore,
  deleteCategoryFromFirestore, seedFirestoreIfEmpty, seedWalasCategoriesIfMissing,
  saveUserProfileToFirestore, saveDocumentFileToFirestore, deleteDocumentFileFromFirestore,
  addActivityLogToFirestore, subscribeToActivityLogs
} from './services/firestoreService';
import { testFirestoreConnection } from './services/firebase';

import { LandingLoginPage } from './components/LandingLoginPage';
import { Sidebar, SidebarActiveView } from './components/Sidebar';
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
import { WaliKelasView, buildHomeroomEntries } from './components/WaliKelasView';
import { AutoUploadModal, WAKA_SELF_TEACHER_ID } from './components/AutoUploadModal';
import { WalasUploadModal } from './components/WalasUploadModal';
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
      if (saved) {
        const parsed = JSON.parse(saved) as SchoolProfile;
        if (localStorage.getItem('arsip_default_ay_2026_2027') !== 'true' && parsed.currentAcademicYear === '2025/2026') {
          return { ...parsed, currentAcademicYear: '2026/2027' };
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to load school profile:', e);
    }
    return INITIAL_SCHOOL_PROFILE;
  });

  // Load categories from localStorage or initial seed (always ensure default Wali Kelas categories exist once)
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CategoryItem[];
        if (parsed.length > 0 && !parsed.some(c => c.scope === 'wali_kelas')) {
          return [...parsed, ...INITIAL_WALAS_CATEGORIES];
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to load curriculum categories:', e);
    }
    return [...INITIAL_CATEGORIES, ...INITIAL_WALAS_CATEGORIES];
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

  // Session State: Persisted username + role session for instant real-time access
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('arsip_kurikulum_logged_in') === 'true' &&
        Boolean(localStorage.getItem('arsip_kurikulum_current_user'));
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
      uid: 'waka-kurikulum',
      email: 'waka@sekolah.sch.id',
      displayName: 'Waka Kurikulum',
      role: 'waka_kurikulum',
      baseRole: 'waka_kurikulum'
    };
  });

  // Active filters and views
  const [academicYear, setAcademicYear] = useState<string>(profile.currentAcademicYear || '2026/2027');
  const [currentSemester, setCurrentSemester] = useState<SemesterType>(profile.currentSemester || 'ganjil');
  const [activeView, setActiveView] = useState<SidebarActiveView>('matrix');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Additional real-time homeroom documents for Guru who also serves as Wali Kelas
  const [homeroomDocs, setHomeroomDocs] = useState<CurriculumDocument[]>([]);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isWalasUploadModalOpen, setIsWalasUploadModalOpen] = useState(false);
  const [walasUploadClass, setWalasUploadClass] = useState<string | null>(null);
  const [walasUploadCategoryId, setWalasUploadCategoryId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<CurriculumDocument | null>(null);
  const [editDoc, setEditDoc] = useState<CurriculumDocument | null>(null);
  const [printDoc, setPrintDoc] = useState<CurriculumDocument | null>(null);

  // Toast / feedback notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep latest state refs for auth / seeding callbacks
  const teachersRef = React.useRef<Teacher[]>(teachers);
  const documentsRef = React.useRef<CurriculumDocument[]>(documents);
  const profileRef = React.useRef<SchoolProfile>(profile);
  const categoriesRef = React.useRef<CategoryItem[]>(categories);
  const isCloudInitializedRef = React.useRef<boolean>(false);

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

  // 1. Test Firestore connection & seed baseline data once (limit(1) check = max 4 reads)
  useEffect(() => {
    const initCloud = async () => {
      const connected = await testFirestoreConnection();
      if (connected) {
        isCloudInitializedRef.current = true;
      }
      const seeded = await seedFirestoreIfEmpty({
        documents: documentsRef.current,
        profile: profileRef.current,
        teachers: teachersRef.current,
        categories: categoriesRef.current
      });
      if (seeded) {
        isCloudInitializedRef.current = true;
      }
    };
    initCloud();
  }, []);

  // 2A. Lightweight public subscriptions needed on Landing/Login page (School Profile & Teachers only)
  useEffect(() => {
    const unsubProfile = subscribeToSchoolProfile((remoteProfile) => {
      if (remoteProfile) {
        isCloudInitializedRef.current = true;
        try {
          const alreadyMigrated = localStorage.getItem('arsip_default_ay_2026_2027') === 'true';
          if (!alreadyMigrated && (!remoteProfile.currentAcademicYear || remoteProfile.currentAcademicYear === '2025/2026')) {
            const migratedProfile: SchoolProfile = { ...remoteProfile, currentAcademicYear: '2026/2027' };
            localStorage.setItem('arsip_default_ay_2026_2027', 'true');
            setProfile(migratedProfile);
            setAcademicYear('2026/2027');
            saveSchoolProfileToFirestore(migratedProfile).catch(err =>
              console.warn('Gagal memperbarui default tahun ajaran ke Firestore:', err)
            );
            return;
          }
          localStorage.setItem('arsip_default_ay_2026_2027', 'true');
        } catch (e) {
          console.warn(e);
        }
        setProfile(remoteProfile);
      }
    });

    const unsubTeachers = subscribeToTeachers((remoteTeachers) => {
      if (remoteTeachers.length > 0 || isCloudInitializedRef.current) {
        isCloudInitializedRef.current = true;
        setTeachers(remoteTeachers);
      }
    });

    return () => {
      unsubProfile();
      unsubTeachers();
    };
  }, []);

  // Compute active homeroom assignment for logged-in Guru (works even across multi-subject teacher entries)
  const currentLoggedInTeacher = teachers.find(t => t.id === currentUser.teacherId);
  const resolvedHomeroomRecord = currentUser.role === 'guru'
    ? teachers.find((t) => {
        if (!t.isHomeroomTeacher || !t.homeroomClass?.trim()) return false;
        if (currentUser.teacherId && t.id === currentUser.teacherId) return true;
        if (currentLoggedInTeacher) {
          return (
            t.name.toLowerCase() === currentLoggedInTeacher.name.toLowerCase() ||
            (currentLoggedInTeacher.nip !== '-' && t.nip === currentLoggedInTeacher.nip)
          );
        }
        return Boolean(
          currentUser.displayName &&
          t.name.toLowerCase() === currentUser.displayName.toLowerCase()
        );
      })
    : undefined;
  const activeHomeroomClass = resolvedHomeroomRecord?.homeroomClass?.trim().toUpperCase() || null;
  const isHomeroomGuru = currentUser.role === 'guru' && Boolean(activeHomeroomClass);

  // 2B. Authenticated & quota-scoped subscriptions:
  // - Categories only load after login (auto-seeds missing Wali Kelas default categories once)
  // - Guru subscribes to own documents + own homeroom class archives (if Wali Kelas); Waka subscribes to active academicYear
  // - Activity logs (25 latest) only load for Waka Kurikulum
  useEffect(() => {
    if (!isAuthenticated) {
      setHomeroomDocs([]);
      return;
    }

    const unsubCategories = subscribeToCategories((remoteCategories) => {
      if (remoteCategories.length > 0 || isCloudInitializedRef.current) {
        isCloudInitializedRef.current = true;
        const hasWalas = remoteCategories.some(c => c.scope === 'wali_kelas');
        if (remoteCategories.length > 0 && !hasWalas) {
          seedWalasCategoriesIfMissing(INITIAL_WALAS_CATEGORIES).catch(() => {});
          setCategories([...remoteCategories, ...INITIAL_WALAS_CATEGORIES]);
        } else {
          setCategories(remoteCategories);
        }
      }
    });

    const isGuruScoped = currentUser.role === 'guru' && Boolean(currentUser.teacherId);
    if (isGuruScoped && currentUser.teacherId && currentUser.displayName) {
      const loggedTeacher = teachersRef.current.find(t => t.id === currentUser.teacherId);
      const sameNameTeacherIds = teachersRef.current
        .filter(t => t.name.toLowerCase() === (loggedTeacher?.name || currentUser.displayName).toLowerCase())
        .map(t => t.id);
      backfillTeacherIdForLegacyDocs(
        currentUser.teacherId,
        loggedTeacher?.name || currentUser.displayName,
        loggedTeacher?.subject,
        sameNameTeacherIds
      ).catch(() => {});
    }

    const unsubDocs = subscribeToDocuments(
      (remoteDocs) => {
        if (remoteDocs.length > 0 || isCloudInitializedRef.current) {
          isCloudInitializedRef.current = true;
          setDocuments(remoteDocs);
        }
      },
      isGuruScoped
        ? { teacherId: currentUser.teacherId }
        : { academicYear }
    );

    const unsubHomeroomDocs =
      currentUser.role === 'guru' && activeHomeroomClass
        ? subscribeToHomeroomDocuments(activeHomeroomClass, (remoteWalasDocs) => {
            setHomeroomDocs(remoteWalasDocs);
          })
        : (() => {
            setHomeroomDocs([]);
            return () => {};
          })();

    const unsubLogs =
      currentUser.role === 'waka_kurikulum'
        ? subscribeToActivityLogs((remoteLogs) => {
            setActivityLogs(remoteLogs);
          })
        : () => {
            setActivityLogs([]);
          };

    return () => {
      unsubCategories();
      unsubDocs();
      unsubHomeroomDocs();
      unsubLogs();
    };
  }, [isAuthenticated, currentUser.role, currentUser.teacherId, currentUser.displayName, academicYear, activeHomeroomClass]);

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

  useEffect(() => {
    if (
      currentUser.role === 'guru' &&
      (activeView === 'supervision' ||
        activeView === 'reports' ||
        activeView === 'profile' ||
        activeView === 'categories' ||
        activeView === 'teachers' ||
        (activeView === 'wali_kelas' && !isHomeroomGuru))
    ) {
      setActiveView('matrix');
    }
  }, [currentUser.role, activeView, isHomeroomGuru]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const logActivity = (
    action: ActivityAction,
    targetTitle: string,
    details: string,
    actorOverride?: AppUser
  ) => {
    const actor = actorOverride || currentUser;
    const entry: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      actorName: actor.displayName || 'Pengguna',
      actorRole: actor.role,
      action,
      targetTitle,
      details
    };
    addActivityLogToFirestore(entry).catch(err =>
      console.warn('Gagal menulis audit log ke Firestore:', err)
    );
  };

  const handleUsernameLogin = async (
    username: string,
    role: AppUserRole,
    matchedTeacherId?: string
  ) => {
    const trimmed = username.trim();
    const cleanSlug = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'pengguna';

    const matchedTeacher =
      (matchedTeacherId ? teachers.find(t => t.id === matchedTeacherId) : undefined) ||
      (role === 'guru'
        ? teachers.find(
            t =>
              t.name.toLowerCase().includes(trimmed.toLowerCase()) ||
              t.email.toLowerCase().split('@')[0].includes(trimmed.toLowerCase())
          )
        : undefined);

    let resolvedTeacher = matchedTeacher;
    if (role === 'guru' && !resolvedTeacher) {
      const newTeacherId = `guru-${cleanSlug}`;
      const newTeacher: Teacher = {
        id: newTeacherId,
        name: trimmed,
        nip: '-',
        subject: 'Guru Mata Pelajaran',
        email: `${cleanSlug}@guru.sekolah.sch.id`
      };
      resolvedTeacher = newTeacher;
      setTeachers(prev => (prev.some(t => t.id === newTeacherId) ? prev : [...prev, newTeacher]));
      saveTeacherToFirestore(newTeacher).catch(err =>
        console.warn('Gagal menambahkan guru baru ke Firestore:', err)
      );
    }

    const resolvedDisplayName =
      role === 'guru' ? (resolvedTeacher?.name || trimmed) : trimmed;

    const loggedUser: AppUser = {
      uid: `${role === 'waka_kurikulum' ? 'waka' : 'guru'}-${cleanSlug}`,
      email:
        resolvedTeacher?.email ||
        (role === 'waka_kurikulum' ? 'waka@sekolah.sch.id' : `${cleanSlug}@guru.sekolah.sch.id`),
      displayName: resolvedDisplayName,
      role,
      baseRole: role,
      teacherId: role === 'guru' ? resolvedTeacher?.id : undefined
    };

    setCurrentUser(loggedUser);
    setIsAuthenticated(true);
    setActiveView('matrix');

    try {
      localStorage.setItem('arsip_kurikulum_logged_in', 'true');
      localStorage.setItem('arsip_kurikulum_current_user', JSON.stringify(loggedUser));
    } catch (e) {
      console.warn(e);
    }

    try {
      await saveUserProfileToFirestore(loggedUser);
      await seedFirestoreIfEmpty({
        documents: documentsRef.current,
        profile: profileRef.current,
        teachers: teachersRef.current,
        categories: categoriesRef.current
      });
      logActivity(
        'LOGIN',
        loggedUser.displayName,
        `Masuk ke sistem sebagai ${role === 'waka_kurikulum' ? 'Waka Kurikulum' : 'Guru Pengampu'}.`,
        loggedUser
      );
    } catch (e) {
      console.warn('Gagal mencatat sesi pengguna ke Firestore:', e);
    }

    showToast(
      `Selamat datang, ${loggedUser.displayName} (${role === 'waka_kurikulum' ? 'Waka Kurikulum' : 'Guru Pengampu'}). Sinkronisasi Cloud Real-Time aktif.`
    );
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveView('matrix');
    try {
      localStorage.removeItem('arsip_kurikulum_logged_in');
      localStorage.removeItem('arsip_kurikulum_current_user');
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
      baseRole: currentUser.baseRole || 'waka_kurikulum',
      teacherId,
      displayName: role === 'waka_kurikulum' ? (profile.curriculumViceName || 'Waka Kurikulum') : (matched?.name || 'Guru Pengampu')
    };
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('arsip_kurikulum_current_user', JSON.stringify(updatedUser));
    } catch (e) {
      console.warn(e);
    }

    if (role === 'guru') {
      showToast(`Beralih ke Pratinjau Portal Guru: ${matched?.name || 'Guru'}. Hanya menampilkan berkas guru terkait.`);
      if (activeView === 'supervision' || activeView === 'reports' || activeView === 'profile' || activeView === 'categories' || activeView === 'teachers') {
        setActiveView('matrix');
      }
    } else {
      showToast('Kembali ke Dashboard Utama Waka Kurikulum (Akses Penuh Seluruh Sekolah).');
    }
  };

  // Add new documents from upload modal (Curriculum or Wali Kelas)
  const handleSaveDocuments = async (
    newDocs: CurriculumDocument[],
    attachedFiles?: DocumentFile[]
  ) => {
    const isWalasBatch = newDocs.some(d => d.archiveScope === 'wali_kelas');
    setDocuments(prev => [...newDocs, ...prev]);
    if (isWalasBatch) {
      setHomeroomDocs(prev => [...newDocs.filter(d => d.archiveScope === 'wali_kelas'), ...prev]);
    }
    try {
      if (attachedFiles && attachedFiles.length > 0) {
        await Promise.all(attachedFiles.map(f => saveDocumentFileToFirestore(f)));
      }
      await batchSaveDocumentsToFirestore(newDocs);
      const summaryTitle =
        newDocs.length === 1
          ? newDocs[0].title
          : `${newDocs.length} ${isWalasBatch ? 'Berkas Wali Kelas' : 'Berkas Kurikulum'}`;
      logActivity(
        'UPLOAD',
        summaryTitle,
        `Mengunggah ${newDocs.length} ${isWalasBatch ? 'dokumen wali kelas' : 'perangkat kurikulum'} (TP ${academicYear}, Smt ${currentSemester === 'ganjil' ? 'Ganjil' : 'Genap'}).`
      );
      showToast(
        `Berhasil mengarsipkan ${newDocs.length} ${isWalasBatch ? 'berkas Wali Kelas' : 'berkas kurikulum'} ke Cloud Real-Time.`
      );
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan ke Cloud Firestore. Periksa koneksi internet Anda.');
    }
  };

  // Resubmit document after revision (Guru workflow)
  const handleResubmitRevision = async (
    updatedDoc: CurriculumDocument,
    newAttachedFile?: DocumentFile
  ) => {
    setDocuments(prev => prev.map(d => (d.id === updatedDoc.id ? updatedDoc : d)));
    if (updatedDoc.archiveScope === 'wali_kelas') {
      setHomeroomDocs(prev => prev.map(d => (d.id === updatedDoc.id ? updatedDoc : d)));
    }
    if (selectedDoc?.id === updatedDoc.id) {
      setSelectedDoc(updatedDoc);
    }
    try {
      if (newAttachedFile) {
        await saveDocumentFileToFirestore(newAttachedFile);
      }
      await saveDocumentToFirestore(updatedDoc);
      logActivity(
        'RESUBMIT',
        updatedDoc.title,
        `Guru ${updatedDoc.teacherName} mengajukan ulang hasil revisi untuk ditelaah.`
      );
      showToast(`Revisi dokumen "${updatedDoc.title}" berhasil diajukan ulang ke Waka Kurikulum.`);
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan pengajuan ulang ke Cloud Firestore.');
    }
  };

  // Update existing document from Edit Modal (including optional newly uploaded real file)
  const handleSaveEditedDocument = async (
    updatedDoc: CurriculumDocument,
    newAttachedFile?: DocumentFile
  ) => {
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    if (updatedDoc.archiveScope === 'wali_kelas') {
      setHomeroomDocs(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    }
    if (selectedDoc?.id === updatedDoc.id) {
      setSelectedDoc(updatedDoc);
    }
    try {
      if (newAttachedFile) {
        await saveDocumentFileToFirestore(newAttachedFile);
      }
      await saveDocumentToFirestore(updatedDoc);
      logActivity(
        'UPDATE_DOC',
        updatedDoc.title,
        newAttachedFile
          ? `Memperbarui berkas unggahan (${newAttachedFile.fileName}) dan metadata dokumen.`
          : `Memperbarui metadata berkas (${updatedDoc.subject}, Kelas ${updatedDoc.homeroomClass || updatedDoc.grade}).`
      );
      showToast(
        newAttachedFile
          ? `Berkas "${newAttachedFile.fileName}" berhasil diunggah & tersinkron ke Cloud!`
          : `Perubahan berkas "${updatedDoc.title}" tersinkron ke Cloud Real-Time.`
      );
    } catch (err) {
      console.error(err);
      showToast('Gagal memperbarui berkas ke Cloud Firestore.');
    }
  };

  // Save updated school profile
  const handleSaveProfile = async (updatedProfile: SchoolProfile) => {
    setProfile(updatedProfile);
    if (updatedProfile.currentAcademicYear) {
      setAcademicYear(updatedProfile.currentAcademicYear);
    }
    try {
      await saveSchoolProfileToFirestore(updatedProfile);
      logActivity('CONFIG', updatedProfile.name, 'Memperbarui profil sekolah, tanda tangan digital, atau password login Waka.');
      showToast('Profil sekolah dan logo tersimpan & tersinkron real-time ke semua perangkat.');
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan profil ke Cloud Firestore.');
    }
  };

  // Add new category
  const handleAddCategory = async (newCat: CategoryItem) => {
    setCategories(prev => [...prev, newCat]);
    try {
      await saveCategoryToFirestore(newCat);
      logActivity('CONFIG', newCat.name, `Menambahkan kategori perangkat kurikulum (${newCat.code}).`);
      showToast(`Kategori "${newCat.name}" ditambahkan ke Cloud Real-Time.`);
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan kategori ke Cloud Firestore.');
    }
  };

  // Update category
  const handleUpdateCategory = async (updatedCat: CategoryItem) => {
    setCategories(prev => prev.map(c => c.id === updatedCat.id ? updatedCat : c));
    try {
      await saveCategoryToFirestore(updatedCat);
      logActivity('CONFIG', updatedCat.name, `Memperbarui kategori perangkat kurikulum (${updatedCat.code}).`);
      showToast(`Kategori "${updatedCat.name}" diperbarui di Cloud Real-Time.`);
    } catch (err) {
      console.error(err);
      showToast('Gagal memperbarui kategori ke Cloud Firestore.');
    }
  };

  // Delete category
  const handleDeleteCategory = async (catId: string) => {
    const removed = categories.find(c => c.id === catId);
    setCategories(prev => prev.filter(c => c.id !== catId));
    try {
      await deleteCategoryFromFirestore(catId);
      logActivity('CONFIG', removed?.name || catId, 'Menghapus kategori perangkat pembelajaran.');
      showToast('Kategori perangkat pembelajaran dihapus dari Cloud Real-Time.');
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus kategori dari Cloud Firestore.');
    }
  };

  // Add new teacher (sync Wali Kelas assignment across sibling records of the same teacher if any)
  const handleAddTeacher = async (newTeacher: Teacher) => {
    const existingSibling = teachers.find(
      t =>
        t.name.toLowerCase() === newTeacher.name.toLowerCase() ||
        (newTeacher.nip !== '-' && t.nip === newTeacher.nip)
    );
    const resolvedTeacher: Teacher =
      !newTeacher.isHomeroomTeacher && existingSibling?.isHomeroomTeacher
        ? {
            ...newTeacher,
            isHomeroomTeacher: true,
            homeroomClass: existingSibling.homeroomClass || ''
          }
        : newTeacher;

    const syncedSiblings: Teacher[] = [];
    if (resolvedTeacher.isHomeroomTeacher) {
      teachers.forEach((t) => {
        const samePerson =
          t.name.toLowerCase() === resolvedTeacher.name.toLowerCase() ||
          (resolvedTeacher.nip !== '-' && t.nip === resolvedTeacher.nip);
        if (samePerson) {
          syncedSiblings.push({
            ...t,
            isHomeroomTeacher: true,
            homeroomClass: resolvedTeacher.homeroomClass || ''
          });
        }
      });
    }

    const syncedMap = new Map(syncedSiblings.map(s => [s.id, s]));
    setTeachers(prev => [...prev.map(t => syncedMap.get(t.id) || t), resolvedTeacher]);
    try {
      await batchSaveTeachersToFirestore([resolvedTeacher, ...syncedSiblings]);
      logActivity('CONFIG', resolvedTeacher.name, `Menambahkan guru pengampu baru (${resolvedTeacher.subject}).`);
      showToast(`Guru "${resolvedTeacher.name}" berhasil ditambahkan ke Cloud Real-Time.`);
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan data guru ke Cloud Firestore.');
    }
  };

  // Update teacher (and keep linked documents & sibling Wali Kelas status synced)
  const handleUpdateTeacher = async (updatedTeacher: Teacher) => {
    const previousTeacher = teachers.find(t => t.id === updatedTeacher.id);
    const updatedSiblings: Teacher[] = [];

    const nextTeachers = teachers.map((t) => {
      if (t.id === updatedTeacher.id) return updatedTeacher;
      const samePerson =
        t.name.toLowerCase() === updatedTeacher.name.toLowerCase() ||
        (previousTeacher && t.name.toLowerCase() === previousTeacher.name.toLowerCase()) ||
        (updatedTeacher.nip !== '-' && t.nip === updatedTeacher.nip);
      if (samePerson) {
        const syncedSibling: Teacher = {
          ...t,
          isHomeroomTeacher: Boolean(updatedTeacher.isHomeroomTeacher),
          homeroomClass: updatedTeacher.isHomeroomTeacher ? (updatedTeacher.homeroomClass || '') : ''
        };
        updatedSiblings.push(syncedSibling);
        return syncedSibling;
      }
      return t;
    });
    setTeachers(nextTeachers);

    const modifiedDocs: CurriculumDocument[] = [];
    const nextDocs = documents.map(d => {
      const isLinked =
        d.teacherId === updatedTeacher.id ||
        (!d.teacherId &&
          previousTeacher &&
          d.teacherName === previousTeacher.name &&
          (!d.subject || d.subject.toLowerCase() === previousTeacher.subject.toLowerCase()));
      if (isLinked) {
        const syncedDoc: CurriculumDocument = {
          ...d,
          teacherId: updatedTeacher.id,
          teacherName: updatedTeacher.name,
          teacherNip: updatedTeacher.nip,
          teacherEmail: updatedTeacher.email,
          subject:
            d.archiveScope === 'wali_kelas'
              ? d.subject
              : previousTeacher && d.subject === previousTeacher.subject
              ? updatedTeacher.subject
              : d.subject
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

    try {
      await batchSaveTeachersToFirestore([updatedTeacher, ...updatedSiblings]);
      if (modifiedDocs.length > 0) {
        await batchSaveDocumentsToFirestore(modifiedDocs);
      }
      logActivity('CONFIG', updatedTeacher.name, `Memperbarui biodata guru & menyinkronkan ${modifiedDocs.length} dokumen terkait.`);
      showToast(`Data guru "${updatedTeacher.name}" tersinkron ke Cloud Real-Time.`);
    } catch (err) {
      console.error(err);
      showToast('Gagal memperbarui data guru ke Cloud Firestore.');
    }
  };

  // Delete teacher
  const handleDeleteTeacher = async (teacherId: string) => {
    const removed = teachers.find(t => t.id === teacherId);
    setTeachers(prev => prev.filter(t => t.id !== teacherId));
    try {
      await deleteTeacherFromFirestore(teacherId);
      logActivity('CONFIG', removed?.name || teacherId, 'Menghapus data guru pengampu dari sistem.');
      showToast('Data guru telah dihapus dari Cloud Real-Time.');
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus data guru dari Cloud Firestore.');
    }
  };

  // Update verification status and notes
  const handleUpdateDocumentStatus = async (
    docId: string, 
    newStatus: VerificationStatus, 
    supervisorNotes: string
  ) => {
    const now = new Date().toISOString();
    const targetDoc =
      documents.find(d => d.id === docId) || homeroomDocs.find(d => d.id === docId);
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
    if (updatedDocInstance.archiveScope === 'wali_kelas') {
      setHomeroomDocs(prev => prev.map(d => (d.id === docId ? updatedDocInstance : d)));
    }

    if (selectedDoc && selectedDoc.id === docId) {
      setSelectedDoc(updatedDocInstance);
    }

    try {
      await saveDocumentToFirestore(updatedDocInstance);
      const logAction: ActivityAction =
        newStatus === 'disahkan'
          ? 'APPROVE'
          : newStatus === 'diverifikasi'
          ? 'VERIFY'
          : newStatus === 'perlu_revisi'
          ? 'REVISION'
          : 'UPDATE_DOC';
      logActivity(
        logAction,
        targetDoc.title,
        `Status diubah ke "${newStatus}"${supervisorNotes ? ` — ${supervisorNotes}` : ''}`
      );
      showToast('Status kelayakan & catatan supervisi tersinkron ke Cloud Real-Time.');
    } catch (err) {
      console.error(err);
      showToast('Gagal menyinkronkan status supervisi ke Cloud Firestore.');
    }
  };

  // Batch approve pending curriculum docs in current semester
  const handleBatchApproveSemester = async () => {
    const now = new Date().toISOString();
    const modified: CurriculumDocument[] = documents
      .filter(
        d =>
          (d.archiveScope || 'kurikulum') !== 'wali_kelas' &&
          d.semester === currentSemester &&
          d.academicYear === academicYear &&
          d.status === 'diajukan'
      )
      .map(d => ({
        ...d,
        status: 'disahkan' as VerificationStatus,
        supervisorNotes: 'Disahkan secara pleno oleh Tim Supervisi Kurikulum dan Kepala Sekolah.',
        verificationDate: now,
        verifiedBy: `${profile.curriculumViceName} (Waka Kurikulum)`,
        lastModified: now
      }));

    if (modified.length === 0) {
      showToast(`Tidak ada dokumen kurikulum berstatus Diajukan pada semester ${currentSemester === 'ganjil' ? 'Ganjil' : 'Genap'}.`);
      return;
    }

    const modifiedMap = new Map(modified.map(m => [m.id, m]));
    setDocuments(prev => prev.map(d => modifiedMap.get(d.id) || d));

    try {
      await batchSaveDocumentsToFirestore(modified);
      logActivity(
        'APPROVE',
        `${modified.length} Berkas Semester ${currentSemester === 'ganjil' ? 'Ganjil' : 'Genap'}`,
        `Pengesahan massal pleno untuk TP ${academicYear}.`
      );
      showToast(`Berhasil mengesahkan ${modified.length} dokumen ke Cloud Real-Time.`);
    } catch (err) {
      console.error(err);
      showToast('Gagal mengesahkan batch ke Cloud Firestore.');
    }
  };

  // Batch approve pending Wali Kelas docs in current semester
  const handleBatchApproveWalas = async () => {
    const now = new Date().toISOString();
    const modified: CurriculumDocument[] = documents
      .filter(
        d =>
          d.archiveScope === 'wali_kelas' &&
          d.semester === currentSemester &&
          d.academicYear === academicYear &&
          d.status === 'diajukan'
      )
      .map(d => ({
        ...d,
        status: 'disahkan' as VerificationStatus,
        supervisorNotes: 'Disahkan oleh Waka Kurikulum dan Kepala Sekolah sebagai arsip resmi Wali Kelas.',
        verificationDate: now,
        verifiedBy: `${profile.curriculumViceName} (Waka Kurikulum)`,
        lastModified: now
      }));

    if (modified.length === 0) {
      showToast(`Tidak ada dokumen Wali Kelas berstatus Menunggu Telaah pada semester ${currentSemester === 'ganjil' ? 'Ganjil' : 'Genap'}.`);
      return;
    }

    const modifiedMap = new Map(modified.map(m => [m.id, m]));
    setDocuments(prev => prev.map(d => modifiedMap.get(d.id) || d));

    try {
      await batchSaveDocumentsToFirestore(modified);
      logActivity(
        'APPROVE',
        `${modified.length} Berkas Wali Kelas Semester ${currentSemester === 'ganjil' ? 'Ganjil' : 'Genap'}`,
        `Pengesahan massal arsip Wali Kelas TP ${academicYear}.`
      );
      showToast(`Berhasil mengesahkan ${modified.length} dokumen Wali Kelas ke Cloud Real-Time.`);
    } catch (err) {
      console.error(err);
      showToast('Gagal mengesahkan batch Wali Kelas ke Cloud Firestore.');
    }
  };

  // Delete document
  const handleDeleteDocument = async (docId: string) => {
    const removed = documents.find(d => d.id === docId) || homeroomDocs.find(d => d.id === docId);
    setDocuments(prev => prev.filter(d => d.id !== docId));
    setHomeroomDocs(prev => prev.filter(d => d.id !== docId));
    if (selectedDoc?.id === docId) setSelectedDoc(null);
    if (editDoc?.id === docId) setEditDoc(null);
    if (printDoc?.id === docId) setPrintDoc(null);
    try {
      await deleteDocumentFromFirestore(docId);
      deleteDocumentFileFromFirestore(docId).catch(() => {});
      logActivity('DELETE', removed?.title || docId, 'Menghapus arsip dokumen beserta lampiran cloud-nya.');
      showToast('Dokumen telah dihapus dari Cloud Real-Time.');
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus dokumen dari Cloud Firestore.');
    }
  };

  // Restore backup
  const handleRestoreBackup = async (restoredDocs: CurriculumDocument[]) => {
    setDocuments(restoredDocs);
    try {
      await batchSaveDocumentsToFirestore(restoredDocs);
      logActivity('RESTORE', `${restoredDocs.length} Dokumen Arsip`, 'Memulihkan arsip kurikulum dari cadangan JSON.');
      showToast(`Arsip berhasil dipulihkan ke Cloud Real-Time (${restoredDocs.length} dokumen).`);
    } catch (err) {
      console.error(err);
      showToast('Gagal memulihkan arsip ke Cloud Firestore.');
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

  const handleOpenWalasUpload = (homeroomClass?: string | null, categoryId?: string | null) => {
    setWalasUploadClass(homeroomClass || (isHomeroomGuru ? activeHomeroomClass : null));
    setWalasUploadCategoryId(categoryId || null);
    setIsWalasUploadModalOpen(true);
  };

  const handleOpenGeneralUpload = () => {
    if (activeView === 'wali_kelas') {
      handleOpenWalasUpload(null, null);
      return;
    }
    if (currentUser.role === 'guru' && currentUser.teacherId) {
      setUploadTargetTeacherId(currentUser.teacherId);
    } else if (currentUser.role === 'waka_kurikulum') {
      setUploadTargetTeacherId(WAKA_SELF_TEACHER_ID);
    } else {
      setUploadTargetTeacherId(null);
    }
    setUploadTargetCategoryId(null);
    setIsUploadModalOpen(true);
  };

  const latestWakaDoc = documents.find(d => d.teacherId === WAKA_SELF_TEACHER_ID);
  const wakaSelfTeacher: Teacher = {
    id: WAKA_SELF_TEACHER_ID,
    name: profile.curriculumViceName || currentUser.displayName || 'Waka Kurikulum',
    nip: profile.curriculumViceNip || '-',
    subject: profile.curriculumViceSubject?.trim() || latestWakaDoc?.subject || 'Tugas Mengajar Waka',
    email: currentUser.email || 'waka@sekolah.sch.id'
  };

  // Merge documents + homeroomDocs when Guru so multi-subject Wali Kelas sees both own subject docs and all class Wali Kelas docs
  const mergedDocuments = (() => {
    if (currentUser.role !== 'guru') return documents;
    const byId = new Map<string, CurriculumDocument>();
    documents.forEach(d => byId.set(d.id, d));
    homeroomDocs.forEach(d => byId.set(d.id, d));
    return Array.from(byId.values()).sort((a, b) => (b.uploadDate || '').localeCompare(a.uploadDate || ''));
  })();

  // Role-Based Filtering:
  // - Curriculum docs for Guru: strictly isolated by teacherId + subject
  // - Wali Kelas docs for Guru: strictly isolated to their activeHomeroomClass (only if isHomeroomGuru)
  const visibleDocuments = currentUser.role === 'guru'
    ? mergedDocuments.filter(d => {
        if (d.archiveScope === 'wali_kelas') {
          if (!isHomeroomGuru || !activeHomeroomClass) return false;
          return (
            (d.homeroomClass || '').toUpperCase() === activeHomeroomClass ||
            d.teacherId === currentUser.teacherId
          );
        }
        if (currentUser.teacherId) {
          if (d.teacherId) {
            return d.teacherId === currentUser.teacherId;
          }
          if (currentLoggedInTeacher) {
            const samePerson =
              d.teacherName.toLowerCase() === currentLoggedInTeacher.name.toLowerCase() ||
              (currentLoggedInTeacher.nip !== '-' && d.teacherNip === currentLoggedInTeacher.nip);
            const sameSubject =
              !d.subject || d.subject.toLowerCase() === currentLoggedInTeacher.subject.toLowerCase();
            return samePerson && sameSubject;
          }
          return false;
        }
        return Boolean(
          currentUser.displayName &&
            d.teacherName.toLowerCase() === currentUser.displayName.toLowerCase()
        );
      })
    : documents;

  // Separate Curriculum vs Wali Kelas Categories & Documents
  const curriculumCategories = categories.filter(c => (c.scope || 'kurikulum') !== 'wali_kelas');
  const walasCategories = categories.filter(c => c.scope === 'wali_kelas');
  const curriculumVisibleDocuments = visibleDocuments.filter(d => (d.archiveScope || 'kurikulum') !== 'wali_kelas');
  const walasVisibleDocuments = visibleDocuments.filter(d => d.archiveScope === 'wali_kelas');

  const homeroomEntries = buildHomeroomEntries(teachers);

  // Counts for tabs & navigation
  const semesterDocsCount = curriculumVisibleDocuments.filter(d => d.semester === currentSemester && d.academicYear === academicYear).length;
  const ganjilCount = curriculumVisibleDocuments.filter(d => d.semester === 'ganjil' && d.academicYear === academicYear).length;
  const genapCount = curriculumVisibleDocuments.filter(d => d.semester === 'genap' && d.academicYear === academicYear).length;
  const curriculumPendingCount = curriculumVisibleDocuments.filter(d => d.status === 'diajukan').length;
  const walasPendingCount = walasVisibleDocuments.filter(d => d.status === 'diajukan').length;
  const walasSemesterDocsCount = walasVisibleDocuments.filter(d => d.semester === currentSemester && d.academicYear === academicYear).length;
  const revisionDocsForGuru = curriculumVisibleDocuments.filter(d => d.status === 'perlu_revisi');
  const isMainCurriculumView =
    activeView === 'matrix' ||
    activeView === 'list' ||
    activeView === 'supervision' ||
    activeView === 'reports';

  // If user is not yet logged in, show the Landing & Username Login Page
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
          onUsernameLogin={handleUsernameLogin}
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
        pendingCount={curriculumPendingCount}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        currentUser={currentUser}
        teachers={teachers}
        isHomeroomGuru={isHomeroomGuru}
        homeroomClass={activeHomeroomClass}
        walasDocsCount={walasSemesterDocsCount}
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
          pendingCount={curriculumPendingCount + walasPendingCount}
          currentUser={currentUser}
          onRoleChange={handleRoleChange}
          teachers={teachers}
          onLogout={handleLogout}
          wakaName={profile.curriculumViceName}
          activeHomeroomClass={activeHomeroomClass}
        />

        {/* Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">

          {/* Guru Reminder Banner for Curriculum Documents Needing Revision */}
          {currentUser.role === 'guru' && isMainCurriculumView && revisionDocsForGuru.length > 0 && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-rose-900">
                    Perhatian: {revisionDocsForGuru.length} Dokumen Memerlukan Revisi dari Waka Kurikulum
                  </h3>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Silakan tinjau catatan supervisi dan unggah berkas perbaikan terbaru untuk diajukan ulang.
                  </p>
                  <div className="mt-3 space-y-2">
                    {revisionDocsForGuru.slice(0, 3).map(doc => (
                      <div
                        key={doc.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white border border-rose-200 rounded-xl px-3.5 py-2.5 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{doc.title}</div>
                          {doc.supervisorNotes && (
                            <div className="text-rose-700 italic truncate mt-0.5">
                              Catatan: &ldquo;{doc.supervisorNotes}&rdquo;
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectedDoc(doc)}
                          className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors cursor-pointer"
                        >
                          <span>Perbaiki &amp; Ajukan Ulang</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* School Hero Profile Banner (on main curriculum views) */}
          {isMainCurriculumView && (
            <SchoolBanner
              profile={profile}
              documents={curriculumVisibleDocuments}
              currentSemester={currentSemester}
              academicYear={academicYear}
              teachers={teachers}
              categories={curriculumCategories}
              onOpenUpload={handleOpenGeneralUpload}
              onViewMatrix={() => setActiveView('matrix')}
            />
          )}

          {/* Semester & Academic Year Segmented Controls (on main curriculum views) */}
          {isMainCurriculumView && (
            <SemesterControls
              currentSemester={currentSemester}
              onSemesterChange={setCurrentSemester}
              academicYear={academicYear}
              onAcademicYearChange={setAcademicYear}
              activeView={activeView}
              onViewChange={setActiveView}
              ganjilCount={ganjilCount}
              genapCount={genapCount}
              userRole={currentUser.role}
            />
          )}

          {/* Dynamic Views */}
          {activeView === 'matrix' && (
            <CurriculumMatrix
              teachers={teachers}
              documents={curriculumVisibleDocuments}
              currentSemester={currentSemester}
              academicYear={academicYear}
              categories={curriculumCategories}
              onSelectDocument={setSelectedDoc}
              onOpenUploadForTeacher={handleOpenUploadForTeacher}
              onBatchApproveSemester={handleBatchApproveSemester}
              onEditDocument={setEditDoc}
              onDeleteDocument={handleDeleteDocument}
              currentTeacherId={currentUser.role === 'guru' ? (currentUser.teacherId || null) : null}
              wakaTeacher={currentUser.role === 'waka_kurikulum' ? wakaSelfTeacher : null}
            />
          )}

          {activeView === 'list' && (
            <CurriculumList
              documents={curriculumVisibleDocuments}
              currentSemester={currentSemester}
              academicYear={academicYear}
              categories={curriculumCategories}
              onSelectDocument={setSelectedDoc}
              onEditDocument={setEditDoc}
              onPrintValidationSheet={setPrintDoc}
              onDeleteDocument={handleDeleteDocument}
              onOpenUpload={handleOpenGeneralUpload}
            />
          )}

          {/* Dedicated Menu: Arsip Wali Kelas (Waka Kurikulum + Designated Homeroom Teachers Only) */}
          {(currentUser.role === 'waka_kurikulum' || isHomeroomGuru) && activeView === 'wali_kelas' && (
            <WaliKelasView
              userRole={currentUser.role}
              teachers={teachers}
              documents={walasVisibleDocuments}
              walasCategories={walasCategories}
              currentSemester={currentSemester}
              academicYear={academicYear}
              onSemesterChange={setCurrentSemester}
              onAcademicYearChange={setAcademicYear}
              activeHomeroomClass={activeHomeroomClass}
              onOpenWalasUpload={handleOpenWalasUpload}
              onSelectDocument={setSelectedDoc}
              onEditDocument={setEditDoc}
              onDeleteDocument={handleDeleteDocument}
              onPrintValidationSheet={setPrintDoc}
              onUpdateDocumentStatus={handleUpdateDocumentStatus}
              onBatchApproveWalas={handleBatchApproveWalas}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onNavigateToTeachers={() => setActiveView('teachers')}
            />
          )}

          {currentUser.role === 'waka_kurikulum' && activeView === 'supervision' && (
            <SupervisionView
              documents={curriculumVisibleDocuments}
              categories={curriculumCategories}
              currentSemester={currentSemester}
              academicYear={academicYear}
              onUpdateDocumentStatus={handleUpdateDocumentStatus}
              onSelectDocument={setSelectedDoc}
              onPrintValidationSheet={setPrintDoc}
            />
          )}

          {currentUser.role === 'waka_kurikulum' && activeView === 'reports' && (
            <ReportsView
              documents={curriculumVisibleDocuments}
              profile={profile}
              categories={curriculumCategories}
              activityLogs={activityLogs}
              academicYear={academicYear}
              onRestoreBackup={handleRestoreBackup}
              onFetchAllYearsDocuments={fetchAllDocumentsFromFirestore}
            />
          )}

          {/* Profil Satuan Pendidikan & Upload Logo */}
          {currentUser.role === 'waka_kurikulum' && activeView === 'profile' && (
            <SchoolProfileView
              profile={profile}
              onSaveProfile={handleSaveProfile}
            />
          )}

          {/* Kelola Kategori Perangkat Pembelajaran (Kurikulum) */}
          {currentUser.role === 'waka_kurikulum' && activeView === 'categories' && (
            <CategoryManagementView
              scope="kurikulum"
              categories={curriculumCategories}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          )}

          {/* Kelola Data Guru Pengampu & Pejabat Waka Kurikulum */}
          {currentUser.role === 'waka_kurikulum' && activeView === 'teachers' && (
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

      {/* Auto Upload Modal (Kurikulum) */}
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
          categories={curriculumCategories}
          initialTeacherId={uploadTargetTeacherId}
          initialCategoryId={uploadTargetCategoryId}
          userRole={currentUser.role}
          currentUser={currentUser}
        />
      )}

      {/* Wali Kelas Upload Modal */}
      {isWalasUploadModalOpen && (
        <WalasUploadModal
          isOpen={isWalasUploadModalOpen}
          onClose={() => {
            setIsWalasUploadModalOpen(false);
            setWalasUploadClass(null);
            setWalasUploadCategoryId(null);
          }}
          onSaveDocuments={handleSaveDocuments}
          homeroomEntries={homeroomEntries}
          profile={profile}
          currentSemester={currentSemester}
          currentAcademicYear={academicYear}
          walasCategories={walasCategories}
          initialHomeroomClass={walasUploadClass}
          initialCategoryId={walasUploadCategoryId}
          userRole={currentUser.role}
          lockedHomeroomClass={isHomeroomGuru ? activeHomeroomClass : null}
        />
      )}

      {/* Document Detail & Preview Modal (Tanda Mata) */}
      {selectedDoc && (
        <DocumentDetailModal
          document={selectedDoc}
          isOpen={Boolean(selectedDoc)}
          onClose={() => setSelectedDoc(null)}
          onUpdateStatus={handleUpdateDocumentStatus}
          onResubmitRevision={handleResubmitRevision}
          onPrintValidationSheet={(doc) => {
            setSelectedDoc(null);
            setPrintDoc(doc);
          }}
          onRequestEditUpload={(doc) => {
            setSelectedDoc(null);
            setEditDoc(doc);
          }}
          categories={categories}
          userRole={currentUser.role}
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
          userRole={currentUser.role}
          wakaTeacher={currentUser.role === 'waka_kurikulum' ? wakaSelfTeacher : null}
        />
      )}

      {/* Print Official Approval Sheet */}
      {printDoc && (
        <PrintValidationSheet
          document={printDoc}
          profile={profile}
          categories={categories}
          isOpen={Boolean(printDoc)}
          onClose={() => setPrintDoc(null)}
        />
      )}
    </div>
  );
}
