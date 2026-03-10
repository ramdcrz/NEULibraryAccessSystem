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
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { setHours, setMinutes } from 'date-fns';

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
      isBlocked: !!data.isBlocked,
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
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: userRef.path,
        operation: 'update',
        requestResourceData: data,
      } satisfies SecurityRuleContext));
    }
  });
}

/**
 * Toggles the blocked status of a user.
 */
export async function toggleUserBlock(uid: string) {
  if (!uid || typeof uid !== 'string') {
    throw new Error('A valid User ID (uid) is required to toggle block status.');
  }

  const userRef = doc(db, 'users', uid);
  
  // We still await the status check to determine the toggle, 
  // but the update itself could be non-blocking. 
  // However, for admin controls, a short await is often preferred for UI state sync.
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new Error('User profile not found in the system.');
  }

  const currentStatus = !!userSnap.data().isBlocked;
  const newStatus = !currentStatus;

  updateDoc(userRef, {
    isBlocked: newStatus
  }).catch(error => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: userRef.path,
        operation: 'update',
        requestResourceData: { isBlocked: newStatus },
      } satisfies SecurityRuleContext));
    }
  });

  return newStatus;
}

// Add a new visit log to Firestore (Non-blocking)
export function addVisitLog(logData: VisitLogPayload) {
  const visitLogsCollection = collection(db, 'visit_logs');
  
  const payload = {
    ...logData,
    status: 'active',
    timestamp: serverTimestamp(),
  };

  // CRITICAL: Initiating write without awaiting. 
  // Firebase updates local cache immediately.
  addDoc(visitLogsCollection, payload).catch(async (error) => {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: visitLogsCollection.path,
        operation: 'create',
        requestResourceData: payload,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }
  });
}

/**
 * Checks out a user from an existing visit log and calculates duration.
 * (Non-blocking)
 */
export function checkOutVisitLog(logId: string, entryTimestamp: Timestamp | null) {
  const logRef = doc(db, 'visit_logs', logId);
  
  const entryDate = entryTimestamp ? entryTimestamp.toDate() : new Date();
  const exitDate = new Date();
  const durationMs = exitDate.getTime() - entryDate.getTime();
  const durationMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));

  const updateData = {
    exitTimestamp: serverTimestamp(),
    duration: durationMinutes,
    status: 'completed'
  };

  updateDoc(logRef, updateData).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: logRef.path,
        operation: 'update',
        requestResourceData: updateData,
      } satisfies SecurityRuleContext));
    }
  });
}

/**
 * Institutional Policy: Library closes at 6:00 PM.
 * Auto-closes abandoned or end-of-day sessions. (Non-blocking)
 */
export function autoCloseVisitLog(logId: string, entryTimestamp: Timestamp | null) {
  const logRef = doc(db, 'visit_logs', logId);
  
  const entryDate = entryTimestamp ? entryTimestamp.toDate() : new Date();
  
  // Rule: Final exit time is set to 6:00 PM of the visit day
  const closingDate = setMinutes(setHours(entryDate, 18), 0);
  
  const durationMs = Math.max(0, closingDate.getTime() - entryDate.getTime());
  const durationMinutes = Math.round(durationMs / (1000 * 60));

  const updateData = {
    exitTimestamp: Timestamp.fromDate(closingDate),
    duration: durationMinutes || 180, // Fallback to 3h if math yields 0
    status: 'auto-closed'
  };

  updateDoc(logRef, updateData).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: logRef.path,
        operation: 'update',
        requestResourceData: updateData,
      } satisfies SecurityRuleContext));
    }
  });
}
