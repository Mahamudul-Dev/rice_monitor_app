// src/components/LoginScreen.js

import React, { useEffect, useState, useCallback } from "react";
import { initializeGoogleAuth, extractGoogleUserInfo } from "../utils/auth";
import apiService from "../services/apiService"; // Your API wrapper

const LoginScreen = ({ onLogin }) => {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = useCallback(
    async (credentialResponse) => {
      setIsLoading(true);
      setError("");

      try {
        const userInfo = extractGoogleUserInfo(credentialResponse);

        const response = await apiService.googleLogin(userInfo.accessToken); // implement this on your backend

        if (!response.access_token || !response.user) {
          console.log(response);
          throw new Error(response.message || "Login failed");
        }

        // Store tokens
        localStorage.setItem("access_token", response.access_token);
        localStorage.setItem("refresh_token", response.refresh_token);
        localStorage.setItem("user", JSON.stringify(response.user));

        onLogin(response.user);
      } catch (err) {
        console.error("Login failed:", err);
        setError(err.message || "Login failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [onLogin]
  );

  useEffect(() => {
    initializeGoogleAuth(handleGoogleLogin).catch((err) => {
      console.error("Google init failed:", err);
      setError("Failed to initialize Google authentication");
    });
  }, [handleGoogleLogin]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-4">Login to Rice Monitor</h1>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
            <button
              className="ml-2 text-sm text-red-600 underline"
              onClick={() => setError("")}
            >
              Dismiss
            </button>
          </div>
        )}

        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <div className="g_id_signin"></div> // Google button will render here
        )}
      </div>
    </div>
  );
};

export default LoginScreen;
