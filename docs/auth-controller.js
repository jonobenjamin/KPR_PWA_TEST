// Authentication Controller
class AuthController {
  constructor() {
    this.flutterStarted = false;
  }

  async init() {
    // ── OFFLINE-FIRST: check stored login BEFORE touching Firebase ──────────
    // Firebase SDKs load from gstatic.com CDN. When offline the imports
    // fail silently and window.firebaseAuth is never set. If we waited for
    // Firebase first, returning users would be stuck on a dark screen forever.
    const storedAuth = localStorage.getItem('userAuthenticated');
    const storedUserName = localStorage.getItem('authenticatedUserName');

    if (storedAuth === 'true' && storedUserName) {
      // Previously authenticated — hide overlay immediately, Flutter is already
      // running (started by flutter_bootstrap.js).
      this._hideOverlay();
      this.flutterStarted = true;
      return;
    }

    // ── First-time login: need Firebase ─────────────────────────────────────
    // If offline and no stored auth, we can't log in.
    if (!navigator.onLine) {
      this._showOfflineMessage();
      return;
    }

    // Wait up to 8 s for Firebase services (CDN can be slow on cellular).
    const ready = await this._waitForServices(8000);
    if (!ready) {
      // Still couldn't reach Firebase — probably offline or very slow network.
      this._showOfflineMessage();
      return;
    }

    // Firebase loaded. If the auth state listener already resolved a user, go.
    if (window.authService && window.authService.isAuthenticated()) {
      this._hideOverlay();
      this.flutterStarted = true;
      return;
    }

    // Show login UI.
    if (window.authUI) {
      window.authUI.showLoginTypeSelection();
    }
  }

  // Called by auth-ui.js after a successful login.
  startFlutterApp() {
    if (this.flutterStarted) return;
    this.flutterStarted = true;
    this._hideOverlay();
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  _hideOverlay() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  // Returns true if Firebase services become available within `timeoutMs`.
  _waitForServices(timeoutMs) {
    return new Promise((resolve) => {
      const deadline = Date.now() + timeoutMs;
      const check = () => {
        if (window.firebaseAuth && window.authService && window.authUI) {
          resolve(true);
          return;
        }
        if (Date.now() >= deadline) {
          console.warn('AuthController: Firebase services timed out — likely offline');
          resolve(false);
          return;
        }
        setTimeout(check, 100);
      };
      check();
    });
  }

  _showOfflineMessage() {
    // Reuse existing overlay if already visible (auth-ui may have created it).
    let overlay = document.getElementById('auth-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'auth-overlay';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <div style="
        position:fixed;top:0;left:0;width:100%;height:100%;
        background:rgba(0,0,0,0.85);
        display:flex;justify-content:center;align-items:center;
        z-index:9999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
        padding:16px;box-sizing:border-box;">
        <div style="
          background:white;border-radius:16px;padding:24px;
          max-width:400px;width:100%;text-align:center;
          box-shadow:0 10px 25px rgba(0,0,0,0.3);">
          <h2 style="margin:0 0 16px;color:#333;font-size:22px;">KPR Monitor</h2>
          <div style="font-size:40px;margin-bottom:16px;">📵</div>
          <p style="color:#555;margin-bottom:16px;font-size:15px;line-height:1.5;">
            You're offline and haven't logged in on this device yet.
          </p>
          <p style="color:#777;margin-bottom:24px;font-size:13px;line-height:1.4;">
            Connect to WiFi, log in once, and the app will work fully offline afterwards.
          </p>
          <button onclick="window.location.reload()" style="
            background:linear-gradient(135deg,#2e7d32,#1b5e20);
            color:white;border:none;padding:14px 20px;
            border-radius:12px;font-size:16px;font-weight:600;
            cursor:pointer;width:100%;box-sizing:border-box;min-height:48px;">
            Retry
          </button>
        </div>
      </div>
    `;

    // Re-try automatically when connectivity returns.
    window.addEventListener('online', () => {
      window.location.reload();
    }, { once: true });
  }
}

// ── Bootstrap (run once only) ────────────────────────────────────────────────
(function () {
  if (window.__authControllerStarted) return;
  window.__authControllerStarted = true;

  const start = () => {
    if (window.authController) return;
    window.authController = new AuthController();
    window.authController.init();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
