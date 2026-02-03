import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { UserProfile, VisitLogPayload } from '@/types';

// Fetch a user document from Firestore
export async function getUserDoc(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    return {
      email: data.email,
      role: data.role,
      college_office: data.college_office,
      is_blocked: data.is_blocked,
      createdAt: (data.createdAt as Timestamp).toDate(),
    };
  } else {
    return null;
  }
}

// Create a new user document in Firestore
export async function createUserDoc(uid: string, data: Omit<UserProfile, 'createdAt'>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
}

// Add a new visit log to Firestore
export async function addVisitLog(logData: VisitLogPayload): Promise<void> {
  const visitLogsCollection = collection(db, 'visit_logs');
  await addDoc(visitLogsCollection, {
    ...logData,
    timestamp: serverTimestamp(),
  });
}
