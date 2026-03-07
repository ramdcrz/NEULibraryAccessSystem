'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { onSnapshot, doc, Timestamp, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
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
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Use onSnapshot to listen for real-time changes to the user document
        // This ensures the UI updates immediately when the profile is completed or status changes.
        unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUser({
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              email: data.email,
              role: data.role || 'user',
              college_office: data.college_office,
              is_blocked: !!data.is_blocked,
              photoURL: firebaseUser.photoURL,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
            } as AuthenticatedUser);
            setLoading(false);
          } else {
            // New user initialization logic: Create a default document if it doesn't exist.
            const newUserProfileData = {
              email: firebaseUser.email!,
              role: 'user',
              college_office: null,
              is_blocked: false,
              id: firebaseUser.uid,
              createdAt: serverTimestamp(),
            };
            
            // Initiate creation. The onSnapshot listener will trigger again once it's created.
            setDoc(userRef, newUserProfileData).catch(err => {
               console.error("Error creating user profile document:", err);
            });
          }
        }, (error) => {
          console.error("User document listener error:", error);
          setLoading(false);
        });
      } else {
        // User signed out: clear the document listener and reset state.
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
