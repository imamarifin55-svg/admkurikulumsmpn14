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
  INITIAL_DOCUMENTS, INITIAL_SCHOOL_PROFILE, INITIAL_TEACHERS, INITIAL_CATEGORIES 
} from './data/initialCurriculumData';
import { AlertTriangle, ArrowRight } from 'lucide-react';

import { 
  subscribeToDocuments, saveDocumentToFirestore, 
  batchSaveDocumentsToFirestore, deleteDocumentFromFirestore,
  fetchAllDocumentsFromFirestore, backfillTeacherIdForLegacyDocs,
  subscribeToSchoolProfile, saveSchoolProfileToFirestore,
  subscribeToTeachers, saveTeacherToFirestore, deleteTeacherFromFirestore,
  subscribeToCategories, saveCategoryToFirestore, deleteCategoryFromFirestore,
  seedFirestoreIfEmpty, saveUserProfileToFirestore,
  saveDocumentFileToFirestore, deleteDocumentFileFromFirestore,
  addActivityLogToFirestore, subscribeToActivityLogs
} from './services/firestoreService';
import { testFirestoreConnection } from './services/firebase';

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
import { AutoUploadModal, WAKA_SELF_TEACHER_ID } from './components/AutoUploadModal';
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
  const [activeView, setActiveView] = useState<'matrix' | 'list' | 'supervision' | 'reports' | 'profile' | 'categories' | 'teachers'>('matrix');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<CurriculumDocument | null>(null);
  const [editDoc, setEditDoc] = useState<CurriculumDocument | null>(null);
  const [printDoc, setPrintDoc] = useState<CurriculumDocument | null>(null);

  // Toast / feedback notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

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

  // 2B. Authenticated & quota-scoped subscriptions:
  // - Categories only load after login
  // - Guru only subscribes to own documents (teacherId filter); Waka only subscribes to active academicYear
  // - Activity logs (25 latest) only load for Waka Kurikulum
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const unsubCategories = subscribeToCategories((remoteCategories) => {
      if (remoteCategories.length > 0 || isCloudInitializedRef.current) {
        isCloudInitializedRef.current = true;
        setCategories(remoteCategories);
      }
    });

    const isGuruScoped = currentUser.role === 'guru' && Boolean(currentUser.teacherId);
    if (isGuruScoped && currentUser.teacherId && currentUser.displayName) {
      backfillTeacherIdForLegacyDocs(currentUser.teacherId, currentUser.displayName).catch(() => {});
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
      unsubLogs();
    };
  }, [isAuthenticated, currentUser.role, currentUser.teacherId, currentUser.displayName, academicYear]);

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

  // Add new documents from automatic upload modal
  const handleSaveDocuments = async (
    newDocs: CurriculumDocument[],
    attachedFiles?: DocumentFile[]
  ) => {
    setDocuments(prev => [...newDocs, ...prev]);
    try {
      if (attachedFiles && attachedFiles.length > 0) {
        await Promise.all(attachedFiles.map(f => saveDocumentFileToFirestore(f)));
      }
      await batchSaveDocumentsToFirestore(newDocs);
      const summaryTitle =
        newDocs.length === 1 ? newDocs[0].title : `${newDocs.length} Berkas Kurikulum`;
      logActivity(
        'UPLOAD',
        summaryTitle,
        `Mengunggah ${newDocs.length} perangkat kurikulum (TP ${academicYear}, Smt ${currentSemester === 'ganjil' ? 'Ganjil' : 'Genap'}).`
      );
      showToast(`Berhasil mengarsipkan ${newDocs.length} berkas kurikulum ke Cloud Real-Time.`);
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan ke Cloud Firestore. Periksa koneksi internet Anda.');
    }
  };

  // Resubmit document after revision (Guru workflow)
  const handleResubmitRevision = async (
    updatedDoc: CurriculumDocument,
    _updatedExternalUrl?: string,
    newAttachedFile?: DocumentFile
  ) => {
    setDocuments(prev => prev.map(d => (d.id === updatedDoc.id ? updatedDoc : d)));
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

  // Update existing document from Edit Modal
  const handleSaveEditedDocument = async (updatedDoc: CurriculumDocument) => {
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    if (selectedDoc?.id === updatedDoc.id) {
      setSelectedDoc(updatedDoc);
    }
    try {
      await saveDocumentToFirestore(updatedDoc);
      logActivity('UPDATE_DOC', updatedDoc.title, `Memperbarui metadata berkas (${updatedDoc.subject}, Kelas ${updatedDoc.grade}).`);
      showToast(`Perubahan berkas "${updatedDoc.title}" tersinkron ke Cloud Real-Time.`);
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
      logActivity('CONFIG', updatedProfile.name, 'Memperbarui profil sekolah, tanda tangan digital, atau PIN keamanan Waka.');
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

  // Add new teacher
  const handleAddTeacher = async (newTeacher: Teacher) => {
    setTeachers(prev => [...prev, newTeacher]);
    try {
      await saveTeacherToFirestore(newTeacher);
      logActivity('CONFIG', newTeacher.name, `Menambahkan guru pengampu baru (${newTeacher.subject}).`);
      showToast(`Guru "${newTeacher.name}" berhasil ditambahkan ke Cloud Real-Time.`);
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan data guru ke Cloud Firestore.');
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

    try {
      await saveTeacherToFirestore(updatedTeacher);
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

  // Delete document
  const handleDeleteDocument = async (docId: string) => {
    const removed = documents.find(d => d.id === docId);
    setDocuments(prev => prev.filter(d => d.id !== docId));
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

  const handleOpenGeneralUpload = () => {
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

  // Role-Based Filtering:
  // When role === 'guru', only documents matching that teacher's id or username are shown!
  const currentLoggedInTeacher = teachers.find(t => t.id === currentUser.teacherId);
  const visibleDocuments = currentUser.role === 'guru'
    ? documents.filter(d => 
        (currentUser.teacherId && d.teacherId === currentUser.teacherId) ||
        (currentLoggedInTeacher && d.teacherName.toLowerCase().includes(currentLoggedInTeacher.name.split(' ')[0].toLowerCase())) ||
        (!currentLoggedInTeacher && currentUser.displayName && d.teacherName.toLowerCase().includes(currentUser.displayName.toLowerCase()))
      )
    : documents;

  // Counts for tabs & navigation
  const semesterDocsCount = visibleDocuments.filter(d => d.semester === currentSemester && d.academicYear === academicYear).length;
  const ganjilCount = visibleDocuments.filter(d => d.semester === 'ganjil' && d.academicYear === academicYear).length;
  const genapCount = visibleDocuments.filter(d => d.semester === 'genap' && d.academicYear === academicYear).length;
  const pendingCount = visibleDocuments.filter(d => d.status === 'diajukan').length;
  const revisionDocsForGuru = visibleDocuments.filter(d => d.status === 'perlu_revisi');

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
        pendingCount={pendingCount}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
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
          onLogout={handleLogout}
          wakaName={profile.curriculumViceName}
        />

        {/* Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">

          {/* Guru Reminder Banner for Documents Needing Revision */}
          {currentUser.role === 'guru' && revisionDocsForGuru.length > 0 && (
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
                    Silakan tinjau catatan supervisi dan unggah perbaikan atau tautan berkas terbaru untuk diajukan ulang.
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
                          className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors"
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
          {activeView !== 'profile' && activeView !== 'categories' && activeView !== 'teachers' && (
            <SchoolBanner
              profile={profile}
              documents={visibleDocuments}
              currentSemester={currentSemester}
              academicYear={academicYear}
              teachers={teachers}
              categories={categories}
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
              wakaTeacher={currentUser.role === 'waka_kurikulum' ? wakaSelfTeacher : null}
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
              categories={categories}
              currentSemester={currentSemester}
              academicYear={academicYear}
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
              categories={categories}
              activityLogs={activityLogs}
              currentSemester={currentSemester}
              academicYear={academicYear}
              onRestoreBackup={handleRestoreBackup}
              onFetchAllYearsDocuments={fetchAllDocumentsFromFirestore}
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
          userRole={currentUser.role}
          currentUser={currentUser}
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
