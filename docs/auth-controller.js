// Authentication Controller - Main entry point
class AuthController {
  constructor() {
    this.flutterStarted = false;
    console.log('AuthController constructor called');
  }

  async init() {
    console.log('Auth controller initializing...');

    // Wait for auth services to be ready
    await this.waitForServices();
    console.log('Auth services ready');

    // Check if we have a previously authenticated user stored locally
    const storedAuth = localStorage.getItem('userAuthenticated');
    const storedUserName = localStorage.getItem('authenticatedUserName');

    console.log('DEBUG: storedAuth:', storedAuth, 'storedUserName:', storedUserName);

    if (storedAuth === 'true' && storedUserName) {
      console.log('Found previously authenticated user:', storedUserName, '- starting Flutter directly');
      this.startFlutterApp();
      return;
    }

    // Check if user is currently authenticated with Firebase
    const isAuthenticated = window.authService.isAuthenticated();
    console.log('Current Firebase auth state:', isAuthenticated);

    if (isAuthenticated) {
      console.log('User is currently authenticated with Firebase - starting Flutter');
      this.startFlutterApp();
      return;
    }

    // User is not authenticated - show auth UI
    console.log('User not authenticated - showing auth UI');
    window.authUI.showLoginTypeSelection();
  }

  waitForServices() {
    return new Promise((resolve) => {
      const checkServices = () => {
        if (window.firebaseAuth && window.authService && window.authUI) {
          resolve();
        } else {
          setTimeout(checkServices, 100);
        }
      };
      checkServices();
    });
  }

  showAuthScreen() {
    // Auth UI is already initialized and showing, nothing to do
    console.log('Auth screen should already be visible');
  }

  startFlutterApp() {
    console.log('🎯 STARTING FLUTTER APP - User is authenticated');

    // Prevent multiple calls
    if (this.flutterStarted) {
      console.log('Flutter app already started, skipping');
      return;
    }
    this.flutterStarted = true;

    // Hide auth overlay if it exists
    const overlay = document.getElementById('auth-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      console.log('Auth overlay hidden');
    }

    // Start Flutter app - bootstrap script should already be loaded
    console.log('Starting Flutter app - calling loader...');
    if (window._flutter && window._flutter.loader) {
      window._flutter.loader.load({
        serviceWorkerSettings: {
          serviceWorkerVersion: "3967701479"
        }
      });
      console.log('Flutter loader called successfully');
    } else {
      console.error('Flutter loader not available');
    }
  }

  showOfflineMessage() {
    const container = document.createElement('div');
    container.id = 'auth-overlay';
    container.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); display: flex; justify-content: center; align-items: center; z-index: 9999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="background: white; border-radius: 16px; padding: 24px; max-width: 400px; width: 90%; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2); text-align: center;">
          <h2 style="margin: 0 0 20px 0; color: #333; font-size: 24px;">KPR Monitoring App</h2>
          <div style="font-size: 48px; margin-bottom: 20px;">📱</div>
          <p style="color: #666; margin-bottom: 20px; font-size: 16px;">
            You're currently offline. This app requires an internet connection for initial setup and authentication.
          </p>
          <p style="color: #666; margin-bottom: 30px; font-size: 14px;">
            Please connect to the internet and try again.
          </p>
          <button onclick="window.location.reload()" style="background: linear-gradient(135deg, #007aff, #0056cc); color: white; border: none; padding: 16px 20px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%; box-sizing: border-box; min-height: 48px;">
            Retry Connection
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(container);
  }
}

// Initialize auth controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded fired - creating and initializing auth controller');
  window.authController = new AuthController();
  window.authController.init();
});

// Also try immediate initialization in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
  // Document still loading, wait for DOMContentLoaded
} else {
  // Document already loaded, initialize immediately
  console.log('Document already loaded - creating and initializing auth controller immediately');
  window.authController = new AuthController();
  window.authController.init();
}