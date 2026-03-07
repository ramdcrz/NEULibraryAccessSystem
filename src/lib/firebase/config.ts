import { initializeFirebase } from '@/firebase';

// Unify initialization to use the centralized logic in src/firebase/index.ts
// This prevents multiple Firebase instances from conflicting in different tabs.
const { firebaseApp, auth, firestore: db } = initializeFirebase();

export { firebaseApp as app, auth, db };
