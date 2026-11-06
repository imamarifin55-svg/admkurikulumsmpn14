import { 
  collection, doc, getDocs, setDoc, deleteDoc, 
  onSnapshot, query, where, orderBy 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { CurriculumDocument, SchoolProfile, CategoryItem } from '../types/curriculum';

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

// Subscribe to real-time documents with optional teacherId filter for Guru vs Waka
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
    await setDoc(doc(db, 'documents', document.id), document, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Batch save documents
export async function batchSaveDocumentsToFirestore(documents: CurriculumDocument[]): Promise<void> {
  for (const d of documents) {
    await saveDocumentToFirestore(d);
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
    await setDoc(doc(db, 'school_config', 'profile'), profile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
