package handlers

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"rice-monitor-api/models"
	"rice-monitor-api/services"
	"rice-monitor-api/utils"

	"cloud.google.com/go/firestore"
	"github.com/gin-gonic/gin"
	"google.golang.org/api/idtoken"
)

type AuthHandler struct {
	firestoreService *services.FirestoreService
}

func NewAuthHandler(firestoreService *services.FirestoreService) *AuthHandler {
	return &AuthHandler{
		firestoreService: firestoreService,
	}
}

// @Summary Google Login
// @Description Authenticate with Google and get JWT tokens
// @Tags auth
// @Accept  json
// @Produce  json
// @Param   token  body  models.GoogleTokenRequest  true  "Google Token"
// @Success 200 {object} models.AuthResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /auth/google [post]
func (ah *AuthHandler) GoogleLogin(c *gin.Context) {
	var req models.GoogleTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_request",
			Message: err.Error(),
		})
		return
	}

	// Verify Google token
	ctx := ah.firestoreService.Context()

	// Validate the ID token - replace "YOUR_GOOGLE_CLIENT_ID" with your actual client ID or fetch from config/env
	payload, err := idtoken.Validate(ctx, req.Token, utils.GetEnvOrDefault("GOOGLE_CLIENT_ID", ""))
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "invalid_token",
			Message: "Invalid Google ID token",
		})
		return
	}

	email, _ := payload.Claims["email"].(string)
	name, _ := payload.Claims["name"].(string)
	picture, _ := payload.Claims["picture"].(string)

	// Construct a simplified tokenInfo-like struct or map to pass to your getOrCreateUser
	tokenInfo := models.GoogleUserInfo{
		Email:   email,
		Name:    name,
		Picture: picture,
	}

	// Get or create user
	user, err := ah.getOrCreateUser(tokenInfo)
	if err != nil {
		fmt.Println(err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to process user",
		})
		return
	}

	// Generate JWT tokens
	accessToken, refreshToken, err := utils.GenerateTokens(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to generate tokens",
		})
		return
	}

	// Update last login
	user.LastLoginAt = time.Now()
	ah.updateUserLastLogin(user.ID)

	c.JSON(http.StatusOK, models.AuthResponse{
		User:         *user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    3600, // 1 hour
	})
}

// @Summary Refresh Token
// @Description Get a new access token using a refresh token
// @Tags auth
// @Accept  json
// @Produce  json
// @Param   token  body  models.RefreshTokenRequest  true  "Refresh Token"
// @Success 200 {object} models.AuthResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /auth/refresh [post]
func (ah *AuthHandler) RefreshToken(c *gin.Context) {
	var req models.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_request",
			Message: err.Error(),
		})
		return
	}

	// Validate refresh token
	claims, err := utils.ValidateToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "invalid_token",
			Message: "Invalid refresh token",
		})
		return
	}

	// Get user
	user, err := ah.getUserByID(claims.UserID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "user_not_found",
			Message: "User not found",
		})
		return
	}

	// Generate new tokens
	accessToken, refreshToken, err := utils.GenerateTokens(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to generate tokens",
		})
		return
	}

	c.JSON(http.StatusOK, models.AuthResponse{
		User:         *user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    3600,
	})
}

// @Summary Logout
// @Description Logout the current user
// @Tags auth
// @Security ApiKeyAuth
// @Success 200 {object} models.SuccessResponse
// @Router /auth/logout [post]
func (ah *AuthHandler) Logout(c *gin.Context) {
	// In a production system, you might want to blacklist the token
	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Message: "Logged out successfully",
	})
}

// @Summary Get Current User
// @Description Get the currently authenticated user's details
// @Tags auth
// @Produce  json
// @Security ApiKeyAuth
// @Success 200 {object} models.SuccessResponse
// @Failure 401 {object} models.ErrorResponse
// @Router /auth/me [get]
func (ah *AuthHandler) GetCurrentUser(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not found in context",
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Data:    user,
	})
}

// Helper functions
func (ah *AuthHandler) getOrCreateUser(tokenInfo models.GoogleUserInfo) (*models.User, error) {
	ctx := ah.firestoreService.Context()

	email := tokenInfo.Email
	name := tokenInfo.Name
	picture := tokenInfo.Picture

	// Check if user exists
	docs, err := ah.firestoreService.Users().Where("email", "==", tokenInfo.Email).Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}

	if len(docs) > 0 {
		// User exists, return it
		var user models.User
		docs[0].DataTo(&user)
		return &user, nil
	}

	// Create new user
	user := &models.User{
		ID:          utils.GenerateID(),
		Email:       email,
		Name:        name,       // Will be updated from Google profile if available
		Picture:     picture,    // Will be updated from Google profile if available
		Role:        "observer", // Default role
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		LastLoginAt: time.Now(),
	}

	_, err = ah.firestoreService.Users().Doc(user.ID).Set(ctx, user)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (ah *AuthHandler) getUserByID(userID string) (*models.User, error) {
	ctx := ah.firestoreService.Context()
	doc, err := ah.firestoreService.Users().Doc(userID).Get(ctx)
	if err != nil {
		return nil, err
	}

	var user models.User
	err = doc.DataTo(&user)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (ah *AuthHandler) updateUserLastLogin(userID string) {
	ctx := ah.firestoreService.Context()
	_, err := ah.firestoreService.Users().Doc(userID).Update(ctx,
		[]firestore.Update{
			{Path: "last_login_at", Value: time.Now()},
		},
	)
	if err != nil {
		// handle error
		log.Printf("Failed to update last login: %v", err)
	}
}
