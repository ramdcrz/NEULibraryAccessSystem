import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  email: string;
  role: 'admin' | 'user';
  collegeOffice: string | null;
  isBlocked: boolean;
  createdAt: Date | Timestamp;
}

export interface VisitLog {
  id: string;
  userId: string;
  email: string;
  userType: 'faculty' | 'student' | 'employee';
  reason: string;
  timestamp: Timestamp;
  entryDate: string; // YYYY-MM-DD
}

export type VisitLogPayload = Omit<VisitLog, 'id' | 'timestamp'>;
