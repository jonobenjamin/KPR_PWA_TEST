// auth-service.js - Secure AuthService with offline-safe user document creation
import {
  signInWithCustomToken,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class AuthService {
  constructor() {
    this.auth = null;
    this.db = null;
    this.currentUser = null;
    this.confirmationResult = null;
    this.recaptchaVerifier = null;

    // Load pending queue from localStorage
    this.pendingUserQueue = JSON.parse(localStorage.getItem('pendingUserQueue') || '[]');

    this.init();
  }

  async init() {
    await this.waitForFirebase();

    this.auth = window.firebaseAuth?.auth;
    this.db = window.firebaseAuth?.db;

    if (!this.auth || !this.db) {
      console.error('Firebase auth or db not available');
      return;
    }

    // Listen for auth state changes
    onAuthStateChanged(this.auth, async (user) => {
      this.currentUser = user;
      if (user) {
        console.log('User signed in:', user.uid);
        // Ensure user document exists
        await this.ensureUserDocument(user);
        // Process any queued pending users
        await this.processPendingQueue();
      } else {
        console.log('User signed out');
      }
    });
  }

  waitForFirebase() {
    return new Promise((resolve) => {
      const checkFirebase = () => {
        if (window.firebaseAuth && window.firebaseAuth.auth && window.firebaseAuth.db) {
          resolve();
        } else {
          setTimeout(checkFirebase, 100);
        }
      };
      checkFirebase();
    });
  }

  // --- EMAIL AUTHENTICATION ---
  async verifyEmailPin(email, pin, name) {
    try {
      const res = await fetch('https://wildlife-tracker-gxz5.vercel.app/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin })
      });

      if (!res.ok) throw new Error('Invalid PIN or server error');

      const data = await res.json();
      const result = await signInWithCustomToken(this.auth, data.customToken);

      // Ensure the user document exists
      await this.ensureUserDocument(result.user, { email, name });

      return result.user;
    } catch (error) {
      console.error('Email PIN verification failed:', error);
      throw error;
    }
  }

  // --- PHONE AUTHENTICATION ---
  async requestPhoneOtp(phoneNumber, name) {
    if (!this.recaptchaVerifier) {
      this.recaptchaVerifier = new RecaptchaVerifier(this.auth, 'recaptcha-container', {
        size: 'invisible'
      });
    }
    this.confirmationResult = await signInWithPhoneNumber(this.auth, phoneNumber, this.recaptchaVerifier);

    // Store pending info for after OTP verification
    sessionStorage.setItem('pendingPhoneUser', JSON.stringify({ phone: phoneNumber, name }));

    return { success: true };
  }

  async verifyPhoneOtp(otp) {
    if (!this.confirmationResult) throw new Error('No OTP requested');
    const result = await this.confirmationResult.confirm(otp);

    const pending = JSON.parse(sessionStorage.getItem('pendingPhoneUser'));
    await this.ensureUserDocument(result.user, pending);
    sessionStorage.removeItem('pendingPhoneUser');

    return result.user;
  }

  // --- ENSURE USER DOCUMENT EXISTS ---
  async ensureUserDocument(user, userData = {}) {
    if (!this.db) throw new Error('Firestore not available');

    const userRef = doc(this.db, 'users', user.uid);

    try {
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        // Create new user document
        const newUserDoc = {
          uid: user.uid,
          name: userData.name || 'Unknown',
          email: userData.email || null,
          phone: userData.phone || user.phoneNumber || null,
          role: 'user',
          status: 'active',
          registeredAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        };

        await setDoc(userRef, newUserDoc);
        console.log('✅ User document created:', user.uid);
      } else {
        // Update last login timestamp
        await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
      }
    } catch (error) {
      console.error('❌ Failed to create/update user document:', error);

      // Queue for retry (offline-safe)
      this.pendingUserQueue.push({ user, userData });
      localStorage.setItem('pendingUserQueue', JSON.stringify(this.pendingUserQueue));
    }
  }

  // --- PROCESS PENDING USERS ---
  async processPendingQueue() {
    if (!this.pendingUserQueue.length) return;

    const queueCopy = [...this.pendingUserQueue];
    this.pendingUserQueue = [];

    for (const entry of queueCopy) {
      try {
        await this.ensureUserDocument(entry.user, entry.userData);
        console.log('✅ Pending user document created:', entry.user.uid);
      } catch (err) {
        console.error('❌ Still failed for user:', entry.user.uid);
        this.pendingUserQueue.push(entry); // retry later
      }
    }

    // Persist updated queue
    localStorage.setItem('pendingUserQueue', JSON.stringify(this.pendingUserQueue));
  }

  // --- CHECK IF USER CAN SUBMIT DATA ---
  async canSubmitData() {
    if (!this.currentUser) return false;

    const userRef = doc(this.db, 'users', this.currentUser.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) return false;
    const data = docSnap.data();

    return data.status !== 'revoked';
  }

  // --- SIGN OUT ---
  async signOut() {
    await signOut(this.auth);
    this.currentUser = null;
  }

  isAuthenticated() {
    return !!this.currentUser;
  }
}

// Global instance
window.authService = new AuthService();
