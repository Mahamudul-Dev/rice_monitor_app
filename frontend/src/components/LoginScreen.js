import React, { useState, useEffect } from 'react';
import { Leaf, AlertCircle } from 'lucide-react';
import { initializeGoogleAuth, signInWithGoogle, extractGoogleUserInfo } from '../utils/auth';
import apiService from '../services/apiService';
import Button from './common/Button';

// Google SVG Icon Component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

/**
 * Login Screen Component
 * Handles Google OAuth authentication for the rice monitoring app
 * 
 * @param {Object} props - Component properties
 * @param {function} props.onLogin - Callback function called when login is successful
 */
const LoginScreen = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGoogleReady, setIsGoogleReady] = useState(false);

  // Initialize Google Auth on component mount
  useEffect(() => {
    const initGoogle = async () => {
      try {
        await initializeGoogleAuth();
        setIsGoogleReady(true);
      } catch (error) {
        console.error('Failed to initialize Google Auth:', error);
        setError('Failed to initialize Google authentication. Please refresh the page.');
      }
    };

    initGoogle();
  }, []);

  /**
   * Handle Google login process
   */
  const handleGoogleLogin = async () => {
    if (!isGoogleReady) {
      setError('Google authentication is not ready. Please wait a moment and try again.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Sign in with Google
      const googleUser = await signInWithGoogle();
      const userInfo = extractGoogleUserInfo(googleUser);

      // Authenticate with backend
      const response = await apiService.googleLogin(userInfo.accessToken);
      
      if (!response.success && response.error) {
        throw new Error(response.message || 'Login failed');
      }

      // Store authentication data
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.user));

      // Call onLogin callback with user data
      onLogin(response.user);

    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific error cases
      if (error.message.includes('popup_closed_by_user')) {
        setError('Login was cancelled. Please try again.');
      } else if (error.message.includes('network')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(error.message || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear error message
   */
  const clearError = () => {
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600 rounded-full mb-6 shadow-lg">
            <Leaf className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Rice Monitor</h1>
          <p className="text-gray-600">Monitor your rice fields with precision</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Welcome Back</h2>
            <p className="text-gray-600">Sign in to continue monitoring your fields</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-red-700 text-sm leading-relaxed">{error}</p>
                  <button
                    onClick={clearError}
                    className="text-red-600 hover:text-red-800 text-sm font-medium mt-2 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Google Login Button */}
          <Button
            onClick={handleGoogleLogin}
            loading={isLoading}
            disabled={!isGoogleReady}
            fullWidth
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoading ? (
              'Signing you in...'
            ) : (
              <>
                <GoogleIcon />
                <span className="ml-3 font-medium">Continue with Google</span>
              </>
            )}
          </Button>

          {/* Loading state for Google initialization */}
          {!isGoogleReady && !error && (
            <div className="mt-4 text-center">
              <p className="text-gray-500 text-sm">Initializing Google authentication...</p>
            </div>
          )}

          {/* Additional Info */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-center text-sm text-gray-500 leading-relaxed">
              By continuing, you agree to our{' '}
              <a href="#" className="text-green-600 hover:text-green-700 underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-green-600 hover:text-green-700 underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Need help? Contact support at{' '}
            <a 
              href="mailto:support@ricemonitor.com" 
              className="text-green-600 font-medium hover:text-green-700"
            >
              support@ricemonitor.com
            </a>
          </p>
        </div>

        {/* Development Info (only show in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">Development Info</h3>
            <div className="text-xs text-yellow-700 space-y-1">
              <p>API URL: {process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1'}</p>
              <p>Google Client ID: {process.env.REACT_APP_GOOGLE_CLIENT_ID ? 'Configured' : 'Not configured'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;