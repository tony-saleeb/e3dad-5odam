# ⛪ إعداد 5odam (Project Calendar & Evaluation System)

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel)](https://e3dad-5odam.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.0.10-000000?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Firebase](https://img.shields.io/badge/Firebase-10.12.0-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-4CAF50?style=for-the-badge)](LICENSE)

A premium, highly secure, real-time Church Facility Scheduling and Project Evaluation web application. Designed for the **Servants Preparation Family (إعداد خدام كنائس وسط القاهرة)** in the Downtown Cairo Churches Diocese, the system provides automated scheduling, dynamic capacity limits, and multi-rubric academic grading.

---

## 📸 Interface Showcase

GitHub will automatically display the corresponding preview depending on your theme:

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/dark-preview.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/screenshots/light-preview.png">
  <img alt="App Preview Dashboard" src="docs/screenshots/light-preview.png" width="100%">
</picture>

*Note: Create a `docs/screenshots/` folder in your repository and save your screenshots as `light-preview.png` and `dark-preview.png` to display them here.*

---

## ✨ Core Capabilities

### 🗓️ Smart Calendar Scheduling
* **RTL-Optimized Weekly Overview**: Interactive, fluid grid displaying presentation slots with Cairo Arabic typography.
* **Deterministic Double-Booking Protection**: Powered by Firestore transactions (`runTransaction`), preventing two users from securing the same slot simultaneously.
* **Time Ordering Safety**: Clamped LTR date-time badges preventing RTL rendering engines from misordering hours (`6:00 PM - 7:30 PM`).

### 🔒 Scoped Capacity & Lock Logic
* **Adaptive Church Capacities**: Calculates day-locking limits dynamically based on group counts (e.g., churches with $\le 3$ teams get 1 scheduling day, and churches with $> 3$ teams can book across 2 days).
* **Locked Field Pre-Fills**: Prevents users from manually altering database entries or triggering permission warnings by restricting fields to authorized values.

### 📝 Multi-Rubric Evaluations
* **Interactive Servant Grading Panel**: Sliders coupled with numerical input selectors and text review fields.
* **Independent Scores Breakdown**: Allows multiple evaluators to grade the same team independently (Document ID: `${bookingId}_${servantEmail}`).
* **Locked Completed Evaluations**: Instantly hides grading options once a servant submits scores to ensure grade integrity.

### 📊 Admin Dashboard & Gamified Leaderboard
* **Excel Bulk Import**: Upload spreadsheet files (`.xlsx`) to whitelist team leaders directly in batches of 500.
* **Excel Score Exporter**: Pulls aggregated sheets showing individual criteria averages or complete evaluation logs.
* **Live Leaderboard**: Displays top church averages dynamically sorted by score criteria.

---

## 🛠️ Security & Architecture

### 1. Firebase App Check + reCAPTCHA v3
Protects your Cloud Firestore database from spam and automated abuse. Uses Google reCAPTCHA v3 invisibly in the browser:
* **Production**: Validates every write query using recaptcha tokens.
* **Development**: Automatically uses localized debug bypasses on `localhost`.

### 2. PWA (Progressive Web App)
Installable on Android, iOS, and desktop browsers with custom offline caching:
* Custom splash icons, theme bindings, and a background service worker (`sw.js`).

### 3. Recursion-Free security rules (`firestore.rules`)
Strict role-based write limits mapped cleanly to prevent database read loops.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18.0.0 or higher)
* **Firebase Project** (Firestore and Authentication activated)

### 1. Local Setup
Clone the repository and install dependencies:
```bash
git clone https://github.com/tony-saleeb/e3dad-5odam.git
cd e3dad-5odam
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
NEXT_PUBLIC_ADMIN_EMAILS="admin@example.com,tonysaleeb23@gmail.com"
NEXT_PUBLIC_RECAPTCHA_SITE_KEY="your-recaptcha-v3-site-key"
```

### 3. Deploy Security Rules
Publish rules to your Firebase console:
```bash
firebase deploy --only firestore:rules
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Testing

The repository maintains **100% automated test coverage** via Vitest and React Testing Library:
```bash
# Run tests once
npm run test -- --run

# Run tests in watch mode
npm run test
```

---

## 📜 License
Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.
