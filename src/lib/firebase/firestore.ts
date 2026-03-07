
import {
  doc,
  getDoc,
  setDoc,
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
      is_blocked: data.is_blocked,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
    } as UserProfile;
  } else {
    return null;
  }
}

// Create a new user document in Firestore (Non-blocking)
export function createUserDoc(uid: string, data: Omit<UserProfile, 'id' | 'createdAt'>) {
  const userRef = doc(db, 'users', uid);
  
  const email = data.email || '';
  const localPart = email.split('@')[0];
  const isStudent = localPart.includes('.');
  const derivedUserType = isStudent ? 'Student' : null;
  const isTargetAdmin = email === 'ramiljr.deocariza@neu.edu.ph';

  const payload = {
    ...data,
    user_type: data.user_type || derivedUserType,
    role: isTargetAdmin ? 'admin' : (data.role || 'user'),
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
