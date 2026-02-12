// Authentication Service
// Import Firebase functions directly
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
  updateDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.recaptchaVerifier = null;
    this.auth = null;
    this.db = null;
    this.init();
  }

  async init() {
    await this.waitForFirebase();

    this.auth = window.firebaseAuth?.auth;
    this.db = window.firebaseAuth?.db;

    if (!this.auth) {
      console.error('Firebase auth not available');
      return;
    }

    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      if (user) {
        console.log('User signed in:', user.uid);
        this.updateUserLastLogin(user.uid);
      } else {
        console.log('User signed out');
      }
    });
  }

  waitForFirebase() {
    return new Promise((resolve) => {
      const checkFirebase = () => {
        if (window.firebaseAuth && window.firebaseAuth.auth && window.firebaseAuth.db) {
          this.auth = window.firebaseAuth.auth;
          this.db = window.firebaseAuth.db;
          resolve();
        } else {
          setTimeout(checkFirebase, 100);
        }
      };
      checkFirebase();
    });
  }

  // Email PIN Authentication
  async requestEmailPin(email, name) {
    try {
      console.log('Making PIN request for:', email);
      const response = await fetch('https://wildlife-tracker-gxz5.vercel.app/api/auth/request-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = await response.json().catch(() => ({ message: errorText }));
        throw new Error(error.message || 'Failed to send PIN');
      }

      const result = await response.json();
      console.log('PIN request success:', result);
      return { success: true, message: 'PIN sent to your email' };
    } catch (error) {
      console.error('Email PIN request failed:', error);
      throw new Error(`Failed to send PIN: ${error.message}`);
    }
  }

  async verifyEmailPin(email, pin) {
    try {
      const response = await fetch('https://wildlife-tracker-gxz5.vercel.app/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin })
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = await response.json().catch(() => ({ message: errorText }));
        throw new Error(error.message || 'Invalid PIN');
      }

      const data = await response.json();
      console.log('PIN verification success, received custom token:', !!data.customToken);

      const result = await signInWithCustomToken(this.auth, data.customToken);
      console.log('Firebase sign in successful for user:', result.user.uid);

      try {
        await this.createOrUpdateUser(result.user, { email, name: data.name });
        console.log('User document created/updated successfully');
      } catch (error) {
        console.error('❌ CRITICAL: Failed to create user document:', error);
      }

      localStorage.setItem('userAuthenticated', 'true');
      localStorage.setItem('authenticatedUserName', data.name);

      console.log('PIN verification complete - auth state listener will handle the rest');
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Email PIN verification failed:', error);
      throw error;
    }
  }

  // Phone Authentication
  async requestPhoneOtp(phoneNumber, name) {
    try {
      console.log('Requesting phone OTP for:', phoneNumber);

      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phoneNumber)) {
        throw new Error('Please enter a valid phone number with country code (e.g., +1234567890)');
      }

      if (!this.recaptchaVerifier) {
        console.log('Setting up reCAPTCHA verifier...');
        const container = document.getElementById('recaptcha-container');
        if (container) container.innerHTML = '';

        this.recaptchaVerifier = new RecaptchaVerifier(this.auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => console.log('reCAPTCHA solved successfully'),
          'expired-callback': () => { this.recaptchaVerifier = null; },
          'error-callback': (error) => console.error('reCAPTCHA error:', error)
        });
      }

      this.confirmationResult = await signInWithPhoneNumber(this.auth, phoneNumber, this.recaptchaVerifier);
      sessionStorage.setItem('pendingPhoneUser', JSON.stringify({ name, phone: phoneNumber }));

      console.log('Phone verification sent successfully');
      return { success: true, message: 'SMS code sent to your phone' };
    } catch (error) {
      console.error('Phone OTP request failed:', error);
      if (this.recaptchaVerifier) { this.recaptchaVerifier.clear(); this.recaptchaVerifier = null; }
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  async verifyPhoneOtp(otp) {
    try {
      if (!this.confirmationResult) throw new Error('No OTP request found. Please request OTP first.');
      const result = await this.confirmationResult.confirm(otp);

      const pendingUserData = JSON.parse(sessionStorage.getItem('pendingPhoneUser'));
      if (pendingUserData) {
        await this.createOrUpdateUser(result.user, pendingUserData);
        sessionStorage.removeItem('pendingPhoneUser');

        localStorage.setItem('userAuthenticated', 'true');
        localStorage.setItem('authenticatedUserName', pendingUserData.name);
      }

      return { success: true, user: result.user };
    } catch (error) {
      console.error('Phone OTP verification failed:', error);
      throw new Error(`Invalid OTP: ${error.message}`);
    }
  }

  // Fixed createOrUpdateUser method
  async createOrUpdateUser(user, userData) {
    console.log('🔥 STARTING createOrUpdateUser method');
    console.log('🔥 User object:', { uid: user.uid, email: user.email, phone: user.phoneNumber });
    console.log('🔥 UserData:', userData);

    if (!this.db) throw new Error('Firestore instance not available');
    if (!this.auth?.currentUser) throw new Error('User not authenticated');

    const userDoc = {
      uid: user.uid,
      name: userData.name,
      email: userData.email || null,
      phone: userData.phone || null,
      role: 'user',
      status: 'active',
      registeredAt: userData.registeredAt || serverTimestamp(),
      lastLogin: serverTimestamp()
    };

    console.log('🔥 User document data to write:', userDoc);

    try {
      const docRef = doc(this.db, 'users', user.uid);
      console.log('🔥 Document reference path:', docRef.path);

      await setDoc(docRef, userDoc, { merge: true });
      console.log('✅ setDoc completed successfully');

      // Optional connectivity check using readable collection
      try {
        const healthDocRef = doc(this.db, 'health', 'connectivity_test');
        await getDoc(healthDocRef);
        console.log('✅ Firestore health collection accessible');
      } catch (err) {
        console.warn('⚠️ Health collection not accessible:', err.message);
      }

      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        console.log('✅ Document verification successful!');
      } else {
        console.error('❌ Document verification failed');
      }

    } catch (error) {
      console.error('❌ CRITICAL ERROR in createOrUpdateUser:', error);
      throw error;
    }

    console.log('🔥 createOrUpdateUser method completed');
  }

  async updateUserLastLogin(uid) {
    try {
      await updateDoc(doc(this.db, 'users', uid), { lastLogin: serverTimestamp() });
    } catch (error) {
      console.error('Failed to update last login:', error);
    }
  }

  async checkUserStatus() {
    if (!this.currentUser) return null;

    try {
      const userDoc = await getDoc(doc(this.db, 'users', this.currentUser.uid));
      if (userDoc.exists()) return userDoc.data();
      return null;
    } catch (error) {
      console.error('Failed to check user status:', error);
      return null;
    }
  }

  async canSubmitData() {
    const userStatus = await this.checkUserStatus();
    if (!userStatus) return true;
    return userStatus.status === 'active' || userStatus.status === undefined;
  }

  async signOut() {
    await signOut(this.auth);
    this.currentUser = null;
    localStorage.removeItem('userAuthenticated');
    localStorage.removeItem('authenticatedUserName');
  }

  isAuthenticated() {
    return !!this.currentUser;
  }
}

window.authService = new AuthService();
