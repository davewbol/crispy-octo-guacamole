# Daily Planner — Firebase Setup Guide

The app works fully offline with localStorage. To enable cloud sync across devices, follow these steps to set up Firebase.

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project**
3. Name it (e.g., "daily-planner") and follow the prompts
4. Analytics is optional — you can disable it

## 2. Add a Web App

1. In your project, click the **gear icon** > **Project settings**
2. Scroll to **Your apps** and click the **Web** icon (`</>`)
3. Register the app with a nickname (e.g., "planner-web")
4. Copy the `firebaseConfig` object from the code snippet

## 3. Update `firebase-config.js`

Open `firebase-config.js` and replace the placeholder values with your actual config:

```js
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};
```

## 4. Enable Google Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Click **Google** and toggle **Enable**
3. Set a project support email and click **Save**

## 5. Create Firestore Database

1. Go to **Firestore Database** > **Create database**
2. Choose **Start in production mode**
3. Select a region close to you
4. After creation, go to **Rules** tab and paste the contents of `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /planners/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /planners/{userId}/days/{dayId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

5. Click **Publish**

## 6. Authorize Your Domain

If you're hosting the app on a custom domain (not just opening `index.html` locally):

1. Go to **Authentication** > **Settings** > **Authorized domains**
2. Add your domain

For local development, `localhost` is already authorized by default.

## 7. Done!

Open `index.html` in your browser. Click **Sign in with Google** in the top bar. Your data will sync to Firestore and be available on any device where you sign in with the same Google account.

### How Sync Works

- **Offline-first**: localStorage is always the primary data store. The app works without internet.
- **On sign-in**: Cloud data is merged with local data (union of tasks, cloud wins for conflicts).
- **On changes**: Data syncs to Firestore within 1 second of any change (debounced).
- **Sync indicator**: The colored dot in the top bar shows sync status:
  - Gray = offline / not signed in
  - Yellow (pulsing) = syncing
  - Green = synced
  - Red = sync error (data is still saved locally)
