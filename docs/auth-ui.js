// Authentication UI
class AuthUI {
  constructor() {
    this.currentStep = 'login-type'; // login-type, email-form, email-pin, phone-form, phone-otp
    this.userData = {};
    this.init();
  }

  init() {
    this.createAuthContainer();
    // Don't show login selection automatically - let auth controller decide
  }

  createAuthContainer() {
    // Create overlay container
    const container = document.createElement('div');
    container.id = 'auth-overlay';
    container.innerHTML = `
      <div id="auth-container">
        <div id="auth-header">
          <h2>Sign In to KPR Monitoring</h2>
        </div>
        <div id="auth-content"></div>
        <div id="recaptcha-container"></div>
      </div>
    `;

    // Add styles - Mobile-first responsive design
    const style = document.createElement('style');
    style.textContent = `
      #auth-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 16px; /* Add padding for mobile safe areas */
        box-sizing: border-box;
      }

      #auth-container {
        background: white;
        border-radius: 16px; /* More rounded on mobile */
        padding: 20px;
        max-width: 400px;
        width: 100%; /* Full width on mobile */
        max-height: 90vh; /* Prevent overflow on small screens */
        overflow-y: auto; /* Allow scrolling if needed */
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        animation: slideUp 0.3s ease-out;
        margin: auto; /* Center properly */
      }

      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      #auth-header h2 {
        margin: 0 0 24px 0;
        color: #333;
        font-size: 22px; /* Slightly smaller for mobile */
        font-weight: 600;
        text-align: center;
        line-height: 1.3;
      }

      .auth-form {
        display: flex;
        flex-direction: column;
        gap: 20px; /* More spacing on mobile */
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .form-group label {
        font-weight: 500;
        color: #555;
        font-size: 16px; /* Larger for mobile readability */
        margin-bottom: 4px;
      }

      .form-group input {
        padding: 16px 18px; /* Larger touch targets */
        border: 2px solid #e1e5e9;
        border-radius: 12px; /* More rounded */
        font-size: 16px; /* Prevent zoom on iOS */
        transition: border-color 0.2s;
        width: 100%;
        box-sizing: border-box;
        background: #fafafa; /* Light background for better contrast */
      }

      .form-group input:focus {
        outline: none;
        border-color: #007aff;
        background: white;
        box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1); /* Focus ring */
      }

      .form-group input::placeholder {
        color: #999;
        font-size: 16px;
      }

      .auth-button {
        background: linear-gradient(135deg, #007aff, #0056cc); /* Gradient for modern look */
        color: white;
        border: none;
        padding: 16px 20px; /* Larger touch targets */
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        width: 100%;
        box-sizing: border-box;
        min-height: 48px; /* Minimum touch target size */
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .auth-button:hover {
        background: linear-gradient(135deg, #0056cc, #004499);
        transform: translateY(-1px);
      }

      .auth-button:active {
        transform: translateY(0);
      }

      .auth-button:disabled {
        background: #ccc;
        cursor: not-allowed;
        transform: none;
      }

      .auth-button.secondary {
        background: #f8f9fa;
        color: #333;
        border: 2px solid #e9ecef;
      }

      .auth-button.secondary:hover {
        background: #e9ecef;
        border-color: #dee2e6;
      }

      .auth-links {
        display: flex;
        justify-content: center;
        gap: 24px; /* More spacing */
        margin-top: 24px;
        flex-wrap: wrap; /* Wrap on small screens */
      }

      .auth-link {
        color: #007aff;
        text-decoration: none;
        font-size: 16px; /* Larger for mobile */
        font-weight: 500;
        cursor: pointer;
        padding: 8px 12px;
        border-radius: 8px;
        transition: background 0.2s;
        min-height: 44px; /* Touch target size */
        display: flex;
        align-items: center;
      }

      .auth-link:hover {
        background: rgba(0, 122, 255, 0.1);
        text-decoration: none;
      }

      .error-message {
        color: #dc3545;
        font-size: 15px; /* Larger for mobile */
        margin-top: 12px;
        text-align: center;
        padding: 12px;
        background: #f8d7da;
        border-radius: 8px;
        border: 1px solid #f5c6cb;
      }

      .success-message {
        color: #28a745;
        font-size: 15px;
        margin-top: 12px;
        text-align: center;
        padding: 12px;
        background: #d4edda;
        border-radius: 8px;
        border: 1px solid #c3e6cb;
      }

      .loading {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #007aff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* Mobile-specific adjustments */
      @media (max-width: 480px) {
        #auth-overlay {
          padding: 12px;
        }

        #auth-container {
          padding: 16px;
          border-radius: 12px;
        }

        #auth-header h2 {
          font-size: 20px;
          margin-bottom: 20px;
        }

        .auth-form {
          gap: 16px;
        }

        .form-group input {
          padding: 14px 16px;
        }

        .auth-button {
          padding: 14px 18px;
          min-height: 44px;
        }

        .auth-links {
          gap: 16px;
          margin-top: 20px;
        }

        .auth-link {
          font-size: 15px;
          padding: 6px 10px;
          min-height: 40px;
        }
      }

      /* Ensure proper viewport handling */
      @media (max-height: 600px) {
        #auth-container {
          max-height: 95vh;
          margin: 8px auto;
        }

        #auth-overlay {
          padding: 8px;
        }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(container);
  }

  showLoginTypeSelection() {
    this.currentStep = 'login-type';
    const content = document.getElementById('auth-content');

    // Check if user has previously authenticated
    const storedAuth = localStorage.getItem('userAuthenticated');
    const storedUserName = localStorage.getItem('authenticatedUserName');

    let offlineButton = '';
    if (storedAuth === 'true' && storedUserName) {
      offlineButton = `
        <button class="auth-button secondary" onclick="window.authController.startFlutterApp()">
          🔄 Continue as ${storedUserName} (Offline)
        </button>
      `;
    }

    content.innerHTML = `
        <div class="auth-form">
          ${offlineButton}
          <button class="auth-button" onclick="window.authUI.showEmailForm()">
            📧 Sign in with Email
          </button>
          <button class="auth-button" onclick="window.authUI.showPhoneForm()">
            📱 Sign in with Phone
          </button>
        </div>
    `;
  }

  showEmailForm() {
    this.currentStep = 'email-form';
    const content = document.getElementById('auth-content');
    content.innerHTML = `
      <div class="auth-form">
        <div class="form-group">
          <label for="name">Full Name</label>
          <input type="text" id="name" placeholder="Enter your full name" required>
        </div>
        <div class="form-group">
          <label for="email">Email Address</label>
          <input type="email" id="email" placeholder="Enter your email address" required>
        </div>
        <button class="auth-button" id="email-submit-btn" onclick="window.authUI.handleEmailSubmit()">
          Send PIN Code
        </button>
        <div id="email-message"></div>
      </div>
      <div class="auth-links">
        <a class="auth-link" onclick="window.authUI.showLoginTypeSelection()">← Back</a>
      </div>
    `;

    // Focus on name field
    setTimeout(() => document.getElementById('name').focus(), 100);
  }

  showEmailPinForm() {
    this.currentStep = 'email-pin';
    const content = document.getElementById('auth-content');
    content.innerHTML = `
      <div class="auth-form">
        <div style="text-align: center; margin-bottom: 20px;">
          <p>Enter the 6-digit PIN sent to<br><strong>${this.userData.email}</strong></p>
        </div>
        <div class="form-group">
          <label for="pin">PIN Code</label>
          <input type="text" id="pin" placeholder="000000" maxlength="6" pattern="[0-9]{6}" required>
        </div>
        <button class="auth-button" id="pin-submit-btn" onclick="window.authUI.handlePinSubmit()">
          Verify PIN
        </button>
        <div id="pin-message"></div>
      </div>
      <div class="auth-links">
        <a class="auth-link" onclick="window.authUI.showEmailForm()">← Back</a>
        <a class="auth-link" onclick="window.authUI.resendEmailPin()">Resend PIN</a>
      </div>
    `;

    // Auto-focus and format PIN input
    const pinInput = document.getElementById('pin');
    setTimeout(() => pinInput.focus(), 100);

    pinInput.addEventListener('input', (e) => {
      // Only allow numbers
      e.target.value = e.target.value.replace(/\D/g, '');
    });
  }

  showPhoneForm() {
    this.currentStep = 'phone-form';
    const content = document.getElementById('auth-content');
    content.innerHTML = `
      <div class="auth-form">
        <div class="form-group">
          <label for="phone-name">Full Name</label>
          <input type="text" id="phone-name" placeholder="Enter your full name" required>
        </div>
        <div class="form-group">
          <label for="phone">Phone Number</label>
          <input type="tel" id="phone" placeholder="+1234567890" required>
        </div>
        <button class="auth-button" id="phone-submit-btn" onclick="window.authUI.handlePhoneSubmit()">
          Send OTP
        </button>
        <div id="phone-message"></div>
      </div>
      <div class="auth-links">
        <a class="auth-link" onclick="window.authUI.showLoginTypeSelection()">← Back</a>
      </div>
    `;

    // Focus on name field
    setTimeout(() => document.getElementById('phone-name').focus(), 100);
  }

  showPhoneOtpForm() {
    this.currentStep = 'phone-otp';
    const content = document.getElementById('auth-content');
    content.innerHTML = `
      <div class="auth-form">
        <div style="text-align: center; margin-bottom: 20px;">
          <p>Enter the 6-digit code sent to<br><strong>${this.userData.phone}</strong></p>
        </div>
        <div class="form-group">
          <label for="otp">SMS Code</label>
          <input type="text" id="otp" placeholder="000000" maxlength="6" pattern="[0-9]{6}" required>
        </div>
        <button class="auth-button" id="otp-submit-btn" onclick="window.authUI.handleOtpSubmit()">
          Verify Code
        </button>
        <div id="otp-message"></div>
      </div>
      <div class="auth-links">
        <a class="auth-link" onclick="window.authUI.showPhoneForm()">← Back</a>
      </div>
    `;

    // Auto-focus and format OTP input
    const otpInput = document.getElementById('otp');
    setTimeout(() => otpInput.focus(), 100);

    otpInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
    });
  }

  // Event handlers
  async handleEmailSubmit() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();

    if (!name || !email) {
      this.showMessage('email-message', 'Please fill in all fields', 'error');
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showMessage('email-message', 'Please enter a valid email address', 'error');
      return;
    }

    this.setLoading('email-submit-btn', true);

    try {
      this.userData = { name, email };
      const result = await window.authService.requestEmailPin(email, name);
      this.showMessage('email-message', result.message, 'success');
      this.showEmailPinForm();
    } catch (error) {
      this.showMessage('email-message', error.message, 'error');
    } finally {
      this.setLoading('email-submit-btn', false);
    }
  }

  async handlePinSubmit() {
    const pin = document.getElementById('pin').value.trim();

    if (!pin || pin.length !== 6) {
      this.showMessage('pin-message', 'Please enter a valid 6-digit PIN', 'error');
      return;
    }

    this.setLoading('pin-submit-btn', true);

    try {
      const result = await window.authService.verifyEmailPin(this.userData.email, pin);
      this.showMessage('pin-message', 'Sign in successful!', 'success');
      setTimeout(() => this.hideAuthAndStartApp(), 1000);
    } catch (error) {
      this.showMessage('pin-message', error.message, 'error');
    } finally {
      this.setLoading('pin-submit-btn', false);
    }
  }

  async handlePhoneSubmit() {
    const name = document.getElementById('phone-name').value.trim();
    const phone = document.getElementById('phone').value.trim();

    if (!name || !phone) {
      this.showMessage('phone-message', 'Please fill in all fields', 'error');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
      this.showMessage('phone-message', 'Please enter a valid phone number with country code (e.g., +1234567890)', 'error');
      return;
    }

    this.setLoading('phone-submit-btn', true);

    try {
      this.userData = { name, phone };
      const result = await window.authService.requestPhoneOtp(phone, name);
      this.showMessage('phone-message', result.message, 'success');
      this.showPhoneOtpForm();
    } catch (error) {
      console.error('Phone auth error:', error);
      this.showMessage('phone-message', error.message, 'error');
    } finally {
      this.setLoading('phone-submit-btn', false);
    }
  }

  async handleOtpSubmit() {
    const otp = document.getElementById('otp').value.trim();

    if (!otp || otp.length !== 6) {
      this.showMessage('otp-message', 'Please enter a valid 6-digit code', 'error');
      return;
    }

    this.setLoading('otp-submit-btn', true);

    try {
      const result = await window.authService.verifyPhoneOtp(otp);
      this.showMessage('otp-message', 'Sign in successful!', 'success');
      setTimeout(() => this.hideAuthAndStartApp(), 1000);
    } catch (error) {
      this.showMessage('otp-message', error.message, 'error');
    } finally {
      this.setLoading('otp-submit-btn', false);
    }
  }

  async resendEmailPin() {
    try {
      const result = await window.authService.requestEmailPin(this.userData.email, this.userData.name);
      this.showMessage('pin-message', 'PIN resent to your email', 'success');
    } catch (error) {
      this.showMessage('pin-message', error.message, 'error');
    }
  }

  // Utility methods
  showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.className = type === 'error' ? 'error-message' : 'success-message';
    element.textContent = message;
  }

  setLoading(buttonId, loading) {
    const button = document.getElementById(buttonId);
    if (!button) {
      console.warn(`Button with ID ${buttonId} not found - form may have changed`);
      return;
    }

    if (loading) {
      button.disabled = true;
      button.innerHTML = '<span class="loading"></span> Please wait...';
    } else {
      button.disabled = false;
      // Restore original text based on button type
      if (buttonId.includes('email-submit')) {
        button.textContent = 'Send PIN Code';
      } else if (buttonId.includes('pin-submit')) {
        button.textContent = 'Verify PIN';
      } else if (buttonId.includes('phone-submit')) {
        button.textContent = 'Send OTP';
      } else if (buttonId.includes('otp-submit')) {
        button.textContent = 'Verify Code';
      } else {
        // Fallback: try to restore original text
        const currentText = button.textContent;
        if (currentText.includes('Please wait...')) {
          button.textContent = currentText.replace('Please wait...', '').trim();
        }
      }
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  hideAuthAndStartApp() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    // Start the Flutter app via auth controller
    if (window.authController) {
      window.authController.startFlutterApp();
    }
  }

  showAuthOverlay() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
    }
  }
}

// Create global instance
window.authUI = new AuthUI();