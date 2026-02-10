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
    // Wait for Firebase to be ready
    await this.waitForFirebase();

    // Get Firebase instances from global
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name })
      });

      console.log('PIN request response status:', response.status);
      console.log('PIN request response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('PIN request error response:', errorText);
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
      console.log('Making PIN verification request for:', email, 'PIN length:', pin.length);
      const response = await fetch('https://wildlife-tracker-gxz5.vercel.app/api/auth/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, pin })
      });

      console.log('PIN verification response status:', response.status);
      console.log('PIN verification response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('PIN verification error response:', errorText);
        const error = await response.json().catch(() => ({ message: errorText }));
        throw new Error(error.message || 'Invalid PIN');
      }

      const data = await response.json();
      console.log('PIN verification success, received custom token:', !!data.customToken);

      // Sign in with custom token
      console.log('Signing in with custom token...');
      const result = await signInWithCustomToken(this.auth, data.customToken);
      console.log('Firebase sign in successful for user:', result.user.uid);

      // Create/update user document
      console.log('Creating/updating user document...');
      try {
        await this.createOrUpdateUser(result.user, { email, name: data.name });
        console.log('User document created/updated successfully');
      } catch (error) {
        console.error('❌ CRITICAL: Failed to create user document:', error);
        console.error('❌ Error details:', error.code, error.message);
        // Don't throw here - continue with authentication even if user doc fails
      }

      // Store authentication state for offline use
      console.log('DEBUG: Setting localStorage - userAuthenticated=true, authenticatedUserName=', data.name);
      localStorage.setItem('userAuthenticated', 'true');
      localStorage.setItem('authenticatedUserName', data.name);

      // Auth controller will automatically detect the sign-in via onAuthStateChanged listener
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

      // Validate phone number format
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phoneNumber)) {
        throw new Error('Please enter a valid phone number with country code (e.g., +1234567890)');
      }

      // Initialize reCAPTCHA if not already done
      if (!this.recaptchaVerifier) {
        console.log('Setting up reCAPTCHA verifier...');

        // Clear any existing reCAPTCHA
        const container = document.getElementById('recaptcha-container');
        if (container) {
          container.innerHTML = '';
        }

        try {
          this.recaptchaVerifier = new RecaptchaVerifier(this.auth, 'recaptcha-container', {
            size: 'invisible',
            callback: (response) => {
              console.log('reCAPTCHA solved successfully');
            },
            'expired-callback': () => {
              console.log('reCAPTCHA expired, will recreate on next attempt');
              this.recaptchaVerifier = null;
            },
            'error-callback': (error) => {
              console.error('reCAPTCHA error:', error);
            }
          });
          console.log('reCAPTCHA verifier created successfully');
        } catch (error) {
          console.error('Failed to create reCAPTCHA verifier:', error);
          throw new Error('Failed to initialize security verification. Please refresh the page and try again.');
        }
      }

      console.log('Sending phone verification...');
      this.confirmationResult = await signInWithPhoneNumber(this.auth, phoneNumber, this.recaptchaVerifier);

      // Store user data for later use
      sessionStorage.setItem('pendingPhoneUser', JSON.stringify({ name, phone: phoneNumber }));

      console.log('Phone verification sent successfully');
      return { success: true, message: 'SMS code sent to your phone' };

    } catch (error) {
      console.error('Phone OTP request failed:', error);

      // Reset reCAPTCHA on error
      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear();
        this.recaptchaVerifier = null;
      }

      // Handle specific Firebase errors
      if (error.code === 'auth/invalid-phone-number') {
        throw new Error('Invalid phone number format. Please include country code (e.g., +1 for US).');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many requests. Please try again later.');
      } else if (error.code === 'auth/missing-recaptcha-token') {
        throw new Error('reCAPTCHA verification failed. Please refresh and try again.');
      }

      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  async verifyPhoneOtp(otp) {
    try {
      if (!this.confirmationResult) {
        throw new Error('No OTP request found. Please request OTP first.');
      }

      const result = await this.confirmationResult.confirm(otp);

      // Update user document with phone auth data
      const pendingUserData = JSON.parse(sessionStorage.getItem('pendingPhoneUser'));
      if (pendingUserData) {
        await this.createOrUpdateUser(result.user, pendingUserData);
        sessionStorage.removeItem('pendingPhoneUser');

        // Store authentication state for offline use
        console.log('DEBUG: Setting localStorage for phone auth - userAuthenticated=true, authenticatedUserName=', pendingUserData.name);
        localStorage.setItem('userAuthenticated', 'true');
        localStorage.setItem('authenticatedUserName', pendingUserData.name);
      }

      return { success: true, user: result.user };
    } catch (error) {
      console.error('Phone OTP verification failed:', error);
      throw new Error(`Invalid OTP: ${error.message}`);
    }
  }

  // User Management
  async createOrUpdateUser(user, userData) {
    console.log('🔥 STARTING createOrUpdateUser method');
    console.log('🔥 User object:', { uid: user.uid, email: user.email, phone: user.phoneNumber });
    console.log('🔥 UserData:', userData);
    console.log('🔥 Firestore instance available:', !!this.db);
    console.log('🔥 Auth instance available:', !!this.auth);
    console.log('🔥 Current user authenticated:', this.auth?.currentUser ? 'YES' : 'NO');
    console.log('🔥 Current user UID matches:', this.auth?.currentUser?.uid === user.uid ? 'YES' : 'NO');
      console.log('🔥 Database being used:', this.db.app.options.projectId, 'database:', this.db._databaseId || 'default');
      console.log('🔥 Auth context - currentUser:', this.auth.currentUser ? 'EXISTS' : 'NULL');
      console.log('🔥 Auth context - UID:', this.auth.currentUser?.uid);
      console.log('🔥 Auth context - isAnonymous:', this.auth.currentUser?.isAnonymous);

    if (!this.db) {
      throw new Error('Firestore instance not available');
    }

    if (!this.auth?.currentUser) {
      throw new Error('User not authenticated');
    }

    const userDoc = {
      uid: user.uid,
      name: userData.name,
      email: userData.email,
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
      console.log('🔥 About to call setDoc...');

      try {
        console.log('🔥 Testing basic Firestore connectivity first...');

        // Test connectivity by trying to read from observations collection (which works)
        console.log('🔥 Attempting to read from observations collection to test connectivity...');
        const testDocRef = doc(this.db, 'observations', 'connectivity_test_' + Date.now());
        const testReadPromise = getDoc(testDocRef);
        const testTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connectivity test timeout')), 5000)
        );

        await Promise.race([testReadPromise, testTimeoutPromise]);
        console.log('✅ Firestore connectivity test passed (can read from observations)');

        console.log('🔥 Now calling setDoc...');
        const setDocPromise = setDoc(docRef, userDoc, { merge: true });
        const setDocTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('setDoc timeout after 10 seconds')), 10000)
        );

        await Promise.race([setDocPromise, setDocTimeoutPromise]);
        console.log('✅ setDoc completed successfully');
      } catch (setDocError) {
        console.error('❌ setDoc failed with error:');
        console.error('❌ Error code:', setDocError.code);
        console.error('❌ Error message:', setDocError.message);
        console.error('❌ Full error:', setDocError);

        // Check if it's a network/connectivity error
        if (setDocError.message.includes('timeout') || setDocError.message.includes('network')) {
          console.error('🚨 USERS COLLECTION ISSUE: Connectivity works (observations collection accessible)');
          console.error('🚨 But users collection writes are blocked. Possible causes:');
          console.error('🚨 - Users collection rules not applied correctly');
          console.error('🚨 - Document ID format issues');
          console.error('🚨 - Users collection name conflict');
          console.error('🚨 - Firebase security/policies specific to users collection');
        }

        throw setDocError;
      }

      // Verify the document was created
      console.log('🔍 Verifying document creation...');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        console.log('✅ Document verification successful!');
        console.log('✅ Document data:', docSnap.data());
      } else {
        console.error('❌ Document verification failed - document does not exist after creation');
      }

    } catch (error) {
      console.error('❌ CRITICAL ERROR in createOrUpdateUser:');
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Full error object:', error);
      throw error;
    }

    console.log('🔥 createOrUpdateUser method completed');
  }

  async updateUserLastLogin(uid) {
    try {
      await updateDoc(doc(this.db, 'users', uid), {
        lastLogin: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to update last login:', error);
    }
  }

  async checkUserStatus() {
    if (!this.currentUser) return null;

    try {
      // First test if we can read from health collection (should always work)
      console.log('🔍 Testing Firestore connectivity...');
      try {
        const testDoc = await getDoc(doc(this.db, 'health', 'connectivity_test'));
        console.log('✅ Firestore connectivity test passed');
      } catch (testError) {
        console.warn('⚠️ Firestore connectivity test failed:', testError.message);
        console.warn('⚠️ This suggests Firestore rules are not deployed correctly');

        // Try to test with a simple write operation to see if auth works
        console.log('🔍 Testing write permissions with observations collection...');
        try {
          // This should work if rules are deployed correctly
          const testWriteRef = doc(this.db, 'observations', 'permission_test_' + Date.now());
          await setDoc(testWriteRef, { test: true, timestamp: new Date() });
          console.log('✅ Write permission test passed - rules are working');
        } catch (writeError) {
          console.error('❌ Write permission test failed:', writeError.message);
          console.error('❌ Rules may not be deployed or auth context is wrong');

          // Try health collection read (should always work)
          console.log('🔍 Testing health collection read...');
          try {
            const healthDoc = await getDoc(doc(this.db, 'health', 'test'));
            console.log('✅ Health collection accessible');
          } catch (healthError) {
            console.error('❌ Even health collection failed:', healthError.message);
            console.error('❌ This suggests database connection or basic auth issues');
          }
        }
      }

      const userDoc = await getDoc(doc(this.db, 'users', this.currentUser.uid));
      if (userDoc.exists()) {
        console.log('✅ User document found:', userDoc.id);
        return userDoc.data();
      }
      console.log('⚠️ User document not found:', this.currentUser.uid);
      return null;
    } catch (error) {
      console.error('❌ Failed to check user status:', error);
      console.error('❌ Error details:', error.code, error.message);
      return null;
    }
  }

  // Check if user is allowed to submit data (not revoked)
  async canSubmitData() {
    const userStatus = await this.checkUserStatus();
    if (!userStatus) {
      console.log('User status not found - allowing submission (new user)');
      return true; // Allow new users to submit until status is set
    }

    const isActive = userStatus.status === 'active' || userStatus.status === undefined;
    console.log('User submission check - status:', userStatus.status, 'allowed:', isActive);

    if (!isActive) {
      console.warn('🚫 REVOKED USER attempted to submit data - BLOCKED');
    }

    return isActive;
  }

  async signOut() {
    await signOut(this.auth);
    this.currentUser = null;
    // Clear offline authentication state
    localStorage.removeItem('userAuthenticated');
    localStorage.removeItem('authenticatedUserName');
  }

  isAuthenticated() {
    return !!this.currentUser;
  }
}

// Create global instance
window.authService = new AuthService();