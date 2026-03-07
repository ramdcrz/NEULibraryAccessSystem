import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'user';
  college_office: string | null;
  is_blocked: boolean;
  createdAt: Date | Timestamp;
}

export interface VisitLog {
  id: string;
  userId: string;
  email: string;
  userType: 'faculty' | 'student' | 'employee';
  college_office: string; // Snapshotted for historical accuracy
  reason: string;
  timestamp: Timestamp;
  entryDate: string; // YYYY-MM-DD
}

export type VisitLogPayload = Omit<VisitLog, 'id' | 'timestamp'>;
