
import {
  doc,
  getDoc,
  updateDoc,
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
      id: uid,
      email: data.email,
      role: data.role,
      user_type: data.user_type,
      college_office: data.college_office,
      isBlocked: data.isBlocked,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
    } as UserProfile;
  } else {
    return null;
  }
}

// Update a user document in Firestore (Non-blocking)
export function updateUserDoc(uid: string, data: Partial<UserProfile>) {
  const userRef = doc(db, 'users', uid);
  
  updateDoc(userRef, data).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: userRef.path,
      operation: 'update',
      requestResourceData: data,
    }));
  });
}

/**
 * Toggles the blocked status of a user using camelCase field: isBlocked.
 */
export async function toggleUserBlock(uid: string) {
  if (!uid || typeof uid !== 'string') {
    throw new Error('A valid User ID (uid) is required to toggle block status.');
  }

  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new Error('User profile not found in the system.');
  }

  const currentStatus = !!userSnap.data().isBlocked;
  const newStatus = !currentStatus;

  await updateDoc(userRef, {
    isBlocked: newStatus
  });

  return newStatus;
}

// Add a new visit log to Firestore (Non-blocking)
export function addVisitLog(logData: VisitLogPayload) {
  const visitLogsCollection = collection(db, 'visit_logs');
  
  const payload = {
    ...logData,
    timestamp: serverTimestamp(),
  };

  addDoc(visitLogsCollection, payload).catch(async (error) => {
    const permissionError = new FirestorePermissionError({
      path: visitLogsCollection.path,
      operation: 'create',
      requestResourceData: payload,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}
