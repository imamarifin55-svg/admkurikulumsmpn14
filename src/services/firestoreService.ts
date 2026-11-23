import { 
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, 
  onSnapshot, query, where, writeBatch, orderBy, limit
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { 
  AppUser, CurriculumDocument, SchoolProfile, CategoryItem, 
  Teacher, DocumentFile, DocumentFileChunk, ActivityLog, StudentRecord 
} from '../types/curriculum';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Strip undefined fields recursively so Firestore setDoc/writeBatch never rejects optional properties
function sanitizeForFirestore<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean as T;
  }
  return obj;
}

let seedCheckPromise: Promise<boolean> | null = null;

// Seed initial curriculum data into Firestore once if the cloud collections are completely empty
// Uses limit(1) per collection (max 4 reads total) and deduplicates concurrent/repeat calls per session
export async function seedFirestoreIfEmpty(seed: {
  documents: CurriculumDocument[];
  profile: SchoolProfile;
  teachers: Teacher[];
  categories: CategoryItem[];
}): Promise<boolean> {
  if (seedCheckPromise) {
    return seedCheckPromise;
  }

  seedCheckPromise = (async () => {
    try {
      const profileRef = doc(db, 'school_config', 'profile');
      const [profileSnap, docsSnap, teachersSnap, categoriesSnap] = await Promise.all([
        getDoc(profileRef),
        getDocs(query(collection(db, 'documents'), limit(1))),
        getDocs(query(collection(db, 'teachers'), limit(1))),
        getDocs(query(collection(db, 'categories'), limit(1))),
      ]);

      const batch = writeBatch(db);
      let hasWrites = false;

      if (!profileSnap.exists()) {
        batch.set(profileRef, sanitizeForFirestore(seed.profile), { merge: true });
        hasWrites = true;
      }

      if (teachersSnap.empty && seed.teachers.length > 0) {
        seed.teachers.forEach((t) => {
          batch.set(doc(db, 'teachers', t.id), sanitizeForFirestore(t), { merge: true });
        });
        hasWrites = true;
      }

      if (categoriesSnap.empty && seed.categories.length > 0) {
        seed.categories.forEach((c) => {
          batch.set(doc(db, 'categories', c.id), sanitizeForFirestore(c), { merge: true });
        });
        hasWrites = true;
      }

      if (docsSnap.empty && seed.documents.length > 0) {
        seed.documents.forEach((d) => {
          batch.set(doc(db, 'documents', d.id), sanitizeForFirestore(d), { merge: true });
        });
        hasWrites = true;
      }

      if (hasWrites) {
        await batch.commit();
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Firestore initial seed skipped or failed:', error);
      return false;
    }
  })();

  return seedCheckPromise;
}

export interface DocumentSubscriptionFilter {
  teacherId?: string | null;
  academicYear?: string | null;
}

// Subscribe to real-time documents scoped by teacherId (for Guru) or active academicYear (for Waka)
export function subscribeToDocuments(
  onUpdate: (docs: CurriculumDocument[]) => void,
  filter?: DocumentSubscriptionFilter | string | null
) {
  const collectionRef = collection(db, 'documents');
  const normalized: DocumentSubscriptionFilter =
    typeof filter === 'string' ? { teacherId: filter } : (filter || {});

  const q = normalized.teacherId
    ? query(collectionRef, where('teacherId', '==', normalized.teacherId))
    : normalized.academicYear
    ? query(collectionRef, where('academicYear', '==', normalized.academicYear))
    : collectionRef;

  return onSnapshot(
    q,
    (snapshot) => {
      const docs: CurriculumDocument[] = [];
      snapshot.forEach((docSnap) => {
        docs.push(docSnap.data() as CurriculumDocument);
      });
      docs.sort((a, b) => (b.uploadDate || '').localeCompare(a.uploadDate || ''));
      onUpdate(docs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'documents');
    }
  );
}

// Subscribe to real-time Wali Kelas documents by homeroomClass (so multi-subject teachers always see their class archives)
export function subscribeToHomeroomDocuments(
  homeroomClass: string,
  onUpdate: (docs: CurriculumDocument[]) => void
) {
  const normalizedClass = homeroomClass.trim();
  if (!normalizedClass) {
    onUpdate([]);
    return () => {};
  }

  const q = query(collection(db, 'documents'), where('homeroomClass', '==', normalizedClass));
  return onSnapshot(
    q,
    (snapshot) => {
      const docs: CurriculumDocument[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as CurriculumDocument;
        if (data.archiveScope === 'wali_kelas') {
          docs.push(data);
        }
      });
      docs.sort((a, b) => (b.uploadDate || '').localeCompare(a.uploadDate || ''));
      onUpdate(docs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'documents');
    }
  );
}

// On-demand fetch of all academic years (used only when Waka explicitly requests "Semua Tahun" in Reports)
export async function fetchAllDocumentsFromFirestore(): Promise<CurriculumDocument[]> {
  try {
    const snap = await getDocs(collection(db, 'documents'));
    const docs: CurriculumDocument[] = [];
    snap.forEach((docSnap) => {
      docs.push(docSnap.data() as CurriculumDocument);
    });
    docs.sort((a, b) => (b.uploadDate || '').localeCompare(a.uploadDate || ''));
    return docs;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'documents');
    return [];
  }
}

// One-time legacy compatibility helper: attaches missing teacherId (or repairs subject-specific teacherId) without touching other subjects
export async function backfillTeacherIdForLegacyDocs(
  teacherId: string,
  teacherName: string,
  teacherSubject?: string,
  sameNameTeacherIds: string[] = []
): Promise<number> {
  if (!teacherId || !teacherName) return 0;
  try {
    const storageKey = `arsip_teacher_subject_migrated_v2_${teacherId}`;
    if (localStorage.getItem(storageKey) === 'true') {
      return 0;
    }

    const q = query(collection(db, 'documents'), where('teacherName', '==', teacherName));
    const snap = await getDocs(q);
    const toUpdate: CurriculumDocument[] = [];
    const hasMultipleSubjects = sameNameTeacherIds.length > 1;
    const normalizedTargetSubject = (teacherSubject || '').trim().toLowerCase();

    snap.forEach((docSnap) => {
      const data = docSnap.data() as CurriculumDocument;
      const docSubject = (data.subject || '').trim().toLowerCase();
      const matchesSubject = !normalizedTargetSubject || !docSubject || docSubject === normalizedTargetSubject;

      if (!data.teacherId) {
        if (!hasMultipleSubjects || matchesSubject) {
          toUpdate.push({ ...data, teacherId });
        }
      } else if (
        hasMultipleSubjects &&
        normalizedTargetSubject &&
        docSubject === normalizedTargetSubject &&
        sameNameTeacherIds.includes(data.teacherId) &&
        data.teacherId !== teacherId
      ) {
        // Repair docs whose teacherId was previously overwritten by another subject entry of the same teacher
        toUpdate.push({ ...data, teacherId });
      }
    });

    if (toUpdate.length > 0) {
      await batchSaveDocumentsToFirestore(toUpdate);
    }

    localStorage.setItem(storageKey, 'true');
    return toUpdate.length;
  } catch (error) {
    console.warn('Legacy teacherId backfill skipped:', error);
    return 0;
  }
}

// Save or update document
export async function saveDocumentToFirestore(document: CurriculumDocument): Promise<void> {
  const path = `documents/${document.id}`;
  try {
    await setDoc(doc(db, 'documents', document.id), sanitizeForFirestore(document), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Atomic batch save documents (chunked by 400 to respect Firestore 500-write batch limit)
export async function batchSaveDocumentsToFirestore(documents: CurriculumDocument[]): Promise<void> {
  if (documents.length === 0) return;
  try {
    const BATCH_SIZE = 400;
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const slice = documents.slice(i, i + BATCH_SIZE);
      for (const d of slice) {
        batch.set(doc(db, 'documents', d.id), sanitizeForFirestore(d), { merge: true });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'documents/batch');
  }
}

// Delete document
export async function deleteDocumentFromFirestore(docId: string): Promise<void> {
  const path = `documents/${docId}`;
  try {
    await deleteDoc(doc(db, 'documents', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Subscribe to School Profile
export function subscribeToSchoolProfile(onUpdate: (profile: SchoolProfile) => void) {
  const docRef = doc(db, 'school_config', 'profile');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as SchoolProfile);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'school_config/profile');
    }
  );
}

// Save School Profile
export async function saveSchoolProfileToFirestore(profile: SchoolProfile): Promise<void> {
  const path = 'school_config/profile';
  try {
    await setDoc(doc(db, 'school_config', 'profile'), sanitizeForFirestore(profile), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Subscribe to Teachers Directory
export function subscribeToTeachers(onUpdate: (teachers: Teacher[]) => void) {
  const collectionRef = collection(db, 'teachers');
  return onSnapshot(
    collectionRef,
    (snapshot) => {
      const list: Teacher[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Teacher);
      });
      list.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'teachers');
    }
  );
}

// Save or Update Teacher
export async function saveTeacherToFirestore(teacher: Teacher): Promise<void> {
  const path = `teachers/${teacher.id}`;
  try {
    await setDoc(doc(db, 'teachers', teacher.id), sanitizeForFirestore(teacher), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Atomic batch save teachers (used when syncing Wali Kelas assignment across multi-subject records)
export async function batchSaveTeachersToFirestore(teachers: Teacher[]): Promise<void> {
  if (teachers.length === 0) return;
  try {
    const batch = writeBatch(db);
    teachers.forEach((t) => {
      batch.set(doc(db, 'teachers', t.id), sanitizeForFirestore(t), { merge: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'teachers/batch');
  }
}

// Delete Teacher
export async function deleteTeacherFromFirestore(teacherId: string): Promise<void> {
  const path = `teachers/${teacherId}`;
  try {
    await deleteDoc(doc(db, 'teachers', teacherId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Subscribe to Categories Directory
export function subscribeToCategories(onUpdate: (categories: CategoryItem[]) => void) {
  const collectionRef = collection(db, 'categories');
  return onSnapshot(
    collectionRef,
    (snapshot) => {
      const list: CategoryItem[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as CategoryItem);
      });
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'categories');
    }
  );
}

// Save or Update Category
export async function saveCategoryToFirestore(category: CategoryItem): Promise<void> {
  const path = `categories/${category.id}`;
  try {
    await setDoc(doc(db, 'categories', category.id), sanitizeForFirestore(category), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

let walasSeedPromise: Promise<void> | null = null;

// Seed default Wali Kelas categories once for existing Firestore databases that already have curriculum categories
export async function seedWalasCategoriesIfMissing(walasCategories: CategoryItem[]): Promise<void> {
  if (walasSeedPromise) return walasSeedPromise;
  walasSeedPromise = (async () => {
    try {
      const walasQuery = query(collection(db, 'categories'), where('scope', '==', 'wali_kelas'), limit(1));
      const snap = await getDocs(walasQuery);
      if (snap.empty && walasCategories.length > 0) {
        const batch = writeBatch(db);
        walasCategories.forEach((cat) => {
          batch.set(doc(db, 'categories', cat.id), sanitizeForFirestore(cat), { merge: true });
        });
        await batch.commit();
      }
    } catch (error) {
      console.warn('Wali Kelas categories seed skipped:', error);
    }
  })();
  return walasSeedPromise;
}

// Delete Category
export async function deleteCategoryFromFirestore(categoryId: string): Promise<void> {
  const path = `categories/${categoryId}`;
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Save or Update Authenticated User Profile
export async function saveUserProfileToFirestore(user: AppUser): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    await setDoc(doc(db, 'users', user.uid), sanitizeForFirestore(user), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

const FILE_CHUNK_CHAR_SIZE = 600000; // 600K chars per Firestore chunk (aman di bawah batas 1MB)
const MAX_CACHED_FILES = 12;
const documentFileMemoryCache = new Map<string, DocumentFile>();

function setCachedDocumentFile(docId: string, file: DocumentFile) {
  if (documentFileMemoryCache.has(docId)) {
    documentFileMemoryCache.delete(docId);
  } else if (documentFileMemoryCache.size >= MAX_CACHED_FILES) {
    const oldestKey = documentFileMemoryCache.keys().next().value;
    if (oldestKey) documentFileMemoryCache.delete(oldestKey);
  }
  documentFileMemoryCache.set(docId, file);
}

async function deleteChunksByRange(docId: string, startIdx: number, count: number): Promise<void> {
  if (count <= 0) return;
  const deletions: Promise<void>[] = [];
  for (let i = startIdx; i < count; i++) {
    deletions.push(deleteDoc(doc(db, 'document_file_chunks', `${docId}_chunk_${i}`)).catch(() => {}));
  }
  await Promise.all(deletions);
}

// Save physical attached document file (auto-chunks seamlessly if > 600KB up to 10MB)
export async function saveDocumentFileToFirestore(docFile: DocumentFile): Promise<void> {
  const path = `document_files/${docFile.id}`;
  try {
    documentFileMemoryCache.delete(docFile.id);

    // Check existing header so any previous excess chunks are cleaned up
    const existingSnap = await getDoc(doc(db, 'document_files', docFile.id));
    const prevChunkCount = existingSnap.exists()
      ? ((existingSnap.data() as DocumentFile).chunkCount || 0)
      : 0;

    if (docFile.dataUrl.length <= FILE_CHUNK_CHAR_SIZE) {
      if (prevChunkCount > 0) {
        await deleteChunksByRange(docFile.id, 0, prevChunkCount);
      }
      const singlePayload: DocumentFile = {
        ...docFile,
        isChunked: false,
        chunkCount: 0
      };
      await setDoc(doc(db, 'document_files', docFile.id), sanitizeForFirestore(singlePayload), { merge: true });
      setCachedDocumentFile(docFile.id, singlePayload);
      return;
    }

    // Split large dataUrl into safe 600K-char slices
    const chunks: string[] = [];
    for (let offset = 0; offset < docFile.dataUrl.length; offset += FILE_CHUNK_CHAR_SIZE) {
      chunks.push(docFile.dataUrl.slice(offset, offset + FILE_CHUNK_CHAR_SIZE));
    }

    // Write chunks in batches of up to 8 chunks per commit (~4.8MB payload/batch)
    const BATCH_LIMIT = 8;
    for (let i = 0; i < chunks.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      const slice = chunks.slice(i, i + BATCH_LIMIT);
      slice.forEach((chunkData, idx) => {
        const chunkIndex = i + idx;
        const chunkId = `${docFile.id}_chunk_${chunkIndex}`;
        const chunkDoc: DocumentFileChunk = {
          id: chunkId,
          documentId: docFile.id,
          chunkIndex,
          totalChunks: chunks.length,
          data: chunkData
        };
        batch.set(doc(db, 'document_file_chunks', chunkId), sanitizeForFirestore(chunkDoc));
      });
      await batch.commit();
    }

    const headerPayload: DocumentFile = {
      id: docFile.id,
      documentId: docFile.documentId,
      fileName: docFile.fileName,
      mimeType: docFile.mimeType,
      fileSize: docFile.fileSize,
      dataUrl: 'CHUNKED',
      isChunked: true,
      chunkCount: chunks.length,
      uploadedAt: docFile.uploadedAt
    };
    await setDoc(doc(db, 'document_files', docFile.id), sanitizeForFirestore(headerPayload));
    setCachedDocumentFile(docFile.id, docFile);

    if (prevChunkCount > chunks.length) {
      await deleteChunksByRange(docFile.id, chunks.length, prevChunkCount);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Fetch physical attached document file on demand (uses session memory cache to avoid repeat chunk reads)
export async function getDocumentFileFromFirestore(docId: string): Promise<DocumentFile | null> {
  const cached = documentFileMemoryCache.get(docId);
  if (cached) {
    return cached;
  }

  const path = `document_files/${docId}`;
  try {
    const snap = await getDoc(doc(db, 'document_files', docId));
    if (!snap.exists()) return null;

    const header = snap.data() as DocumentFile;
    if (!header.isChunked || !header.chunkCount) {
      setCachedDocumentFile(docId, header);
      return header;
    }

    const chunkPromises: Promise<string>[] = [];
    for (let i = 0; i < header.chunkCount; i++) {
      chunkPromises.push(
        getDoc(doc(db, 'document_file_chunks', `${docId}_chunk_${i}`)).then((chunkSnap) => {
          if (!chunkSnap.exists()) return '';
          return (chunkSnap.data() as DocumentFileChunk).data || '';
        })
      );
    }

    const parts = await Promise.all(chunkPromises);
    const assembledDataUrl = parts.join('');
    if (!assembledDataUrl) return null;

    const fullFile: DocumentFile = {
      ...header,
      dataUrl: assembledDataUrl
    };
    setCachedDocumentFile(docId, fullFile);
    return fullFile;
  } catch (error) {
    console.warn('Gagal mengambil lampiran berkas:', path, error);
    return null;
  }
}

// Delete attached physical file + all chunks when document is deleted
export async function deleteDocumentFileFromFirestore(docId: string): Promise<void> {
  try {
    documentFileMemoryCache.delete(docId);
    const snap = await getDoc(doc(db, 'document_files', docId));
    const chunkCount = snap.exists() ? ((snap.data() as DocumentFile).chunkCount || 0) : 0;
    await deleteDoc(doc(db, 'document_files', docId));
    if (chunkCount > 0) {
      await deleteChunksByRange(docId, 0, chunkCount);
    }
  } catch (error) {
    console.warn('Penghapusan lampiran dilewati atau gagal:', error);
  }
}

// Append immutable audit activity log
export async function addActivityLogToFirestore(log: ActivityLog): Promise<void> {
  const path = `activity_logs/${log.id}`;
  try {
    await setDoc(doc(db, 'activity_logs', log.id), sanitizeForFirestore(log));
  } catch (error) {
    console.warn('Gagal mencatat log aktivitas:', path, error);
  }
}

// Subscribe to latest 25 activity logs in real time (matches UI render cap for Waka Kurikulum)
export function subscribeToActivityLogs(onUpdate: (logs: ActivityLog[]) => void) {
  const q = query(
    collection(db, 'activity_logs'),
    orderBy('timestamp', 'desc'),
    limit(25)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const logs: ActivityLog[] = [];
      snapshot.forEach((docSnap) => {
        logs.push(docSnap.data() as ActivityLog);
      });
      onUpdate(logs);
    },
    (error) => {
      console.warn('Gagal berlangganan log aktivitas:', error);
    }
  );
}

// Subscribe to homeroom students (scoped by homeroomClass for Guru, or all classes for Waka Kurikulum)
export function subscribeToStudents(
  onUpdate: (students: StudentRecord[]) => void,
  homeroomClass?: string | null
) {
  const collectionRef = collection(db, 'students');
  const normalizedClass = homeroomClass?.trim().toUpperCase();
  const q = normalizedClass
    ? query(collectionRef, where('homeroomClass', '==', normalizedClass))
    : collectionRef;

  return onSnapshot(
    q,
    (snapshot) => {
      const list: StudentRecord[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as StudentRecord);
      });
      list.sort((a, b) => {
        const clsCmp = (a.homeroomClass || '').localeCompare(b.homeroomClass || '', undefined, { numeric: true });
        if (clsCmp !== 0) return clsCmp;
        return (a.name || '').localeCompare(b.name || '', 'id');
      });
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'students');
    }
  );
}

// Save or update a single student record
export async function saveStudentToFirestore(student: StudentRecord): Promise<void> {
  const path = `students/${student.id}`;
  try {
    await setDoc(doc(db, 'students', student.id), sanitizeForFirestore(student), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Batch save students (chunked by 400 to respect Firestore write limits)
export async function batchSaveStudentsToFirestore(students: StudentRecord[]): Promise<void> {
  if (students.length === 0) return;
  try {
    const BATCH_SIZE = 400;
    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const slice = students.slice(i, i + BATCH_SIZE);
      for (const s of slice) {
        batch.set(doc(db, 'students', s.id), sanitizeForFirestore(s), { merge: true });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'students/batch');
  }
}

// Delete a student record
export async function deleteStudentFromFirestore(studentId: string): Promise<void> {
  const path = `students/${studentId}`;
  try {
    await deleteDoc(doc(db, 'students', studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

