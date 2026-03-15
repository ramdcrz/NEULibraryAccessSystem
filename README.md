# 📖 NEU Library Access System

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

The **NEU Library Access System** is a modern, full-stack web application designed exclusively for New Era University to digitize and streamline the logging, monitoring, and reporting of library visitors. 

By replacing inefficient manual logbooks with an automated digital workflow, this system ensures accurate data collection, provides real-time analytics, and generates official administrative reports with a single click.

> **🚀 Live Demo:** [View the deployed application here](https://studio--studio-1754625213-ccf19.us-central1.hosted.app/)

---

## ✨ Key Features
* **⏱️ Real-Time Visitor Logging:** Precisely tracks **Time In** and **Time Out**, automatically calculating the total **Duration** of a user's stay.
* **🔐 Role-Based Access Control:** * **Admin Dashboard:** Full access to monitor active users, view historical logs, and generate reports.
  * **Logger/Kiosk Interface:** A streamlined, distraction-free view for students and staff to quickly sign in and out.
* **🤖 Smart Status Tracking:** The system intelligently classifies sessions as `ACTIVE`, `COMPLETED`, or `AUTO-CLOSED` to maintain database accuracy.
* **📊 Comprehensive Categorization:** Organizes visitor data by **Affiliation** (Student, Staff) and specific **Purpose** (e.g., Computer Use, Print / Scan, Borrow / Return Book, Study / Read).
* **📄 Professional PDF Reporting:** Uses `jsPDF` and `autoTable` to instantly export highly formatted, print-ready official reports. Reports include custom metadata (generation timestamps, active filters) and clean, zebra-striped data tables.
* **🎨 Modern UI/UX:** Built with Tailwind CSS, featuring a responsive layout, dynamic dark/light mode toggling, and a live synchronized clock.

---

## 🛠️ Tech Stack

**Frontend Architecture:**
* **Framework:** [Next.js](https://nextjs.org/) (App Router)
* **Library:** [React 18](https://react.dev/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Icons:** [Lucide React](https://lucide.dev/)

**Backend & Deployment:**
* **Platform:** [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)
* **CI/CD:** Automated GitHub Continuous Integration (Push-to-Deploy)
* **Environment:** Built using Firebase Studio / Google Project IDX

**Data & Utilities:**
* **PDF Generation:** `jsPDF` and `jspdf-autotable`
* **Date Parsing:** `date-fns` for robust timezone and duration formatting

---

## 🚀 Getting Started (Local Development)

To run this project locally on your machine, follow these steps:

**1. Clone the repository:**
```bash
git clone [https://github.com/ramdcrz/NEULibraryAccessSystem.git](https://github.com/ramdcrz/NEULibraryAccessSystem.git)
```

**2. Navigate to the project directory:**
```bash
cd NEULibraryAccessSystem
```

**3. Install dependencies:**
```bash
npm install
```

**4. Run the development server:**
```bash
npm run dev
```

**5. View the application:**
```bash
Open http://localhost:3000 in your browser to see the live local build.
```

## 🌍 Production Deployment

This application is continuously deployed via **Firebase App Hosting**.

Because CI/CD is fully configured, any code pushed to the main branch on GitHub will automatically trigger a secure server build and seamlessly update the live URL with zero downtime.

## 👨‍💻 Author

**Ramil Deocariza Jr.**.
* **Institution**: College of Informatics and Computing Studies, New Era University
* **Email**: ramildeocariza009@gmail.com
