
'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { onSnapshot, doc, Timestamp, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
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

export function AuthProvider({ children }: { children: ReactNode }) {
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
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const email = firebaseUser.email || '';
        
        // Strict Email Validation
        if (!email.endsWith('@neu.edu.ph')) {
          toast({
            variant: "destructive",
            title: "Access Restricted",
            description: "Please use your official @neu.edu.ph account.",
          });
          signOut();
          return;
        }

        const userRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            
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
            const isStudent = localPart.includes('.');
            
            // Rule: If local part has a dot, they are definitely a Student.
            // If not, they must choose between Staff/Employee later (null).
            const derivedUserType = isStudent ? 'Student' : null;
            
            // Hardcoded Admin Logic
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
            
            setDoc(userRef, newUserProfileData).catch(err => {
               console.error("Error creating user profile document:", err);
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
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      hd: 'neu.edu.ph',
      prompt: 'select_account'
    });
    try {
      setLoading(true);
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      // Handle cancellation errors silently without console.error or re-throwing
      const isCancellation = 
        error.code === 'auth/popup-closed-by-user' || 
        error.code === 'auth/cancelled-popup-request';
        
      if (!isCancellation) {
        console.error("Error during sign in with Google: ", error);
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  const value = { user, loading, signInWithGoogle, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
