package handlers

import (
	"net/http"
	"time"

	"rice-monitor-api/models"
	"rice-monitor-api/services"
	"rice-monitor-api/utils"

	"cloud.google.com/go/firestore"
	"github.com/gin-gonic/gin"
	"google.golang.org/api/oauth2/v2"
	"google.golang.org/api/option"
)

type AuthHandler struct {
	firestoreService *services.FirestoreService
}

func NewAuthHandler(firestoreService *services.FirestoreService) *AuthHandler {
	return &AuthHandler{
		firestoreService: firestoreService,
	}
}

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
	oauth2Service, err := oauth2.NewService(ctx, option.WithAPIKey(utils.GetEnvOrDefault("GOOGLE_API_KEY", "")))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to create OAuth2 service",
		})
		return
	}

	tokenInfo, err := oauth2Service.Tokeninfo().AccessToken(req.Token).Do()
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "invalid_token",
			Message: "Invalid Google token",
		})
		return
	}

	// Get or create user
	user, err := ah.getOrCreateUser(tokenInfo)
	if err != nil {
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

func (ah *AuthHandler) Logout(c *gin.Context) {
	// In a production system, you might want to blacklist the token
	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Message: "Logged out successfully",
	})
}

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
func (ah *AuthHandler) getOrCreateUser(tokenInfo *oauth2.Tokeninfo) (*models.User, error) {
	ctx := ah.firestoreService.Context()
	
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
		Email:       tokenInfo.Email,
		Name:        tokenInfo.Email, // Will be updated from Google profile if available
		Picture:     "",              // Will be updated from Google profile if available
		Role:        "observer",      // Default role
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
	ah.firestoreService.Users().Doc(userID).Update(ctx,
		firestore.Update{Path: "last_login_at", Value: time.Now()})
}