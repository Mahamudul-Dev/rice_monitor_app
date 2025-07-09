// Google OAuth Integration utilities

/**
 * Initialize Google Auth API
 * @returns {Promise} Promise that resolves when Google Auth is initialized
 */
export const initializeGoogleAuth = () => {
  return new Promise((resolve, reject) => {
    if (window.gapi) {
      window.gapi.load('auth2', () => {
        window.gapi.auth2.init({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID
        }).then(resolve).catch(reject);
      });
    } else {
      // Load Google API if not already loaded
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('auth2', () => {
          window.gapi.auth2.init({
            client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID
          }).then(resolve).catch(reject);
        });
      };
      script.onerror = reject;
      document.head.appendChild(script);
    }
  });
};

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
 * Extract user info from Google user object
 * @param {Object} googleUser 
 * @returns {Object} Extracted user info
 */
export const extractGoogleUserInfo = (googleUser) => {
  const profile = googleUser.getBasicProfile();
  const authResponse = googleUser.getAuthResponse();
  
  return {
    email: profile.getEmail(),
    name: profile.getName(),
    picture: profile.getImageUrl(),
    googleId: profile.getId(),
    accessToken: authResponse.access_token
  };
};