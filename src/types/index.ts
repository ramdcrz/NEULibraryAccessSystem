
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
  status: 'active' | 'completed' | 'auto-closed';
  timestamp: Timestamp;
  exitTimestamp?: Timestamp | null;
  duration?: number | null;
  entryDate: string; // YYYY-MM-DD
}

export type VisitLogPayload = Omit<VisitLog, 'id' | 'status' | 'timestamp' | 'exitTimestamp' | 'duration'>;
