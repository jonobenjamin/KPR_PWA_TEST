// Firebase configuration - REVERTED TO ORIGINAL PROJECT
const firebaseConfig = {
  apiKey: "AIzaSyCHpJdRUch5Na_6HgM6dxgWxfoKeciPo_s",
  authDomain: "wildlifetracker-4d28b.firebaseapp.com",
  projectId: "wildlifetracker-4d28b",
  storageBucket: "wildlifetracker-4d28b.firebasestorage.app",
  messagingSenderId: "209541121506",
  appId: "1:209541121506:web:7fe9890f91be06dc4ba5bb",
  measurementId: "G-4XLR7JTEEH"
};

// Initialize Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getAuth,
  signInWithCustomToken,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut,
  onAuthStateChanged,
  sendSignInLinkToEmail
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

console.log('Firebase config loaded - using original project: wildlifetracker-4d28b');

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, "wildlifetracker-db");

console.log('Firebase initialized:', { app, auth, db });

// Export for use in other modules
window.firebaseAuth = {
  auth,
  db,
  signInWithCustomToken,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
};

console.log('window.firebaseAuth set:', window.firebaseAuth);
