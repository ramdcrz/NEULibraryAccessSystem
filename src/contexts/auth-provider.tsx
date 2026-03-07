'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { createUserDoc, getUserDoc } from '@/lib/firebase/firestore';
import type { UserProfile } from '@/types';

export type AuthenticatedUser = UserProfile & { 
  uid: string;
  photoURL?: string | null;
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDoc = await getUserDoc(firebaseUser.uid);
        if (userDoc) {
          setUser({ ...userDoc, uid: firebaseUser.uid, photoURL: firebaseUser.photoURL });
        } else {
          const newUserProfile: Omit<UserProfile, 'createdAt'> = {
            email: firebaseUser.email!,
            role: 'user',
            collegeOffice: null,
            isBlocked: false,
          };
          // createUserDoc is now non-blocking
          createUserDoc(firebaseUser.uid, newUserProfile);
          setUser({ 
            ...newUserProfile, 
            uid: firebaseUser.uid, 
            photoURL: firebaseUser.photoURL,
            createdAt: new Date() 
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error during sign in with Google: ", error);
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const value = { user, loading, signInWithGoogle, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
