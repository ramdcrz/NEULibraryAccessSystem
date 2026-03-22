'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { onSnapshot, doc, Timestamp, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import type { UserProfile } from '@/types';
import { toast } from '@/hooks/use-toast';

export type AuthenticatedUser = UserProfile & { 
  uid: string;
  photoURL?: string | null;
  displayName?: string | null;
};

interface AuthContextType {
  user: AuthenticatedUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BACKDOOR_EMAIL = 'nemostyles009@gmail.com';

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const db = useFirestore();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  useEffect(() => {
    if (!auth || !db) return;

    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const email = firebaseUser.email || '';
        const isBackdoor = email === BACKDOOR_EMAIL;
        
        // Strict Email Validation (with Backdoor bypass)
        if (!email.endsWith('@neu.edu.ph') && !isBackdoor) {
          toast({
            variant: "destructive",
            title: "Access System Alert",
            description: "Official @neu.edu.ph account required for access. Personal accounts are restricted.",
            className: "rounded-2xl border-2 shadow-2xl font-black",
          });
          signOut();
          return;
        }

        const userRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            let data = docSnap.data();
            
            // Auto-migration: Update legacy college name in database profile
            if (data.college_office === 'College of Computer Studies') {
              const updatedName = 'College of Informatics and Computing Studies';
              updateDoc(userRef, { college_office: updatedName });
              data.college_office = updatedName;
            }

            setUser({
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              email: data.email,
              role: data.role || 'user',
              user_type: data.user_type,
              college_office: data.college_office,
              isBlocked: !!data.isBlocked,
              photoURL: firebaseUser.photoURL,
              displayName: firebaseUser.displayName,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
            } as AuthenticatedUser);
            setLoading(false);
          } else {
            // New Profile Creation Flow
            const localPart = email.split('@')[0];
            const isStudent = !isBackdoor && localPart.includes('.');
            const derivedUserType = isStudent ? 'Student' : null;
            const isTargetAdmin = email === 'ramiljr.deocariza@neu.edu.ph';

            const newUserProfileData = {
              email: email,
              role: isTargetAdmin ? 'admin' : 'user',
              user_type: derivedUserType,
              college_office: null,
              isBlocked: false,
              id: firebaseUser.uid,
              createdAt: serverTimestamp(),
            };
            
            setDoc(userRef, newUserProfileData)
              .then(() => {
                // onSnapshot will trigger again and set loading: false
              })
              .catch(err => {
                 console.error("Error creating user profile document:", err);
                 setLoading(false);
              });
          }
        }, (error) => {
          console.error("User document listener error:", error);
          setLoading(false);
        });
      } else {
        if (unsubscribeDoc) {
          unsubscribeDoc();
          unsubscribeDoc = null;
        }
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, [auth, db]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    try {
      setLoading(true);
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      setLoading(false);
      throw error;
    }
  };

  const value = { user, loading, signInWithGoogle, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
