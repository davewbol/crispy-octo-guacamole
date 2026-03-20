/*
 * Firebase Configuration
 *
 * INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project (or use an existing one)
 * 3. In Project Settings > General, scroll to "Your apps" and click "Add app" > Web
 * 4. Copy the firebaseConfig object and paste it below, replacing the placeholder values
 * 5. Enable Authentication: Go to Authentication > Sign-in method > Enable "Google"
 * 6. Enable Firestore: Go to Firestore Database > Create database > Start in production mode
 * 7. Set Firestore rules (see firestore.rules file in this project)
 */

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
