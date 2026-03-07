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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// Fetch a user document from Firestore
export async function getUserDoc(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    return {
      id: data.id || uid,
      email: data.email,
      role: data.role,
      collegeOffice: data.collegeOffice,
      isBlocked: data.isBlocked,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
    } as UserProfile;
  } else {
    return null;
  }
}

// Create a new user document in Firestore (Non-blocking)
export function createUserDoc(uid: string, data: Omit<UserProfile, 'id' | 'createdAt'>) {
  const userRef = doc(db, 'users', uid);
  const payload = {
    ...data,
    id: uid,
    createdAt: serverTimestamp(),
  };
  
  setDoc(userRef, payload).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: userRef.path,
      operation: 'create',
      requestResourceData: payload,
    }));
  });
}

// Add a new visit log to Firestore (Non-blocking)
export function addVisitLog(logData: VisitLogPayload) {
  // Path corrected to match security rules: /users/{userId}/visit_logs/{visitLogId}
  const visitLogsCollection = collection(db, 'users', logData.userId, 'visit_logs');
  
  addDoc(visitLogsCollection, {
    ...logData,
    timestamp: serverTimestamp(),
  }).catch(async (error) => {
    const permissionError = new FirestorePermissionError({
      path: visitLogsCollection.path,
      operation: 'create',
      requestResourceData: logData,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}
