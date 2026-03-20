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

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAVR2y3mNdJ8zSNxf_WPmKGmYQuoVuyYVc",
  authDomain: "daily-planner-17bef.firebaseapp.com",
  projectId: "daily-planner-17bef",
  storageBucket: "daily-planner-17bef.firebasestorage.app",
  messagingSenderId: "484037431581",
  appId: "1:484037431581:web:ef2ac415ccc5ec4d7611f4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
