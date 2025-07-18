// Google OAuth Integration utilities



/**
 * Get Google Auth instance
 * @returns {Object} Google Auth instance
 */
export const getGoogleAuthInstance = () => {
  return window.gapi?.auth2?.getAuthInstance();
};

/**
 * Sign in with Google
 * @returns {Promise} Promise that resolves with Google user object
 */
export const signInWithGoogle = async () => {
  const authInstance = getGoogleAuthInstance();
  if (!authInstance) {
    throw new Error('Google Auth not initialized');
  }
  
  try {
    const googleUser = await authInstance.signIn();
    return googleUser;
  } catch (error) {
    throw new Error(`Google sign-in failed: ${error.error || error.message}`);
  }
};

/**
 * Sign out from Google
 * @returns {Promise} Promise that resolves when sign out is complete
 */
export const signOutFromGoogle = async () => {
  const authInstance = getGoogleAuthInstance();
  if (authInstance) {
    try {
      await authInstance.signOut();
    } catch (error) {
      console.warn('Google sign-out failed:', error);
    }
  }
};

/**
 * Check if user is signed in to Google
 * @returns {boolean} True if user is signed in
 */
export const isGoogleSignedIn = () => {
  const authInstance = getGoogleAuthInstance();
  return authInstance?.isSignedIn?.get() || false;
};

/**
 * Get current Google user
 * @returns {Object|null} Current Google user or null
 */
export const getCurrentGoogleUser = () => {
  const authInstance = getGoogleAuthInstance();
  if (authInstance?.isSignedIn?.get()) {
    return authInstance.currentUser.get();
  }
  return null;
};

/**
 * Local storage utilities for token management
 */
export const tokenManager = {
  /**
   * Store authentication tokens
   * @param {string} accessToken 
   * @param {string} refreshToken 
   */
  storeTokens: (accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  },

  /**
   * Get access token
   * @returns {string|null} Access token or null
   */
  getAccessToken: () => {
    return localStorage.getItem('access_token');
  },

  /**
   * Get refresh token
   * @returns {string|null} Refresh token or null
   */
  getRefreshToken: () => {
    return localStorage.getItem('refresh_token');
  },

  /**
   * Clear all tokens
   */
  clearTokens: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  /**
   * Check if access token exists
   * @returns {boolean} True if access token exists
   */
  hasAccessToken: () => {
    return !!localStorage.getItem('access_token');
  }
};

/**
 * User data utilities
 */
export const userManager = {
  /**
   * Store user data
   * @param {Object} userData 
   */
  storeUser: (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
  },

  /**
   * Get stored user data
   * @returns {Object|null} User data or null
   */
  getUser: () => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  },

  /**
   * Clear stored user data
   */
  clearUser: () => {
    localStorage.removeItem('user');
  },

  /**
   * Check if user data exists
   * @returns {boolean} True if user data exists
   */
  hasUser: () => {
    return !!localStorage.getItem('user');
  }
};

/**
 * Complete logout - clears all auth data
 */
export const completeLogout = async () => {
  try {
    // Sign out from Google
    await signOutFromGoogle();
  } catch (error) {
    console.warn('Google sign-out error:', error);
  }
  
  // Clear local storage
  tokenManager.clearTokens();
  userManager.clearUser();
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if user is authenticated
 */
export const isAuthenticated = () => {
  return tokenManager.hasAccessToken() && userManager.hasUser();
};

/**
 * Validate email format
 * @param {string} email 
 * @returns {boolean} True if email is valid
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Extract user info from Google Credential JWT
 * @param {Object} credentialResponse 
 * @returns {Object} Decoded user info
 */

/**
 * Initialize Google Identity Services and render login button
 * @param {function} onCredentialResponse - Callback when user logs in
 */
export const initializeGoogleAuth = (onCredentialResponse) => {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setupGoogleLogin(onCredentialResponse);
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Google Identity script'));
      document.head.appendChild(script);
    } else {
      setupGoogleLogin(onCredentialResponse);
      resolve();
    }
  });
};

const setupGoogleLogin = (onCredentialResponse) => {
  window.google.accounts.id.initialize({
    client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
    callback: onCredentialResponse,
  });

  window.google.accounts.id.renderButton(
    document.querySelector('.g_id_signin'),
    {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
    }
  );
};

/**
 * Decode Google JWT token
 */
export const extractGoogleUserInfo = (credentialResponse) => {
  const token = credentialResponse?.credential;
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid Google credential');
  }

  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join('')
  );

  const payload = JSON.parse(jsonPayload);

  return {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    googleId: payload.sub,
    accessToken: token,
  };
};