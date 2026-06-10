# Project Calendar & Evaluation System - Servants Preparation (إعداد خدام كنائس وسط القاهرة)
## Comprehensive Technical & Architectural Master Documentation

This master document provides a comprehensive description of the system architecture, database design, permission matrices, user workflows, security configurations, and key technical solutions implemented for the **Project Calendar & Evaluation System** of the Servants Preparation family in the Downtown Cairo Churches Diocese.

---

## Table of Contents
1. [Project Vision & Domain Model](#1-project-vision--domain-model)
2. [High-Level Architecture & Tech Stack](#2-high-level-architecture--tech-stack)
3. [Database Design & Schema (Cloud Firestore)](#3-database-design--schema-cloud-firestore)
4. [Security Rules Architecture (`firestore.rules`)](#4-security-rules-architecture-firestorerules)
5. [Role-Based Access Control (RBAC) Matrix](#5-role-based-access-control-rbac-matrix)
6. [State Management & Context Providers](#6-state-management--context-providers)
7. [Detailed Component Breakdown](#7-detailed-component-breakdown)
8. [Critical Engineering Solutions & Bugs Fixed](#8-critical-engineering-solutions--bugs-fixed)
9. [Deployment, Setup, & Operations Guide](#9-deployment-setup--operations-guide)

---

## 1. Project Vision & Domain Model

The system is designed to digitalize, schedule, and grade the graduation projects presented by servant candidates across multiple churches in the Downtown Cairo Diocese. The system resolves key organizational challenges:
- **Scheduling Conflicts**: Prevents double-booking of time slots using transactional assertions in Firestore.
- **Participation Thresholds (Day-Locking)**: Automatically computes the maximum scheduling days allocated to each church based on their team/group counts. If a church has more than 3 teams, they can book up to 2 days; otherwise, they are limited to 1 day.
- **Continuous Evaluation**: Enables academic evaluators (`servant` role) to grade projects in real-time using predefined evaluation rubrics.
- **Instant Ranking (Leaderboard)**: Calculates and ranks project grades instantly for administrative oversight.

---

## 2. High-Level Architecture & Tech Stack

The application is built on a serverless, real-time client-heavy architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Next.js 16 Client App                         │
│                                                                        │
│ ┌─────────────────────────┐ ┌───────────────────┐ ┌──────────────────┐ │
│ │  Zustand Global Store   │ │   Auth Context    │ │ Bookings Context │ │
│ └───────────┬─────────────┘ └─────────┬─────────┘ └────────┬─────────┘ │
│             │                         │                    │           │
└─────────────┼─────────────────────────┼────────────────────┼───────────┘
              │                         │                    │
              ▼                         ▼                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Firebase Client SDK v10                         │
└─────────────────────────────────────┬──────────────────────────────────┘
                                      │
                     ──────────────────────────────────
                    /     Secure Real-Time Channels    \
                    ──────────────────────┬───────────
                                          │
                                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           Cloud Firestore                              │
│  [Rules Engine] ──► [allowed_users] ──► [bookings] ──► [evaluations]   │
└────────────────────────────────────────────────────────────────────────┘
```

### Stack Components:
- **Framework:** **Next.js 16.0.10 (App Router)** leveraging Turbopack for ultra-fast compilation.
- **Styling:** Vanilla CSS with modern flex/grid utility parameters, fully responsive, optimizing Right-to-Left (RTL) alignments.
- **State Management:** **Zustand** for transient UI state (e.g. modals opening/closing, active calendar selections) to prevent React re-render cascades.
- **Real-time Engine:** **Firebase Client SDK v10** with Cloud Firestore using `onSnapshot` subscriptions.
- **Data Exports / Imports:** **ExcelJS** for spreadsheet generation and parsing.
- **Date Utilities:** `date-fns` with `date-fns/locale/ar` for localized calendar operations.

---

## 3. Database Design & Schema (Cloud Firestore)

Firestore stores structured data across collections, naming document IDs deterministic where possible to prevent record duplication.

### 1. `allowed_users` Collection
Stores whitelisted users and their profiles. The document ID is the user's lowercased email address.

```json
// Doc ID: "tonysaleeb23@gmail.com"
{
  "email": "tonysaleeb23@gmail.com",
  "name": "Tony Saleeb",
  "role": "admin", // "admin" | "servant" | "church_leader" | "user" (Team Leader)
  "created_at": "2026-06-10T12:00:00.000Z",
  "churchName": "كنيسة مارجرجس", // Only present if role is "church_leader"
  "teamDetails": { // Only present if role is "user" (Team Leader)
    "churchName": "كنيسة مارجرجس",
    "teamName": "فريق الأنبا أنطونيوس",
    "title": "نظام جدول المشاريع",
    "ageGroup": "إعدادي",
    "teamMembers": [
      { "name": "مينا عادل", "id": "1001" },
      { "name": "يوسف مينا", "id": "1002" }
    ]
  }
}
```

### 2. `bookings` Collection
Stores scheduled project presentation slots. Document ID is structured as `${date}_${startTime}` to guarantee time-slot uniqueness.

```json
// Doc ID: "2026-07-01_18-00-19-30"
{
  "title": "نظام جدول المشاريع",
  "requesterName": "مينا عادل",
  "requesterEmail": "mena.adel@gmail.com",
  "serviceId": "church-adaptation",
  "roomId": "church-adaptation",
  "date": "2026-07-01", // YYYY-MM-DD
  "startTime": "6:00 PM",
  "endTime": "7:30 PM",
  "churchName": "كنيسة مارجرجس",
  "teamName": "فريق الأنبا أنطونيوس",
  "ageGroup": "إعدادي",
  "teamMembers": [
    { "name": "مينا عادل", "id": "1001" },
    { "name": "يوسف مينا", "id": "1002" }
  ],
  "status": "approved", // "approved" | "pending" | "cancelled"
  "createdAt": "2026-06-10T12:05:00.000Z",
  "cancelledAt": null,
  "cancelledBy": null
}
```

### 3. `evaluations` Collection
Stores grades given by servant evaluators. The document ID is `${bookingId}_${servantEmail}` to prevent multiple evaluations from the same evaluator.

```json
// Doc ID: "2026-07-01_18-00-19-30_evaluator@gmail.com"
{
  "bookingId": "2026-07-01_18-00-19-30",
  "servantEmail": "evaluator@gmail.com",
  "servantName": "أ. سامح منير",
  "grades": {
    "presentation": 8, // Out of 10
    "technical": 9,
    "teamwork": 10
  },
  "comments": "عمل متميز وتنظيم رائع لأعضاء الفريق.",
  "createdAt": "2026-06-10T20:30:00.000Z"
}
```

### 4. `settings` Collection
Global system config variables.
- **Doc ID:** `global`
- **Fields:**
  - `allowUserCancellation` (boolean): Controls whether church leaders can delete their bookings.
  - `bookingRange` (map): `{ startMonth: 6, endMonth: 7, allowedDays: [0, 2, 4] }`
  - `timePeriods` (array of maps): Define active periods (`الفتيرة الأولى`, etc.) and start/end bounds.

---

## 4. Security Rules Architecture (`firestore.rules`)

The security rules verify user authentication state, role classifications, and scope write operations.

### Helper Functions:
1. `isSignedIn()`: Returns true if the request contains valid Firebase Authentication metadata.
2. `currentUserEmail()`: Extract token email and transform to lower-case for document path matching.
3. `userExists()`: Checks if the user has an entry inside the `allowed_users` list.
4. `getUserData()`: Read the user profile values directly from `allowed_users`.
5. `isAdmin()`: Assert user role value is `"admin"` or matches the master developer email (`tonysaleeb23@gmail.com`).
6. `isChurchLeader()`: Assert user role is `"church_leader"`.
7. `isChurchLeaderFor(church)`: Checks if the logged-in user is a church leader and their assigned church matches the query argument.

### Rules Mapping:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Auth Helpers
    function isSignedIn() { return request.auth != null; }
    function currentUserEmail() { return request.auth.token.email.lower(); }
    function userExists() { return exists(/databases/$(database)/documents/allowed_users/$(currentUserEmail())); }
    function getUserData() { return get(/databases/$(database)/documents/allowed_users/$(currentUserEmail())).data; }
    function isHardcodedAdmin() { return isSignedIn() && currentUserEmail() == 'tonysaleeb23@gmail.com'; }
    function isAdmin() { return isSignedIn() && (isHardcodedAdmin() || (userExists() && getUserData().role == 'admin')); }
    function isServant() { return isSignedIn() && userExists() && getUserData().role == 'servant'; }
    function isChurchLeader() { return isSignedIn() && userExists() && getUserData().role == 'church_leader'; }
    function isChurchLeaderFor(church) { return isChurchLeader() && getUserData().churchName == church; }

    // 1. Allowed Users:
    match /allowed_users/{email} {
      allow read: if isSignedIn(); // Crucial: break isAdmin recursion for public reads
      allow create, delete: if isAdmin();
      allow update: if isAdmin() || (
        isSignedIn() && currentUserEmail() == email.lower() &&
        request.resource.data.role == resource.data.role &&
        request.resource.data.email == resource.data.email
      );
    }

    // 2. Bookings:
    match /bookings/{bookingId} {
      allow read: if isSignedIn();
      allow create: if isAdmin() || (
        isChurchLeader() && 
        request.resource.data.churchName == getUserData().churchName
      );
      allow update, delete: if isAdmin() || (
        isSignedIn() && 
        isChurchLeaderFor(resource.data.churchName)
      );
    }

    // 3. Settings:
    match /settings/{settingId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // 4. Evaluations:
    match /evaluations/{evaluationId} {
      allow read: if isAdmin() || isServant();
      allow create, update: if isServant() && 
                            request.resource.data.servantEmail == currentUserEmail() &&
                            evaluationId == request.resource.data.bookingId + '_' + currentUserEmail();
      allow write: if isAdmin();
    }
  }
}
```

---

## 5. Role-Based Access Control (RBAC) Matrix

Different roles have access to specific parts of the project:

### 1. Admin (`admin`)
- Complete write, read, and delete permissions across all Firestore collections.
- Access to the administrative dashboard (`AdminDashboard.tsx`) containing user lists, raw bookings, evaluation lists, settings configuration, excel bulk import, and leaderboard results.
- Able to book and delete any slot for any church/team.

### 2. Servant / Evaluator (`servant`)
- Read-only calendar access.
- Access to the grading panel (`ServantPortal.tsx`) to enter project marks. Can write evaluation records for projects on the current schedule.
- Access to view team details on the calendar.

### 3. Church Leader (`church_leader`)
- Can book slots for their church.
- **Dropdown Lock**: The booking church selector is locked to their assigned `churchName` (pre-filled and disabled).
- **Deletion Option**: Can soft-delete (`status = 'cancelled'`) bookings that match their own `churchName` from the details popup modal (if `allowUserCancellation` is active in settings).
- Bypasses the team details input page (`SetupTeamPage.tsx`) entirely on login.

### 4. Team Leader / User (`user`)
- Auto-redirected to the team details entry wizard (`SetupTeamPage.tsx`) on initial login.
- Once details are saved, they have read-only access to view the calendar.
- The `+ حجز` (Add Booking) action button is hidden.
- The calendar view automatically centers and focuses on their specific booking date on startup.
- Cannot delete or modify any bookings.

---

## 6. State Management & Context Providers

### 1. `useSchedulerStore` (Zustand Store)
Manages transient client UI states:
- `isBookingModalOpen` / `isEventModalOpen` (booleans).
- `selectedDate` / `selectedStartTime` / `selectedEndTime` (strings).
- `currentMonth` (Date object): Triggers schedule updates.
- `selectedEvent` (Booking object): Currently displayed booking.
- `isEditingTeamDetails` (boolean): True if a team leader is modifying their details.

### 2. `AuthContext.tsx`
Handles auth state via Firebase Authentication:
- Monitors changes using `onAuthStateChanged` and subscribes to the user's `allowed_users` Firestore document with `onSnapshot` to support real-time role changes.
- Automatically provisions standard Firestore allowed documents for hardcoded admin fallback emails to prevent permission setup errors.

### 3. `BookingsContext.tsx`
Handles calendar slot queries:
- Establishes a real-time `onSnapshot` query on the `bookings` collection.
- Filters out soft-deleted bookings (`status === 'cancelled'`) from schedule view rendering but keeps them in memory for administrative archive retrieval.
- Wraps writing procedures inside `runTransaction` to enforce time slot exclusivity.

### 4. `SettingsContext.tsx`
Exposes system ranges and parameters:
- Real-time `onSnapshot` connection on `settings/global`.
- Shares values like time periods, valid calendar dates, and user deletion flags.

---

## 7. Detailed Component Breakdown

### `SignInPage.tsx`
Provides the login interface:
- **Clean Interface**: Renders only the Google Sign-in button, removing any sign-up or request buttons.
- Designed with premium aesthetics, CSS radial background gradients, animated logo orbits, and Cairo font typography adjustments.
- Displays friendly Arabic warning messages when authentication fails or if a user is not whitelisted.

### `SetupTeamPage.tsx`
A step-by-step wizard for new Team Leaders:
- Renders form fields to enter project details (Title, Team Name, Age Group) and members.
- Dynamically validates inputs (checking participant counts and ID bounds).
- Writes team details directly into the user's `allowed_users` document, moving them to the calendar on completion.

### `WeeklySchedule.tsx`
The primary grid system rendering the scheduled projects:
- **Mobile Viewport**: Compact vertical card listing the three time slots for the chosen day.
- **Desktop Viewport**: Horizontal time periods table layout with church color-coded gradients.
- **Dynamic Lock Indicator**: Renders lock icons on dates that are locked for the church leader.
- **Startup Auto-focus**: Queries the user's booking details on load and updates `currentMonth` to bring the user's scheduled presentation day into focus.

### `BookingModal.tsx`
The modal to create a booking:
- **Locked Church Button**: For church leaders, the church field is styled as a locked container (pre-filled and disabled), preventing them from choosing a different church and encountering security rule errors.
- **Autofill Dropdown**: For admins, it shows a searchable list of whitelisted allowed users. Selecting a user automatically populates their team's church, project title, and members, allowing admins to book a slot in seconds. Includes a caching layer (3 minutes) to optimize Firestore read costs.

### `EventModal.tsx`
Renders presentation slot details:
- Centered landscape modal layout (`sm:max-w-2xl`) to provide enough horizontal space for detail fields, preventing text clipping.
- Shows project details (Leader Name, Team Name, Age Group) in a 3-column grid.
- Lists team members in a full-width vertical container to prevent name truncation.
- Displays action buttons (Approve / Delete) dynamically based on the active role's permissions.

### `AdminDashboard.tsx`
The control panel for system administrators:
- **Segmented Tabs Control**: High-end sliding capsule design to switch between tabs (Users, Bookings, Evaluations, Settings, Archive, Requests, Leaderboard).
- **Users and Requests Panel**: Allows admins to add users, change roles, approve/reject access requests, and delete profiles.
- **Excel Bulk Import**: Includes a file selector that reads excel files (`.xlsx`) using `exceljs`, parses emails/names, and writes them to Firestore in batches of 500.
- **Leaderboard Tab**: Compiles all evaluations, calculates average grades, and displays ranked teams with trophies for the top-3.

---

## 8. Critical Engineering Solutions & Bugs Fixed

### 1. Resolution of `allowed_users` Read Recursion (Endless Loading)
- **Problem**: When a user logged in, `AuthContext` subscribed to the user's `allowed_users/{email}` document. The security rules for reading `allowed_users` were:
  ```javascript
  allow read: if isAdmin();
  ```
  But `isAdmin()` was defined as:
  ```javascript
  function isAdmin() {
    return isSignedIn() && (isHardcodedAdmin() || (userExists() && getUserData().role == 'admin'));
  }
  ```
  This created a recursive dependency loop: to read a user's document, the database checked if the user was an admin, which required reading the user's document first. This check failed, throwing a permission error and causing the screen to get stuck loading.
- **Solution**: The read rule for `allowed_users` was updated to allow any signed-in user to read the collection:
  ```javascript
  allow read: if isSignedIn();
  ```
  This resolved the recursion and fixed the endless loading screen for all user roles.

### 2. Cairo Arabic Font Text-Clipping Fix
- **Problem**: The Arabic Cairo font features tall ascenders and deep descenders. Standard Tailwind classes like `leading-none` or `leading-tight` combined with `truncate` (`overflow: hidden`) clipped the bottom curves of characters like `ر`, `و`, `ى`.
- **Solution**: Adjusted line-heights and paddings. Replaced `leading-tight` with `leading-normal` and added small bottom paddings (`pb-1` or `pb-0.5`) on crucial elements across `EventModal.tsx`, `BookingModal.tsx`, and `WeeklySchedule.tsx`.

### 3. RTL Alphanumeric Time Reordering Fix
- **Problem**: Mixing Arabic text with numbers, colons, and English `AM/PM` tags caused browsers to render time slots backwards (e.g. `PM - 7:30 PM 6:00`).
- **Solution**: Wrapped time displays inside custom `dir="ltr"` container tags with appropriate text alignments across all schedule cards and widgets.

### 4. Team Members List Squeezing & Name Truncation
- **Problem**: Splitting the team members list into two columns inside `EventModal.tsx` squeezed the content width, causing names like `مينا عادل` to be truncated.
- **Solution**: Converted the list into a single-column vertical stack, expanding the name area and allowing Arabic names to render in full. Added `overflow-x-hidden` and transitioned hover effects without using `scale` properties to prevent scrollbars from appearing in RTL.

### 5. Church Leader Day-Locking & Caching
- **Problem**: The day-locking logic checks if a church leader has reached their maximum allowed days. This logic ran on every render, causing React component updates to trigger repeatedly.
- **Solution**: Wrapped the calculation of `churchBookedDays` and `churchGroupCount` in `useMemo` hooks, keeping the array references stable and preventing unnecessary updates to the locking callbacks.

---

## 9. Deployment, Setup, & Operations Guide

### 1. Prerequisites:
- Node.js (v18 or higher) installed.
- A Firebase project configured.

### 2. Project Installation:
Clone the project and run the following command in the workspace directory to install dependencies:
```bash
npm install
```

### 3. Local Development Environment:
Create a `.env.local` file in the root directory and add the following parameters:
```env
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-auth-domain.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-storage-bucket.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
NEXT_PUBLIC_ADMIN_EMAILS="developer@gmail.com,admin@gmail.com"
```
Run the local Next.js development server:
```bash
npm run dev
```

### 4. Firestore Security Rules Deployment:
Deploy the updated security rules to your Firebase console:
```bash
firebase deploy --only firestore:rules
```

### 5. Building for Production:
Compile the application:
```bash
npm run build
```
This generates an optimized production build, checking types and verifying compatibility.
