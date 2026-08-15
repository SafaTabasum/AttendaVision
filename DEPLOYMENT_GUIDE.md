# AttendaVision — Final Firebase + Vercel Setup

This project is designed to use **Firebase for Auth, Firestore and Storage** and **Vercel for the Next.js web app**.

## 1. Firebase Authentication

Firebase Console → Authentication → Sign-in method:

- Enable **Email/Password**.
- Create the real accounts for your students, teachers and Dean.
- Each account must have a matching `/users/{uid}` document with:
  - `id`: Firebase UID
  - `name`: real name
  - `email`: real college email
  - `role`: `student`, `teacher`, or `dean`

The login page does **not** ask the user to choose Student/Teacher/Dean.

For the current UI's role checks, keep the existing role email conventions used by the project (`@dean.com`, `@teacher.com`, `@faculty.com`) until all role checks are migrated to custom claims.

### Forgot Password

The login page uses Firebase's real `sendPasswordResetEmail()` flow. Firebase sends the secure reset email. It is not a fake verification-code system.

Firebase Console → Authentication → Settings → Authorized domains:

- `localhost`
- your Vercel domain, e.g. `your-app.vercel.app`
- your custom domain, if you use one

## 2. Firestore

Create/enable the default Firestore database.

Deploy:

- `firestore.rules`
- `firestore.indexes.json`

The rules include:

- One teacher attendance submission lock per class/date/period
- Student QR attendance ownership
- Dean-only official notices
- Dean-only campus-event publishing
- Student attendance notifications
- Security-attempt records visible to the Dean

### Required collections

The app creates these automatically as they are used:

- `users`
- `attendance`
- `attendanceSubmissions`
- `activeSessions`
- `notifications`
- `campusEvents`
- `securityAlerts`
- `resources`
- `grievances`

Do not seed fake attendance, notices, events, or fee records.

## 3. Firebase Storage

Firebase Console → Storage → Get started.

Deploy `storage.rules`.

Teacher resource uploads are stored in Firebase Storage and students download the real uploaded file.

## 4. Vercel

Import the project into Vercel.

Recommended environment variables (optional because the project also has `firebase-applet-config.json` fallback):

```text
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

These are Firebase web configuration values; they are not server secrets.

After adding them, redeploy the Vercel project.

## 5. Vercel IP / anti-proxy attendance

No third-party IP API key is required.

The project includes:

`/api/client-network`

Vercel/Next.js reads the request's forwarded client IP and returns it to the signed-in app.

**Important:** IP is only an additional security/audit signal. It is NOT treated as proof of identity because multiple students can legitimately share one public IP through college Wi-Fi or a hotspot.

The stronger attendance checks are:

1. Firebase authenticated student account
2. Trusted device/session
3. Dynamic teacher QR/session
4. Existing geolocation/geofence check
5. One attendance record per student per period
6. IP/network change as an additional audit signal
7. Teacher manual attendance fallback

If a trusted account is used from an unrecognized device:

- attendance is rejected
- a `securityAlerts` record is created
- the Dean can review it in **Security & Audit Log**

If only the IP changes while the trusted device remains the same, the attendance is allowed and the IP change is logged. This avoids breaking legitimate mobile-network/hotspot use.

## 6. Deploying with Firebase CLI

From the project folder:

```bash
firebase login
firebase use YOUR_FIREBASE_PROJECT_ID
firebase deploy --only firestore:rules,firestore:indexes,storage
```

If you do not have Firebase CLI installed, install it separately before running the commands above.

## 7. Local development

```bash
npm install
npm run dev
```

Use:

`http://localhost:3000`

For camera/geolocation testing on a real phone, use an HTTPS deployment such as your Vercel URL. Browser camera/location permissions are restricted on insecure origins.

## 8. Before real college use

Replace all sample/placeholder user data with the real Firebase `users` collection.

Verify:

- 50 real II-A students have the correct roll-number emails/IDs.
- Teacher accounts have the correct roles.
- Dean account has the correct role.
- Classes and teacher assignments are real.
- Teacher QR location is configured correctly.
- The existing geofence is tested at the real classroom location.
- Teachers submit attendance once per class/date/period.
- QR-scanned students appear Present in the teacher's manual list.
- Unscanned students remain Absent until the teacher manually marks them Present.
- Dean's at-risk percentage comes only from real attendance records.
- No fake notices/events/resources/attendance are inserted.

## 9. Important security limitation

A website cannot mathematically prove that a person holding a phone is the real account owner. IP addresses also cannot uniquely identify a phone or person.

The system therefore uses multiple signals and rejects an unrecognized-device attendance attempt rather than pretending IP alone proves identity.


### Attendance OTP + device/session security
The teacher's active QR session displays a 4-digit Manual Entry Code. Students can enter this code at `/attend` if the QR camera is unavailable. Deploy the included Firestore rules so `attendanceSessionClaims` and `securityAlerts` work. The existing geolocation/geofence logic is preserved.
