# **App Name**: NEU Library Access System

## Core Features:

- Google Sign-In Authentication: Implement Google Sign-In for user authentication, restrict login to the @neu.edu.ph domain or classify other users.
- Firestore User Data Model: Store user data in Firestore: uid (document ID), email, role (enum: 'admin', 'user'), college_office (string, nullable), is_blocked (boolean, default false), createdAt (timestamp).
- Firestore Visit Logs: Record visit logs in Firestore: userId (ref), email, userType (faculty/student/employee), reason (string), timestamp (server timestamp), entryDate (YYYY-MM-DD).
- New User Initialization: Check if a user document exists upon login. If not, create a default document (role: 'user', is_blocked: false).
- Reason Selection: Allow users to choose the purpose of the visit in the main dashboard

## Style Guidelines:

- Primary color: Dark indigo (#3F51B5), evoking a sense of institutional trust.
- Background color: Very dark gray (#222222), complementing a modern UI aesthetic.
- Accent color: Teal (#008080), adding sophistication.
- Body and headline font: 'Inter', sans-serif, creating a modern, clean design.
- Minimalist icons to represent library functions and user actions.
- A clean and intuitive layout, guiding the user through a series of steps that collect minimal data while still following protocol.
- Subtle transition animations to confirm important milestones during onboarding or normal usage.