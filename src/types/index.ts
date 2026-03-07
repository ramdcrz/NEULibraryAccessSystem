
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'user';
  user_type: 'Student' | 'Staff' | 'Employee' | null;
  college_office: string | null;
  isBlocked: boolean;
  createdAt: Date | Timestamp;
}

export interface VisitLog {
  id: string;
  uid: string;
  email: string;
  userType: 'Student' | 'Staff' | 'Employee';
  college_office: string; // Snapshotted for historical accuracy
  reason: string;
  timestamp: Timestamp;
  entryDate: string; // YYYY-MM-DD
}

export type VisitLogPayload = Omit<VisitLog, 'id' | 'timestamp'>;
