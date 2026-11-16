import { 
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, 
  onSnapshot, query, where, writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { AppUser, CurriculumDocument, SchoolProfile, CategoryItem, Teacher } from '../types/curriculum';

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

// Seed initial curriculum data into Firestore once if the cloud collections are completely empty
export async function seedFirestoreIfEmpty(seed: {
  documents: CurriculumDocument[];
  profile: SchoolProfile;
  teachers: Teacher[];
  categories: CategoryItem[];
}): Promise<boolean> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return false;

  try {
    const profileRef = doc(db, 'school_config', 'profile');
    const [profileSnap, docsSnap, teachersSnap, categoriesSnap] = await Promise.all([
      getDoc(profileRef),
      getDocs(collection(db, 'documents')),
      getDocs(collection(db, 'teachers')),
      getDocs(collection(db, 'categories')),
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
}

// Subscribe to real-time documents with optional teacherId filter
export function subscribeToDocuments(
  onUpdate: (docs: CurriculumDocument[]) => void,
  teacherIdFilter?: string | null
) {
  const collectionRef = collection(db, 'documents');
  const q = teacherIdFilter 
    ? query(collectionRef, where('teacherId', '==', teacherIdFilter))
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

// Save or update document
export async function saveDocumentToFirestore(document: CurriculumDocument): Promise<void> {
  const path = `documents/${document.id}`;
  try {
    await setDoc(doc(db, 'documents', document.id), sanitizeForFirestore(document), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Atomic batch save documents
export async function batchSaveDocumentsToFirestore(documents: CurriculumDocument[]): Promise<void> {
  if (documents.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const d of documents) {
      batch.set(doc(db, 'documents', d.id), sanitizeForFirestore(d), { merge: true });
    }
    await batch.commit();
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

