import React, { useState, useEffect, useCallback } from "react";
import { Leaf, FileText, Loader } from "lucide-react";

// Import components
import LoginScreen from "./components/LoginScreen";
import MonitoringForm from "./components/MonitoringForm";
import SubmissionsScreen from "./components/SubmissionsScreen";
import Toast, { useToast } from "./components/common/Toast";

// Import services and utilities
import apiService from "./services/apiService";
import { isAuthenticated, tokenManager, completeLogout } from "./utils/auth";

/**
 * Bottom Navigation Component
 */
const BottomNav = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "form", icon: Leaf, label: "Monitor" },
    { id: "submissions", icon: FileText, label: "Submissions" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-40">
      <div className="flex justify-around">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              activeTab === id ? "text-green-600" : "text-gray-500"
            }`}
          >
            <Icon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Main App Component
 * Manages authentication state and routing between different screens
 */
function App() {
  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Navigation state
  const [activeTab, setActiveTab] = useState("form");

  // Toast notifications
  const { toasts, removeToast, success, error, warning, info } = useToast();

  /**
   * Handle logout
   * @param {boolean} showMessage - Whether to show logout message
   */
  const handleLogout = useCallback(
    async (showMessage = true) => {
      try {
        // Call logout API
        if (tokenManager.hasAccessToken()) {
          await apiService.logout();
        }
      } catch (error) {
        // console.error('Logout API error:', error);
      } finally {
        // Clear all authentication data
        await completeLogout();

        // Reset app state
        setIsLoggedIn(false);
        setCurrentUser(null);
        setActiveTab("form");

        if (showMessage) {
          info("You have been logged out successfully");
        }
      }
    },
    [info]
  ); // Add info to dependency array

  const checkAuthStatus = useCallback(async () => {
    try {
      setIsCheckingAuth(true);

      // Check if we have stored authentication data
      if (!isAuthenticated()) {
        setIsCheckingAuth(false);
        console.log("Hello World");
        return;
      }

      // Verify authentication with backend
      const response = await apiService.getCurrentUser();

      if (response.success) {
        setCurrentUser(response.data);
        setIsLoggedIn(true);
      } else {
        // Invalid token, clear auth data
        await handleLogout(false);
      }
      console.log(isCheckingAuth);
    } catch (error) {
      // console.error('Auth check error:', error);
      // If token is invalid or expired, clear auth data
      await handleLogout(false);
    } finally {
      setIsCheckingAuth(false);
    }
  }, [handleLogout]);

  // Check authentication status on app load
  // useEffect(() => {

  //   checkAuthStatus();
  // },  [checkAuthStatus]);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsCheckingAuth(true);

        if (!isAuthenticated()) {
          setIsCheckingAuth(false);
          return;
        }

        const response = await apiService.getCurrentUser();

        if (response.success) {
          setCurrentUser(response.data);
          setIsLoggedIn(true);
        } else {
          await handleLogout(false);
        }
      } catch (error) {
        await handleLogout(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, []);

  /**
   * Handle successful login
   * @param {Object} userData - User data from login response
   */
  const handleLogin = (userData) => {
    setCurrentUser(userData);
    setIsLoggedIn(true);
    success("Welcome to Rice Monitor!");
  };

  /**
   * Handle successful form submission
   */
  const handleSubmissionSuccess = () => {
    // Switch to submissions tab to show the new submission
    setActiveTab("submissions");
  };

  /**
   * Show toast notification
   * @param {string} message - Message to display
   * @param {string} type - Type of toast ('success', 'error', 'warning', 'info')
   */
  const showToast = (message, type = "info") => {
    switch (type) {
      case "success":
        success(message);
        break;
      case "error":
        error(message);
        break;
      case "warning":
        warning(message);
        break;
      case "info":
      default:
        info(message);
        break;
    }
  };

  // Show loading screen while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4 shadow-lg">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <Loader className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Rice Monitor
          </h2>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isLoggedIn) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />

        {/* Toast notifications */}
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
            position="top-right"
          />
        ))}
      </>
    );
  }

  // Main app content for authenticated users
  return (
    <div className="min-h-screen  bg-gray-50">
      {/* Main Content */}
      {activeTab === "form" && (
        <MonitoringForm
          currentUser={currentUser}
          onLogout={handleLogout}
          showToast={showToast}
          onSubmissionSuccess={handleSubmissionSuccess}
        />
      )}

      {activeTab === "submissions" && (
        <SubmissionsScreen
          currentUser={currentUser}
          setActiveTab={setActiveTab}
          onLogout={handleLogout}
          showToast={showToast}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
          position="top-right"
        />
      ))}

      {/* Global Error Boundary Fallback (you can enhance this) */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-20 left-4 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          Dev: {activeTab} | User: {currentUser?.email}
        </div>
      )}
    </div>
  );
}

export default App;
